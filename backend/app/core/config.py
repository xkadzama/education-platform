"""Centralized runtime configuration.

Values come from environment variables / backend/.env. Sensible defaults keep
local development working without any setup, but production must override the
JWT secret and database URL (see backend/.env.example).
"""
import os
from pathlib import Path

from dotenv import load_dotenv


# backend/ — относительно этого файла, не зависит от текущего каталога запуска
BASE_DIR = Path(__file__).resolve().parents[2]

# .env рядом с pyproject.toml (backend/.env); отсутствие файла — не ошибка
load_dotenv(BASE_DIR / '.env')


def _env_bool(name: str, default: bool = False) -> bool:
	return os.getenv(name, str(default)).strip().lower() in {'1', 'true', 'yes', 'on'}


def _env_int(name: str, default: int) -> int:
	try:
		return int(os.getenv(name, str(default)))
	except ValueError:
		return default


APP_ENV = os.getenv('APP_ENV', 'development').strip().lower()

DATABASE_URL = os.getenv(
	'DATABASE_URL',
	'postgresql+asyncpg://education:12345@localhost:5432/edudb',
)
SQL_ECHO = _env_bool('SQL_ECHO', False)

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-insecure-secret-change-me-0123456789abcdef')
if APP_ENV == 'production' and JWT_SECRET_KEY.startswith('dev-insecure-'):
	raise RuntimeError('JWT_SECRET_KEY must be set in production (see backend/.env.example)')

JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = _env_int('ACCESS_TOKEN_EXPIRE_MINUTES', 15)
REFRESH_TOKEN_EXPIRE_DAYS = _env_int('REFRESH_TOKEN_EXPIRE_DAYS', 7)

# CORS нужен, если фронтенд обращается к API напрямую (не через Vite-прокси)
CORS_ORIGINS = [
	origin.strip()
	for origin in os.getenv(
		'CORS_ORIGINS',
		'http://localhost:5173,http://127.0.0.1:5173',
	).split(',')
	if origin.strip()
]

UPLOADS_DIR = Path(os.getenv('UPLOADS_DIR') or (BASE_DIR / 'uploads')).resolve()
AVATARS_DIR = UPLOADS_DIR / 'avatars'
MAX_AVATAR_SIZE = _env_int('MAX_AVATAR_SIZE', 5 * 1024 * 1024)  # 5 МБ
AVATAR_MAX_DIMENSION = _env_int('AVATAR_MAX_DIMENSION', 512)
AVATAR_MAX_PIXELS = _env_int('AVATAR_MAX_PIXELS', 20_000_000)
