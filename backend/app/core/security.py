from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import (
	ACCESS_TOKEN_EXPIRE_MINUTES,
	JWT_ALGORITHM,
	JWT_SECRET_KEY,
	REFRESH_TOKEN_EXPIRE_DAYS,
)


argon2 = PasswordHash.recommended()

# Секрет и сроки жизни токенов задаются через env / backend/.env
# (см. app/core/config.py). Дефолтный секрет годится только для разработки.


def get_password_hash(password: str) -> str:
	return argon2.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
	return argon2.verify(password, hashed_password)


def create_token(user_id: int, role: str, token_type: str, expires_delta: timedelta) -> str:
	"""Создаёт подписанный JWT с минимальным набором claims."""
	now = datetime.now(timezone.utc)
	payload = {
		'sub': str(user_id),      # кто пользователь
		'type': token_type,       # 'access' или 'refresh' — токены нельзя взаимозаменять
		'role': role,             # роль для авторизации (RBAC)
		'iat': now,               # issued at
		'exp': now + expires_delta,  # срок жизни — JWT проверяет его автоматически
	}
	return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: int, role: str) -> str:
	return create_token(user_id, role, 'access', timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: int, role: str) -> str:
	return create_token(user_id, role, 'refresh', timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str, expected_type: str) -> dict:
	"""Проверяет подпись, срок жизни и тип токена. Бросает jwt.PyJWTError, если что-то не так."""
	payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
	if payload.get('type') != expected_type:
		raise jwt.InvalidTokenError(f'Expected a {expected_type} token')
	return payload