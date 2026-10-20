from datetime import datetime, timedelta, timezone
import os
import secrets

import jwt
from pwdlib import PasswordHash


argon2 = PasswordHash.recommended()

# Настройки JWT лучше брать из переменных окружения (.env),
# а не хранить секреты в коде.
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))  # в проде задайте через env!
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '15'))     # короткоживущий access-токен
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', '7'))          # долгоживущий refresh-токен


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