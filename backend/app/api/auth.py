from datetime import timedelta
import secrets

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.models.auth import User
from app.schemas.auth import (  # type: ignore
	UserRegisterRequest,
	UserResponse,
	TokenResponse,
	RefreshRequest,
)
from app.core.config import AVATARS_DIR, MAX_AVATAR_SIZE
from app.core.dependencies import get_db, get_current_user
from app.core.security import (
	get_password_hash,
	verify_password,
	create_access_token,
	create_refresh_token,
	decode_token,
	ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.services.avatar import AvatarProcessingError, process_avatar


router = APIRouter(
	prefix='/auth',

)


def _token_pair(user: User) -> TokenResponse:
	"""Собирает пару access + refresh токенов для пользователя."""
	return TokenResponse(
		access_token=create_access_token(user.id, user.role),
		refresh_token=create_refresh_token(user.id, user.role),
		expires_in=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds().__int__(),
	)


@router.post('/register', response_model=UserResponse)
async def register(user: UserRegisterRequest, session: AsyncSession = Depends(get_db)):
	stmt = await session.execute(select(User).where(User.email == user.email))
	existing_user = stmt.scalar()
	if existing_user is not None:
		raise HTTPException(status_code=400, detail='User already existing')

	user_data: dict = user.model_dump()
	user_data['hashed_password'] = get_password_hash(user_data.pop('password'))

	new_user = User(**user_data)
	session.add(new_user)
	await session.commit()
	await session.refresh(new_user)

	return new_user


# --- Проверка учётных данных (общая для /login и /admin-login) ---------------
async def _authenticate(email: str, password: str, session: AsyncSession) -> User:
	stmt = await session.execute(
		select(User).where(func.lower(User.email) == email.strip().lower())
	)
	user = stmt.scalar_one_or_none()

	# Один и тот же ответ для неверного email и неверного пароля —
	# чтобы по ответу сервера нельзя было узнать, существует ли аккаунт.
	if user is None or not verify_password(password, user.hashed_password):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='Incorrect email or password',
			headers={'WWW-Authenticate': 'Bearer'},
		)
	if not user.is_active:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Account is disabled')
	return user


# --- Логин: проверяем учётные данные и выдаём JWT-пару -----------------------
@router.post('/login', response_model=TokenResponse)
async def login(
	form_data: OAuth2PasswordRequestForm = Depends(),
	session: AsyncSession = Depends(get_db),
):
	"""OAuth2 Password Flow: ждёт form-data с полями `username` (email) и `password`.

	Форма (а не JSON) — требование стандарта OAuth2, благодаря ей работает
	кнопка Authorize в Swagger UI.
	"""
	user = await _authenticate(form_data.username, form_data.password, session)

	# Администраторы и суперпользователь входят ТОЛЬКО через /admin.
	# Иначе один и тот же аккаунт мог бы получить студенческую сессию.
	if user.role in {'superuser', 'admin'}:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail='Admin accounts must sign in through the admin panel',
		)

	return _token_pair(user)


# --- Вход в админку: только для role='superuser'/'admin' ----------------------
@router.post('/admin-login', response_model=TokenResponse)
async def admin_login(
	form_data: OAuth2PasswordRequestForm = Depends(),
	session: AsyncSession = Depends(get_db),
):
	"""Вход в админку: superuser и admin; студент получает 403."""
	user = await _authenticate(form_data.username, form_data.password, session)
	if user.role not in {'superuser', 'admin'}:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail='Admin access required',
		)
	return _token_pair(user)


# --- Refresh: по refresh-токену выдаём новую пару -----------------------------
@router.post('/refresh', response_model=TokenResponse)
async def refresh(body: RefreshRequest, session: AsyncSession = Depends(get_db)):
	try:
		payload = decode_token(body.refresh_token, expected_type='refresh')
	except jwt.PyJWTError:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired refresh token')

	stmt = await session.execute(select(User).where(User.id == int(payload['sub'])))
	user = stmt.scalar_one_or_none()
	if user is None or not user.is_active:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found or inactive')

	return _token_pair(user)


# --- Текущий пользователь: пример защищённого эндпоинта ----------------------
@router.get('/me', response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
	"""Доступ к этому эндпоинту только с заголовком `Authorization: Bearer <access_token>`."""
	return current_user


# --- Загрузка фото профиля ----------------------------------------------------
ALLOWED_AVATAR_TYPES = {'image/jpeg', 'image/png', 'image/webp'}

@router.post('/avatar', response_model=UserResponse)
async def upload_avatar(
	file: UploadFile = File(...),
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
):
	"""Загружает и обрабатывает фото профиля (multipart/form-data, поле `file`).

	Принимает JPEG/PNG/WebP до 5 МБ, декодирует изображение, поворачивает по
	EXIF, уменьшает до 512×512 (без апскейла) и сохраняет сжатый WebP в
	uploads/avatars. Возвращает обновлённый профиль.
	"""
	content_type = (file.content_type or '').lower()
	if content_type not in ALLOWED_AVATAR_TYPES:
		raise HTTPException(status_code=400, detail='Allowed formats: JPEG, PNG, WebP')

	data = await file.read()
	if len(data) > MAX_AVATAR_SIZE:
		raise HTTPException(status_code=413, detail='File too large (max 5 MB)')
	if not data:
		raise HTTPException(status_code=400, detail='Empty file')

	# Проверяем и перекодируем реальным декодером: content_type из браузера
	# подделать просто, а хранить многомегабайтные оригиналы не нужно.
	try:
		processed = process_avatar(data)
	except AvatarProcessingError:
		raise HTTPException(
			status_code=400,
			detail='File is not a valid JPEG, PNG or WebP image',
		)

	# Имя файла генерируем сами: id пользователя + случайный hex (никакого пути
	# из запроса — защита от path traversal).
	filename = f'{current_user.id}_{secrets.token_hex(6)}.webp'
	AVATARS_DIR.mkdir(parents=True, exist_ok=True)
	(AVATARS_DIR / filename).write_bytes(processed)

	# Удаляем старое фото, если оно было загружено через этот же механизм
	old_url = current_user.avatar_url or ''
	if old_url.startswith('/uploads/avatars/'):
		old_path = AVATARS_DIR / old_url.rsplit('/', 1)[-1]
		if old_path.is_file():
			old_path.unlink(missing_ok=True)

	current_user.avatar_url = f'/uploads/avatars/{filename}'
	await session.commit()
	await session.refresh(current_user)
	return current_user