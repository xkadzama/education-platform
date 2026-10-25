"""Живой smoke-тест API (требует запущенный backend на :8000 и PostgreSQL).

Проверяет полный путь: регистрация → логин → GET /api/lessons → детали урока
и отдача PDF-презентации → загрузка аватара (WebP ≤ 512px) → CORS preflight.
Созданный тестовый пользователь и его файл удаляются в finally.

Запуск из backend/:  poetry run python -m scripts.smoke_api
"""
import asyncio
import io
import secrets
import sys

import asyncpg
import httpx
from PIL import Image

from app.core.config import AVATARS_DIR, DATABASE_URL

BASE_URL = 'http://localhost:8000'
DB_DSN = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')


async def main() -> int:
	email = f'smoke-{secrets.token_hex(4)}@example.com'
	password = 'SmokePass1'
	user_id: int | None = None
	avatar_url: str | None = None
	ok = True

	try:
		async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
			resp = await client.post('/auth/register', json={
				'email': email,
				'password': password,
				'first_name': 'Smoke',
				'last_name': 'Test',
			})
			print('register:', resp.status_code)
			resp.raise_for_status()
			user_id = resp.json()['id']

			resp = await client.post('/auth/login', data={
				'username': email,
				'password': password,
			})
			print('login:', resp.status_code)
			resp.raise_for_status()
			token = resp.json()['access_token']
			headers = {'Authorization': f'Bearer {token}'}

			# Обычный студент не должен пройти в админку
			resp = await client.post('/auth/admin-login', data={
				'username': email,
				'password': password,
			})
			print('admin login as student:', resp.status_code)
			ok &= resp.status_code == 403

			resp = await client.get('/api/admin/users', headers=headers)
			print('admin users as student:', resp.status_code)
			ok &= resp.status_code == 403

			resp = await client.get('/api/lessons', headers=headers)
			print('lessons:', resp.status_code, 'count =', len(resp.json()))
			resp.raise_for_status()
			lessons = resp.json()
			ok &= len(lessons) >= 12

			target = next(
				(lesson for lesson in lessons if lesson.get('presentation_url')),
				lessons[0],
			)
			lesson_uuid = target['uuid']
			print('lesson uuid:', lesson_uuid, '| slug hidden:', 'slug' not in target)
			ok &= bool(lesson_uuid) and 'slug' not in target

			resp = await client.get(f'/api/lessons/{lesson_uuid}', headers=headers)
			print('lesson detail:', resp.status_code)
			resp.raise_for_status()
			presentation_url = resp.json().get('presentation_url')
			print('presentation_url:', presentation_url)
			ok &= bool(presentation_url)

			resp = await client.get(presentation_url)
			print('presentation fetch:', resp.status_code, resp.headers.get('content-type'), len(resp.content))
			ok &= resp.status_code == 200 and resp.content.startswith(b'%PDF-')

			image = Image.new('RGB', (1400, 900), (255, 90, 0))
			buffer = io.BytesIO()
			image.save(buffer, format='JPEG', quality=92)

			resp = await client.post(
				'/auth/avatar',
				headers=headers,
				files={'file': ('avatar.jpg', buffer.getvalue(), 'image/jpeg')},
			)
			print('avatar upload:', resp.status_code)
			resp.raise_for_status()
			avatar_url = resp.json()['avatar_url']
			print('avatar_url:', avatar_url)

			resp = await client.get(avatar_url)
			print('avatar fetch:', resp.status_code, resp.headers.get('content-type'))
			uploaded = Image.open(io.BytesIO(resp.content))
			print('avatar stored:', uploaded.format, uploaded.size)
			ok &= uploaded.format == 'WEBP'
			ok &= max(uploaded.size) <= 512

			resp = await client.options(
				'/api/lessons',
				headers={
					'Origin': 'http://localhost:5173',
					'Access-Control-Request-Method': 'GET',
				},
			)
			print('cors preflight:', resp.status_code, resp.headers.get('access-control-allow-origin'))
			ok &= resp.status_code in (200, 204)
	finally:
		conn = await asyncpg.connect(DB_DSN)
		try:
			await conn.execute('DELETE FROM users WHERE email = $1', email)
		finally:
			await conn.close()
		if avatar_url:
			(AVATARS_DIR / avatar_url.rsplit('/', 1)[-1]).unlink(missing_ok=True)

	print('SMOKE:', 'OK' if ok else 'FAILED')
	return 0 if ok else 1


if __name__ == '__main__':
	sys.exit(asyncio.run(main()))
