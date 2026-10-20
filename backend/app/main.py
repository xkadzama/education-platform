from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import auth
from app.core.database import async_engine


app = FastAPI()

app.include_router(auth.router)

# Отдаём загруженные фото профиля: /uploads/avatars/<file>
UPLOADS_DIR = Path('uploads')
(UPLOADS_DIR / 'avatars').mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=UPLOADS_DIR), name='uploads')


@app.on_event('startup')
async def _ensure_avatar_column():
	"""Простая миграция: добавляет users.avatar_url, если колонки ещё нет
	(для существующих БД, созданных до появления этой фичи)."""
	async with async_engine.begin() as conn:
		def _migrate(sync_conn):
			dialect = sync_conn.dialect.name
			if dialect == 'sqlite':
				cols = [r[1] for r in sync_conn.exec_driver_sql('PRAGMA table_info(users)')]
				if cols and 'avatar_url' not in cols:
					sync_conn.execute(text('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)'))
			elif dialect == 'postgresql':
				sync_conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)'))
		await conn.run_sync(_migrate)


@app.get('/')
async def main():
	return {'detail': 'main_page'}