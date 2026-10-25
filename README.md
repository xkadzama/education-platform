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
    pages/          Login, Register, Admin, Dashboard, Profile, Lessons, LessonPresentation
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
| `SUPERADMIN_EMAIL` | — | email первого суперпользователя; **удалить после создания** |
| `SUPERADMIN_PASSWORD` | — | пароль (Argon2-хеш в БД); **удалить после создания**; минимум 8 символов |
| `SUPERADMIN_FIRST_NAME` | `Super` | имя суперпользователя |
| `SUPERADMIN_LAST_NAME` | `Admin` | фамилия суперпользователя |
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
| `POST` | `/auth/login` | публичный | вход student/teacher; admin/superuser получают 403 |
| `POST` | `/auth/admin-login` | публичный | вход в админку для `superuser`/`admin` (студенту 403) |
| `POST` | `/auth/refresh` | refresh-токен | новая пара токенов |
| `GET` | `/auth/me` | Bearer | текущий пользователь |
| `POST` | `/auth/avatar` | Bearer | загрузка фото (multipart, поле `file`) |
| `GET` | `/api/lessons` | Bearer | опубликованные уроки + флаг `completed` |
| `GET` | `/api/lessons/{uuid}` | Bearer | один урок по публичному UUID |
| `GET` | `/api/admin/users` | Bearer + `superuser`/`admin` | пользователи: поиск, фильтры ролей/статуса, сортировка по дате, пагинация |
| `GET` | `/api/admin/users/{id}` | Bearer + `superuser` | карточка пользователя для модалки |
| `PATCH` | `/api/admin/users/{id}/role` | Bearer + `superuser` | роль: `student`, `teacher`, `admin` |
| `POST` | `/api/admin/users/{id}/deactivate` | Bearer + `superuser` | мягкое удаление: `is_active=false` |
| `POST` | `/api/admin/users/{id}/activate` | Bearer + `superuser` | восстановление: `is_active=true` |

Аватар принимается в JPEG/PNG/WebP до 5 МБ, поворачивается по EXIF, уменьшается
до 512×512 (без апскейла) и сохраняется сжатым WebP.

## Суперпользователь и `/admin`

### Bootstrap первого суперпользователя

Правило: **если таблица `users` пуста, при старте backend создаётся
суперпользователь с данными из конфигурации.** Данные берутся из `backend/.env`
(или переменных окружения), пароль хешируется Argon2 и в БД попадает только
хеш.

1. Пропишите в `backend/.env`:

   ```env
   SUPERADMIN_EMAIL=admin@xkadzama.dev
   SUPERADMIN_PASSWORD=НадёжныйПароль1
   SUPERADMIN_FIRST_NAME=Super
   SUPERADMIN_LAST_NAME=Admin
   ```

2. Запустите backend (`poetry run uvicorn app.main:app --reload --port 8000`).
   В логе старта появится:

   ```
   INFO: app.core.bootstrap: Создан начальный суперпользователь: admin@xkadzama.dev (role=superuser). Строки SUPERADMIN_* можно удалить из .env.
   ```

3. Удалите `SUPERADMIN_*` из `.env` — пользователь остаётся в БД. Повторный
   старт без этих переменных проходит штатно (одна информационная строка).

Поведение в разных ситуациях:

| Ситуация | Что делает bootstrap |
|---|---|
| `users` пуста, обе переменные заданы | Создаёт `role='superuser'` с Argon2-хешем |
| `users` не пуста | Ничего не делает: роли и пароли не трогает |
| Обе переменные не заданы | Пропускает, пишет INFO в лог |
| Задана только одна из двух | Пишет ERROR с именем отсутствующей переменной, **не роняет сервер** |
| Некорректный email / пароль короче 8 символов | Пишет ERROR, сервер продолжает работать |
| Пароль без заглавной буквы или цифры | WARNING, но пользователь создаётся |
| Миграции не применены | ERROR с подсказкой `alembic upgrade head` |

Важно: bootstrap срабатывает только на **пустой** таблице. Если в базе уже есть
любые пользователи (например, локальная разработка), но суперпользователя нет —
используйте явную команду:

```bash
cd backend
poetry run python -m scripts.create_superuser
```

Она читает те же `SUPERADMIN_*`, создаёт пользователя либо повышает
существующего с таким email до `superuser` и активирует его. Пароль
перезаписывается только если отличается от указанного в `.env` (повторный
запуск не создаёт дубликатов и не пересчитывает хеш зря).

### Вход в админку

http://localhost:5173/admin — форма входа вне основного каркаса.
`POST /auth/admin-login` возвращает токены пользователям с ролью `superuser`
или `admin`; студенту с верным паролем отвечает 403 («Нет прав администратора»).

Привилегированные аккаунты **не могут войти через обычный `/login`**: backend
отвечает `403 Admin accounts must sign in through the admin panel`, форма
показывает «Этот аккаунт администратора. Войдите через админ-панель.» и ссылку
на `/admin`. Если admin/superuser уже авторизован и открывает `/login`,
фронтенд перенаправляет его в `/admin/users`.

После входа открывается админский каркас с тем же сайдбаром и бургером, что и
у студента. Пока в меню один пункт — **«Пользователи»** (`/admin/users`).
Сейчас доступны:

- список всех пользователей: ФИ, роль и статус аккаунта (зелёная/красная точка), по 10 на страницу;
- поиск по ФИ без учёта регистра (с задержкой 300 мс);
- фильтр по доступным ролям: студент, преподаватель, администратор,
  суперадминистратор (или все);
- фильтр по статусу: все / активные / удалённые (`is_active=false`);
- сортировка: «Сначала новые» / «Сначала старые» (по дате регистрации) или
  «По ФИ»; по умолчанию — сначала новые;
- пагинация «Назад/Вперёд» и счётчик «Страница X из Y · всего N»;
- клик по пользователю открывает модальную карточку: аватар, имя, фамилия,
  почта, роль, дата создания аккаунта;
- «Удалить аккаунт» → подтверждение «Вы уверены? Да/Нет» → `is_active=false`
  (пользователь не сможет войти, в списке появляется красная точка);
- у деактивированного аккаунта вместо «Удалить» — **«Восстановить аккаунт»**
  (`is_active=true`); после восстановления вход снова работает, точка в списке
  становится зелёной;
- «Сменить роль» → второе модальное окно с выбором роли и кнопкой
  «Применить»:
  - `superuser` видит «Студент / Преподаватель / Администратор»;
  - `admin` видит только «Студент / Преподаватель» — назначать других
    администраторов может только суперпользователь (backend тоже отвечает 403
    на `PATCH .../role` с `role='admin'` от admin-аккаунта);
- выход из аккаунта в шапке.

Суперпользователь (`role='superuser'`) защищён: его карточку можно открыть,
но кнопки удаления и смены роли отключены, а backend отвечает 400 на такие
запросы. Роль `admin` даёт доступ к админке и всей текущей функциональности,
кроме назначения роли `admin`.

Все `/api/admin/*` endpoint'ы защищены `require_role('superuser', 'admin')`;
студенту — 403. Остальные разделы (CRUD уроков, презентации) появятся позже.

Пароль в `.env` — временный канал доставки: после создания суперпользователя
строки удаляются, а дальше пароль меняется только через
`scripts.create_superuser` (черновой вариант до появления UI смены пароля).

## Уроки и презентации

Каталог хранится в таблице `lessons`; прогресс пользователя — в
`lesson_progress` (наличие строки = урок пройден). `GET /api/lessons` возвращает
только `is_published = true`, сортировка — по `sort_order`.

Стартовые 12 тем Python сидируются миграцией
`backend/alembic/versions/9c1f4a7b2d10_create_lessons_and_progress.py`.
CRUD уроков в админке ещё не реализован, поэтому урок можно добавить вручную:

```sql
INSERT INTO lessons (slug, title, topic, duration_minutes, sort_order, is_published)
VALUES ('py-13', 'Новая тема', 'Практика', 30, 13, true);
```

У каждого урока есть публичный `uuid` (UUID v4) — только он используется в
URL и API. Внутренний `slug` (например, `py-01`) остаётся в БД для сидов и
будущей админки и в ответе API не отдаётся, чтобы нельзя было перейти к
соседнему уроку, просто поменяв `py-01` на `py-02`.

`lessons.presentation_url` хранит путь к PDF. Для урока `py-01` привязан
`/uploads/presentations/m1Lesson1.pdf` (сконвертирован из
`backend/uploads/presentations/m1Lesson1.pptx`).
Клик по строке урока открывает `/lessons/:uuid` — компактное окно просмотра:
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
