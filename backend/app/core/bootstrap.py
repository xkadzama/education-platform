"""Bootstrap первого суперпользователя из окружения.

Правило: при старте backend, ЕСЛИ таблица users ПУСТА и в окружении /
`backend/.env` заданы SUPERADMIN_EMAIL и SUPERADMIN_PASSWORD, создаётся первый
пользователь с role='superuser'. Пароль хешируется Argon2 (как и у обычной
регистрации) — в БД попадает только хеш.

Если в users уже есть записи, bootstrap ничего не делает: роли не меняются,
пароли не перезаписываются. Поэтому строки SUPERADMIN_* можно удалить из
`backend/.env` сразу после первого успешного запуска — приложение продолжит
стартовать штатно (в логе будет одна строка «переменные не заданы, пропуск»).

Для уже заполненной БД (например, локальной, где суперпользователя нет) есть
явная команда scripts/create_superuser.py — она создаёт/повышает пользователя
принудительно, не дожидаясь пустой таблицы.
"""
import logging
from collections.abc import Callable
from contextlib import AbstractAsyncContextManager
from dataclasses import dataclass

from pydantic import EmailStr, TypeAdapter, ValidationError
from pwdlib.exceptions import PwdlibError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import config
from app.core.database import async_session_maker
from app.core.security import get_password_hash, verify_password
from app.models.auth import User


logger = logging.getLogger(__name__)

SUPERUSER_ROLE = 'superuser'

# Нижняя граница та же, что в UserRegisterRequest (schemas/auth.py): главный
# аккаунт сайта не должен быть слабее студенческого.
MIN_PASSWORD_LENGTH = 8

SessionFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]


class SuperadminConfigError(RuntimeError):
	"""SUPERADMIN_* заданы, но непригодны (некорректный email, короткий пароль)."""


@dataclass(frozen=True)
class SuperadminCredentials:
	email: str
	password: str
	first_name: str
	last_name: str


def _validate_email(raw: str) -> str:
	"""Возвращает нормализованный email или бросает SuperadminConfigError."""
	try:
		return str(TypeAdapter(EmailStr).validate_python(raw))
	except ValidationError:
		raise SuperadminConfigError(
			f'SUPERADMIN_EMAIL={raw!r} не является корректным email-адресом.'
		)


def load_credentials() -> SuperadminCredentials | None:
	"""Читает и проверяет SUPERADMIN_* из текущей конфигурации.

	Возвращает None, только если не заданы ОБЕ переменные — это нормальное
	состояние после того, как суперпользователь создан и строки удалены из
	`.env`. Если задана лишь одна из двух или значения некорректны — бросает
	SuperadminConfigError, чтобы вызывающий код показал понятную ошибку, а не
	молча оставил сайт без администратора.
	"""
	email = config.SUPERADMIN_EMAIL.strip()
	password = config.SUPERADMIN_PASSWORD

	if not email and not password:
		return None
	if not email or not password:
		missing = 'SUPERADMIN_PASSWORD' if email else 'SUPERADMIN_EMAIL'
		raise SuperadminConfigError(
			f'Задайте оба значения: SUPERADMIN_EMAIL и SUPERADMIN_PASSWORD '
			f'(сейчас отсутствует {missing}).'
		)

	normalized_email = _validate_email(email)

	if len(password) < MIN_PASSWORD_LENGTH:
		raise SuperadminConfigError(
			f'SUPERADMIN_PASSWORD короче {MIN_PASSWORD_LENGTH} символов — '
			'задайте более надёжный пароль.'
		)

	# Политика сложности — как у регистрации студентов, но не блокирующая:
	# bootstrap не должен падать из-за «простого» пароля, однако предупредить
	# обязан, потому что это аккаунт с максимальными правами.
	if not any(char.isdigit() for char in password) or not any(
		char.isupper() for char in password
	):
		logger.warning(
			'SUPERADMIN_PASSWORD не соответствует рекомендациям (нужна хотя бы '
			'одна заглавная буква и одна цифра) — пароль всё равно принят.'
		)

	return SuperadminCredentials(
		email=normalized_email,
		password=password,
		first_name=config.SUPERADMIN_FIRST_NAME,
		last_name=config.SUPERADMIN_LAST_NAME,
	)


def _password_matches(password: str, hashed_password: str) -> bool:
	"""Проверка пароля, устойчивая к повреждённому/чужому хешу в БД.

	`pwdlib` бросает UnknownHashError на нераспознанном хеше; для CLI это
	означает «пароль не совпадает» и хеш нужно пересчитать, а не падать.
	"""
	try:
		return verify_password(password, hashed_password)
	except (PwdlibError, ValueError):
		return False


def _new_superuser(credentials: SuperadminCredentials) -> User:
	return User(
		email=credentials.email,
		hashed_password=get_password_hash(credentials.password),
		first_name=credentials.first_name,
		last_name=credentials.last_name,
		role=SUPERUSER_ROLE,
		is_active=True,
	)


async def _count_users(session: AsyncSession) -> int:
	return await session.scalar(select(func.count()).select_from(User)) or 0


async def ensure_initial_superuser(
	session_factory: SessionFactory = async_session_maker,
) -> User | None:
	"""Создаёт суперпользователя ТОЛЬКО на пустой таблице users.

	Вызывается из lifespan FastAPI при каждом старте. Возвращает созданного
	пользователя либо None, если создавать нечего/не из чего. Никогда не
	бросает исключений из-за конфигурации: сайт должен подниматься и без
	администратора (иначе единственная опечатка в .env роняла бы весь API).

	`session_factory` — параметр для тестов; в приложении используется общая
	фабрика сессий SQLAlchemy.
	"""
	try:
		credentials = load_credentials()
	except SuperadminConfigError as exc:
		logger.error('Начальный суперпользователь не создан: %s', exc)
		return None

	if credentials is None:
		logger.info(
			'SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD не заданы — bootstrap '
			'суперпользователя пропущен.'
		)
		return None

	async with session_factory() as session:
		try:
			users_count = await _count_users(session)
		except SQLAlchemyError as exc:
			# Типичный случай на чистом клоне: backend стартует раньше, чем
			# применены миграции, — таблицы users ещё нет. Без подсказки
			# пользователь видит только «relation "users" does not exist».
			logger.error(
				'Не удалось прочитать таблицу users — похоже, миграции не '
				'применены. Выполните `alembic upgrade head` в каталоге backend. '
				'Исходная ошибка: %s', exc,
			)
			raise
		if users_count:
			logger.info(
				'Таблица users не пуста (%s записей) — начальный суперпользователь '
				'не создаётся. Строки SUPERADMIN_* из .env можно удалить.',
				users_count,
			)
			return None

		user = _new_superuser(credentials)
		session.add(user)
		try:
			await session.commit()
		except IntegrityError:
			# Гонка двух воркеров на пустой БД: email уже вставил другой процесс.
			await session.rollback()
			logger.warning(
				'Начальный суперпользователь уже создан параллельным процессом '
				'(email=%s).', credentials.email,
			)
			return None

		await session.refresh(user)
		logger.info(
			'Создан начальный суперпользователь: %s (role=%s). Строки '
			'SUPERADMIN_* можно удалить из .env.',
			user.email, user.role,
		)
		return user


async def upsert_superuser(
	session_factory: SessionFactory = async_session_maker,
) -> User:
	"""Создаёт или повышает суперпользователя (явная команда для непустой БД).

	В отличие от bootstrap не ждёт пустой таблицы: если пользователь с таким
	email есть — он повышается до role='superuser' и активируется, пароль
	перезаписывается только если отличается от заданного в .env.
	"""
	credentials = load_credentials()
	if credentials is None:
		raise SuperadminConfigError(
			'Задайте SUPERADMIN_EMAIL и SUPERADMIN_PASSWORD в backend/.env'
		)

	async with session_factory() as session:
		user = await session.scalar(
			select(User).where(func.lower(User.email) == credentials.email.lower())
		)

		if user is None:
			user = _new_superuser(credentials)
			session.add(user)
		else:
			user.email = credentials.email
			user.first_name = credentials.first_name
			user.last_name = credentials.last_name
			user.role = SUPERUSER_ROLE
			user.is_active = True
			if not _password_matches(credentials.password, user.hashed_password):
				user.hashed_password = get_password_hash(credentials.password)

		await session.commit()
		await session.refresh(user)
		logger.info('Суперпользователь готов: %s (role=%s)', user.email, user.role)
		return user
