from datetime import timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.auth import User
from app.schemas.auth import (  # type: ignore
	UserRegisterRequest,
	UserResponse,
	TokenResponse,
	RefreshRequest,
)
from app.core.dependencies import get_db, get_current_user
from app.core.security import (
	get_password_hash,
	verify_password,
	create_access_token,
	create_refresh_token,
	decode_token,
	ACCESS_TOKEN_EXPIRE_MINUTES,
)


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


# --- Логин: проверяем учётные данные и выдаём JWT-пару -----------------------
@router.post('/login', response_model=TokenResponse)
async def login(
	form_data: OAuth2PasswordRequestForm = Depends(),
	session: AsyncSession = Depends(get_db),
):
	"""OAuth2 Password Flow: ждёт form-data с полями `username` (email) и `password`.
	Форма (а не JSON) — требование стандарта OAuth2, благодаря ей работает кнопка Authorize в Swagger UI.
	"""
	stmt = await session.execute(select(User).where(User.email == form_data.username))
	user = stmt.scalar_one_or_none()

	# Один и тот же ответ для неверного email и неверного пароля —
	# чтобы по ответу сервера нельзя было узнать, существует ли аккаунт.
	if user is None or not verify_password(form_data.password, user.hashed_password):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='Incorrect email or password',
			headers={'WWW-Authenticate': 'Bearer'},
		)
	if not user.is_active:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Account is disabled')

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