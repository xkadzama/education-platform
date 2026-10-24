# Xkadzama Education Platform

Учебная платформа: FastAPI + PostgreSQL на бэкенде, React + Vite на фронтенде.
Сейчас реализованы JWT-авторизация, профиль с аватаром, каркас с сайдбаром,
каталог уроков из базы данных и просмотр презентации урока с листанием слайдов.

## Стек

| Слой | Технологии |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 (async), asyncpg, Alembic |
| Auth | Argon2 (`pwdlib`), PyJWT (access 15 мин / refresh 7 дней) |
| БД | PostgreSQL (`edudb`) |
| Frontend | React 19, React Router 7, Vite 8, axios |
| Стили | CSS custom properties, дизайн-система из `docs/design-system.md` |
| Проверки | `unittest`, oxlint, GitHub Actions |

## Структура

```
backend/
  app/
    api/            auth.py, lessons.py — HTTP-роуты
    core/           config.py, database.py, dependencies.py, security.py
    models/         auth.py (User), lesson.py (Lesson, LessonProgress)
    schemas/        Pydantic-схемы запросов/ответов
    services/       avatar.py — валидация/ресайз изображений
    main.py         приложение, CORS, статика /uploads
  alembic/          миграции (users, avatar_url, lessons, lesson_progress)
  scripts/          smoke_api.py — живой smoke-тест API
  tests/            unit-тесты (unittest)
  uploads/          runtime-файлы (gitignored): avatars/, presentations/
frontend/
  src/
    api/client.js   axios + автообновление токена
    auth/           AuthContext, ProtectedRoute, tokenStorage
    components/     AppLayout, AppHeader, Sidebar, AvatarButton
    pages/          Login, Register, Dashboard, Profile, Lessons, LessonPresentation
    styles/         tokens.css, components.css
docs/
  architecture.md   архитектура и потоки данных
  changes-log.md    подробный журнал изменений
  design-system.md  палитра, типографика, компоненты
```

## Быстрый старт

### 1. PostgreSQL

База и пользователь по умолчанию (`backend/app/core/config.py`):

```
database: edudb
user:     education
password: 12345
host:     localhost:5432
```

Создать вручную:

```sql
CREATE USER education WITH PASSWORD '12345';
CREATE DATABASE edudb OWNER education;
```

Либо переопределить `DATABASE_URL` в `backend/.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env          # опционально; значения по умолчанию рабочие
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

Документация API: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложение: http://localhost:5173. Vite проксирует `/auth`, `/api` и
`/uploads` на `http://localhost:8000`, поэтому CORS в dev не требуется.

## Переменные окружения

Все настройки читаются в `backend/app/core/config.py` из `backend/.env`
(шаблон — `backend/.env.example`).

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `APP_ENV` | `development` | `production` запрещает дефолтный JWT-секрет |
| `DATABASE_URL` | `postgresql+asyncpg://education:12345@localhost:5432/edudb` | подключение к БД |
| `JWT_SECRET_KEY` | dev-секрет | **обязательно заменить в production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | срок жизни access-токена |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | срок жизни refresh-токена |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | разрешённые origins |
| `SQL_ECHO` | `false` | логирование SQL |
| `UPLOADS_DIR` | `backend/uploads` | каталог загруженных файлов (аватары, презентации) |
| `AVATAR_MAX_DIMENSION` | `512` | максимальная сторона аватара |
| `MAX_AVATAR_SIZE` | `5242880` | лимит файла (5 МБ) |

## API

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| `POST` | `/auth/register` | публичный | регистрация (JSON) |
| `POST` | `/auth/login` | публичный | OAuth2 form (`username`=email, `password`) |
| `POST` | `/auth/refresh` | refresh-токен | новая пара токенов |
| `GET` | `/auth/me` | Bearer | текущий пользователь |
| `POST` | `/auth/avatar` | Bearer | загрузка фото (multipart, поле `file`) |
| `GET` | `/api/lessons` | Bearer | опубликованные уроки + флаг `completed` |
| `GET` | `/api/lessons/{slug}` | Bearer | один урок для страницы презентации |

Аватар принимается в JPEG/PNG/WebP до 5 МБ, поворачивается по EXIF, уменьшается
до 512×512 (без апскейла) и сохраняется сжатым WebP.

## Уроки и презентации

Каталог хранится в таблице `lessons`; прогресс пользователя — в
`lesson_progress` (наличие строки = урок пройден). `GET /api/lessons` возвращает
только `is_published = true`, сортировка — по `sort_order`.

Стартовые 12 тем Python сидируются миграцией
`backend/alembic/versions/9c1f4a7b2d10_create_lessons_and_progress.py`.
Пока админки нет, урок можно добавить вручную:

```sql
INSERT INTO lessons (slug, title, topic, duration_minutes, sort_order, is_published)
VALUES ('py-13', 'Новая тема', 'Практика', 30, 13, true);
```

`lessons.presentation_url` хранит путь к PDF. Для урока `py-01` привязан
`/uploads/presentations/m1Lesson1.pdf` (сконвертирован из
`backend/uploads/presentations/m1Lesson1.pptx`).
Клик по строке урока открывает `/lessons/:slug` — компактное окно просмотра:
PDF.js рендерит текущий слайд на canvas, кнопки «Назад/Вперёд» листают
страницы, счётчик показывает `N / всего`, стрелки клавиатуры тоже работают.
Кнопка «На весь экран» переводит окно в нативный fullscreen; скачивание PDF
из интерфейса убрано.

Файлы презентаций лежат в `backend/uploads/presentations/` и отдаются статикой
по `/uploads/presentations/...`. Каталог `backend/uploads/` исключён из git:
это runtime-хранилище, которое позже будет наполнять админка.

PPTX в браузере напрямую не рендерится, поэтому его нужно заранее
сконвертировать в PDF (LibreOffice), например:

```bash
soffice --headless --convert-to pdf --outdir backend/uploads/presentations backend/uploads/presentations/m1Lesson1.pptx
```

В будущем эта конвертация и загрузка переедут в админку.

## Проверки

```bash
# backend: unit-тесты без БД
cd backend && poetry run python -m unittest discover -s tests -v

# backend: живой smoke-тест (нужны запущенные API и PostgreSQL)
cd backend && poetry run python -m scripts.smoke_api

# frontend
cd frontend && npm run lint && npm run build
```

CI (GitHub Actions) запускает эти же unit-тесты, линт и сборку.

## Документация

- [docs/architecture.md](docs/architecture.md) — архитектура, потоки авторизации и уроков.
- [docs/design-system.md](docs/design-system.md) — дизайн-система.
- [docs/changes-log.md](docs/changes-log.md) — журнал изменений.

## Дальше по плану

- админка: CRUD уроков и загрузка презентаций (PPTX/PDF с конвертацией в PDF);
- API отметки прохождения урока (`lesson_progress`);
- ротация/отзыв refresh-токенов.
