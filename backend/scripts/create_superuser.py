"""Создать/повысить суперпользователя из SUPERADMIN_* (для непустой БД).

Bootstrap при старте backend срабатывает только на пустой таблице users.
Этот скрипт — явная команда для уже существующей базы (в т.ч. локальной):

    cd backend
    poetry run python -m scripts.create_superuser

Читает SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD из backend/.env; пароль
хешируется Argon2 и в БД попадает только хеш.

Скрипт идемпотентен: повторный запуск не создаёт дубликат, а приводит
существующего пользователя с таким email к role='superuser', is_active=true
и (при отличии) перезаписывает пароль на указанный в .env.
"""
import asyncio
import logging
import sys

from app.core.bootstrap import SuperadminConfigError, upsert_superuser
from app.core.logging import configure_app_logging


async def main() -> int:
	configure_app_logging(logging.INFO)
	try:
		user = await upsert_superuser()
	except SuperadminConfigError as exc:
		print(f'ERROR: {exc}', file=sys.stderr)
		return 1

	print(f'Superuser ready: id={user.id}, email={user.email}, role={user.role}')
	return 0


if __name__ == '__main__':
	sys.exit(asyncio.run(main()))
