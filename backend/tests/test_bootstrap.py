"""Unit-тесты bootstrap первого суперпользователя (без БД и сети).

Проверяем главное правило: «если таблица users пуста — создать пользователя
с данными из конфигурации», а также безопасность конфигурации: сайт не должен
падать из-за опечатки в SUPERADMIN_*, но и молча оставаться без администратора
тоже не должен.
"""
import unittest
from contextlib import asynccontextmanager
from unittest import mock

from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core import config
from app.core.bootstrap import (
	MIN_PASSWORD_LENGTH,
	SuperadminConfigError,
	SuperadminCredentials,
	ensure_initial_superuser,
	load_credentials,
	upsert_superuser,
)
from app.core.security import verify_password
from app.models.auth import User


class FakeSession:
	"""Минимальная замена AsyncSession: отдаёт счётчик или пользователя.

	`scalar()` в bootstrap используется двояко: `select(func.count())` для
	проверки «таблица пуста» и `select(User)` для поиска существующей записи.
	Флаг `return_count` говорит фейку, что именно вернуть.
	"""

	def __init__(
		self,
		users_count: int = 0,
		existing_user: User | None = None,
		return_count: bool = True,
	):
		self.users_count = users_count
		self.existing_user = existing_user
		self.return_count = return_count
		self.added: list[User] = []
		self.commits = 0
		self.rollbacks = 0
		self.refreshed: list[User] = []

	async def scalar(self, _statement):
		if self.return_count:
			return self.users_count
		return self.existing_user

	async def execute(self, _statement):  # для счётчика записей
		return self

	def add(self, user: User) -> None:
		self.added.append(user)

	async def commit(self) -> None:
		self.commits += 1

	async def rollback(self) -> None:
		self.rollbacks += 1

	async def refresh(self, user: User) -> None:
		self.refreshed.append(user)


def session_factory(session: FakeSession):
	@asynccontextmanager
	async def factory():
		yield session

	return factory


class LoadCredentialsTests(unittest.TestCase):
	def _patch(self, email: str, password: str, first: str = 'Super', last: str = 'Admin'):
		return mock.patch.multiple(
			config,
			SUPERADMIN_EMAIL=email,
			SUPERADMIN_PASSWORD=password,
			SUPERADMIN_FIRST_NAME=first,
			SUPERADMIN_LAST_NAME=last,
		)

	def test_nothing_configured_returns_none(self):
		# Штатное состояние после удаления строк из .env — не ошибка.
		with self._patch('', ''):
			self.assertIsNone(load_credentials())

	def test_email_without_password_is_an_error(self):
		with self._patch('admin@example.com', ''):
			with self.assertRaises(SuperadminConfigError) as ctx:
				load_credentials()
		self.assertIn('SUPERADMIN_PASSWORD', str(ctx.exception))

	def test_password_without_email_is_an_error(self):
		with self._patch('', 'Secret123'):
			with self.assertRaises(SuperadminConfigError) as ctx:
				load_credentials()
		self.assertIn('SUPERADMIN_EMAIL', str(ctx.exception))

	def test_invalid_email_is_rejected(self):
		with self._patch('not-an-email', 'Secret123'):
			with self.assertRaises(SuperadminConfigError):
				load_credentials()

	def test_short_password_is_rejected(self):
		short = 'A1' * (MIN_PASSWORD_LENGTH // 2 - 1)  # короче лимита
		self.assertLess(len(short), MIN_PASSWORD_LENGTH)
		with self._patch('admin@example.com', short):
			with self.assertRaises(SuperadminConfigError):
				load_credentials()

	def test_email_is_normalized(self):
		with self._patch('  Admin@Example.COM  ', 'Secret123'):
			credentials = load_credentials()
		self.assertEqual(credentials.email, 'Admin@example.com')

	def test_names_come_from_config(self):
		with self._patch('admin@example.com', 'Secret123', 'Хусейн', 'Картоев'):
			credentials = load_credentials()
		self.assertEqual(
			credentials,
			SuperadminCredentials(
				email='admin@example.com',
				password='Secret123',
				first_name='Хусейн',
				last_name='Картоев',
			),
		)

	def test_weak_password_only_warns(self):
		# Пароль без цифры/заглавной не блокирует bootstrap (аккаунт должны
		# уметь поднять при любых обстоятельствах), но пишет предупреждение.
		with self._patch('admin@example.com', 'passwordonly'):
			with self.assertLogs('app.core.bootstrap', level='WARNING') as logs:
				credentials = load_credentials()
		self.assertIsNotNone(credentials)
		self.assertTrue(any('заглавная' in line for line in logs.output))


class EnsureInitialSuperuserTests(unittest.TestCase):
	def _patch(self, email='admin@example.com', password='Secret123'):
		return mock.patch.multiple(
			config,
			SUPERADMIN_EMAIL=email,
			SUPERADMIN_PASSWORD=password,
			SUPERADMIN_FIRST_NAME='Super',
			SUPERADMIN_LAST_NAME='Admin',
		)

	def test_creates_superuser_on_empty_table(self):
		session = FakeSession(users_count=0)
		with self._patch():
			user = asyncio_run(ensure_initial_superuser(session_factory(session)))

		self.assertIsNotNone(user)
		self.assertEqual(len(session.added), 1)
		self.assertEqual(session.commits, 1)
		self.assertEqual(user.email, 'admin@example.com')
		self.assertEqual(user.role, 'superuser')
		self.assertTrue(user.is_active)
		# Пароль хранится только хешем и проверяется Argon2-верификатором.
		self.assertNotEqual(user.hashed_password, 'Secret123')
		self.assertTrue(verify_password('Secret123', user.hashed_password))

	def test_does_nothing_when_users_exist(self):
		session = FakeSession(users_count=12)
		with self._patch():
			user = asyncio_run(ensure_initial_superuser(session_factory(session)))

		self.assertIsNone(user)
		self.assertEqual(session.added, [])
		self.assertEqual(session.commits, 0)

	def test_does_nothing_when_not_configured(self):
		session = FakeSession(users_count=0)
		with self._patch(email='', password=''):
			user = asyncio_run(ensure_initial_superuser(session_factory(session)))

		self.assertIsNone(user)
		self.assertEqual(session.added, [])

	def test_invalid_config_does_not_crash_startup(self):
		# Опечатка в .env не должна ронять весь API: логируем и стартуем без админа.
		session = FakeSession(users_count=0)
		with self._patch(email='broken-email', password='Secret123'):
			with self.assertLogs('app.core.bootstrap', level='ERROR'):
				user = asyncio_run(ensure_initial_superuser(session_factory(session)))

		self.assertIsNone(user)
		self.assertEqual(session.added, [])

	def test_missing_table_raises_with_migration_hint(self):
		# Backend стартовал до `alembic upgrade head`: таблицы users нет.
		# Ошибку не глотаем (иначе приложение работало бы «вслепую»), но
		# добавляем в лог подсказку, что именно сделать.
		class BrokenSession(FakeSession):
			async def scalar(self, _statement):
				raise SQLAlchemyError('relation "users" does not exist')

		session = BrokenSession()
		with self._patch():
			with self.assertLogs('app.core.bootstrap', level='ERROR') as logs:
				with self.assertRaises(SQLAlchemyError):
					asyncio_run(ensure_initial_superuser(session_factory(session)))

		self.assertTrue(any('alembic upgrade head' in line for line in logs.output))


class UpsertSuperuserTests(unittest.TestCase):
	def _patch(self, email='admin@example.com', password='Secret123'):
		return mock.patch.multiple(
			config,
			SUPERADMIN_EMAIL=email,
			SUPERADMIN_PASSWORD=password,
			SUPERADMIN_FIRST_NAME='Super',
			SUPERADMIN_LAST_NAME='Admin',
		)

	def test_creates_when_missing(self):
		session = FakeSession(existing_user=None, return_count=False)
		with self._patch():
			user = asyncio_run(upsert_superuser(session_factory(session)))
		self.assertEqual(user.role, 'superuser')
		self.assertEqual(len(session.added), 1)

	def test_promotes_existing_student_and_resets_password(self):
		student = User(
			email='admin@example.com',
			hashed_password='not-a-valid-hash',
			first_name='Old',
			last_name='Name',
			role='student',
			is_active=False,
		)
		session = FakeSession(existing_user=student, return_count=False)
		with self._patch():
			user = asyncio_run(upsert_superuser(session_factory(session)))

		self.assertIs(user, student)
		self.assertEqual(user.role, 'superuser')
		self.assertTrue(user.is_active)
		self.assertEqual(user.first_name, 'Super')
		self.assertTrue(verify_password('Secret123', user.hashed_password))
		self.assertEqual(session.added, [])  # строку не дублируем

	def test_keeps_hash_when_password_matches(self):
		from app.core.security import get_password_hash

		existing_hash = get_password_hash('Secret123')
		existing = User(
			email='admin@example.com',
			hashed_password=existing_hash,
			first_name='Super',
			last_name='Admin',
			role='student',
			is_active=True,
		)
		session = FakeSession(existing_user=existing, return_count=False)
		with self._patch():
			user = asyncio_run(upsert_superuser(session_factory(session)))

		self.assertEqual(user.hashed_password, existing_hash)
		self.assertEqual(user.role, 'superuser')
		self.assertEqual(session.commits, 1)

	def test_requires_configuration(self):
		with self._patch(email='', password=''):
			with self.assertRaises(SuperadminConfigError):
				asyncio_run(upsert_superuser(session_factory(FakeSession())))


def asyncio_run(coroutine):
	import asyncio

	return asyncio.run(coroutine)


if __name__ == '__main__':
	unittest.main()
