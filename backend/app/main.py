from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, lessons
from app.core.config import CORS_ORIGINS, UPLOADS_DIR


# Загруженные фото профиля: /uploads/avatars/<file>.
# Презентации: /uploads/presentations/<file>.pdf.
# Путь абсолютный (backend/uploads), не зависит от cwd запуска.
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / 'avatars').mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / 'presentations').mkdir(parents=True, exist_ok=True)

app = FastAPI(title='Xkadzama Education API', version='0.1.0')

# Нужен при прямых запросах к API с другого origin (в dev обычно работает
# Vite-прокси, но CORS не мешает и делает возможным отдельный фронтенд).
app.add_middleware(
	CORSMiddleware,
	allow_origins=CORS_ORIGINS,
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(lessons.router)

app.mount('/uploads', StaticFiles(directory=UPLOADS_DIR), name='uploads')


@app.get('/')
async def main():
	return {'detail': 'main_page'}
