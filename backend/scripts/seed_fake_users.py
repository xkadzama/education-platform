"""Пакетная загрузка фейковых пользователей для проверки списка/фильтров.

Пример:
    cd backend
    poetry run python -m scripts.seed_fake_users --count 10000

Все аккаунты получают один случайный Argon2-хеш (сам пароль нигде не
сохраняется), поэтому войти под ними нельзя. Email — fake00001@example.com
и далее; скрипт идемпотентен за счёт ON CONFLICT (email) DO NOTHING.
"""
import argparse
import asyncio
import random
import secrets
from datetime import datetime, timedelta, timezone

import asyncpg

from app.core.config import DATABASE_URL
from app.core.security import get_password_hash


FIRST_NAMES = [
	'Александр', 'Алексей', 'Андрей', 'Артём', 'Владимир', 'Дмитрий', 'Егор',
	'Иван', 'Илья', 'Кирилл', 'Максим', 'Михаил', 'Никита', 'Николай', 'Павел',
	'Роман', 'Сергей', 'Тимофей', 'Фёдор', 'Юрий', 'Анна', 'Алина', 'Виктория',
	'Дарья', 'Екатерина', 'Елена', 'Елизавета', 'Ирина', 'Ксения', 'Мария',
	'Наталья', 'Ольга', 'Полина', 'Светлана', 'София', 'Татьяна', 'Юлия',
]

LAST_NAMES = [
	'Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов',
	'Михайлов', 'Новиков', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев',
	'Лебедев', 'Семёнов', 'Егоров', 'Павлов', 'Козлов', 'Степанов',
	'Николаев', 'Орлов', 'Андреев', 'Макаров', 'Никитин', 'Захаров', 'Зайцев',
	'Соловьёв', 'Борисов', 'Яковлев', 'Григорьев', 'Романов', 'Воробьёв',
	'Сергеев', 'Кузьмин', 'Фролов', 'Александрова', 'Смирнова', 'Кузнецова',
	'Попова', 'Васильева', 'Петрова', 'Соколова', 'Михайлова', 'Новикова',
	'Фёдорова', 'Морозова', 'Волкова', 'Алексеева', 'Лебедева', 'Семёнова',
]

ROLES = ('student', 'teacher', 'admin')
ROLE_WEIGHTS = (90, 9, 1)


def _build_records(count: int, prefix: str, password_hash: str) -> list[tuple]:
	now = datetime.now(timezone.utc).replace(tzinfo=None)
	records = []

	for index in range(1, count + 1):
		email = f'{prefix}{index:05d}@example.com'
		first_name = random.choice(FIRST_NAMES)
		last_name = random.choice(LAST_NAMES)
		role = random.choices(ROLES, weights=ROLE_WEIGHTS, k=1)[0]
		is_active = random.random() > 0.10
		created_at = now - timedelta(
			days=random.randint(0, 730),
			minutes=random.randint(1, 1440),
		)
		records.append((
			email,
			password_hash,
			first_name,
			last_name,
			role,
			is_active,
			created_at,
		))

	return records


async def main() -> int:
	parser = argparse.ArgumentParser()
	parser.add_argument('--count', type=int, default=10_000)
	parser.add_argument('--prefix', default='fake')
	args = parser.parse_args()

	if args.count <= 0:
		print('count должен быть больше нуля')
		return 1

	dsn = DATABASE_URL.replace('+asyncpg', '')
	password_hash = get_password_hash(secrets.token_urlsafe(48))
	records = _build_records(args.count, args.prefix, password_hash)

	conn = await asyncpg.connect(dsn)
	try:
		async with conn.transaction():
			await conn.executemany(
				'''
				INSERT INTO users
					(email, hashed_password, first_name, last_name, role, is_active, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (email) DO NOTHING
				''',
				records,
			)

		fake_count = await conn.fetchval(
			'SELECT count(*) FROM users WHERE email LIKE $1',
			f'{args.prefix}%',
		)
		total = await conn.fetchval('SELECT count(*) FROM users')
		distribution = await conn.fetch(
			'''
			SELECT role, is_active, count(*) AS amount
			FROM users
			WHERE email LIKE $1
			GROUP BY role, is_active
			ORDER BY role, is_active DESC
			''',
			f'{args.prefix}%',
		)
	finally:
		await conn.close()

	print(f'Фейковых пользователей с префиксом {args.prefix!r}: {fake_count}')
	print(f'Всего пользователей в БД: {total}')
	for row in distribution:
		print(f"  {row['role']:<9} is_active={str(row['is_active']):<5} {row['amount']}")
	return 0


if __name__ == '__main__':
	raise SystemExit(asyncio.run(main()))
