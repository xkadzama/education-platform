# Архитектура Xkadzama Education Platform

Актуально на 2026-10-24. Документ описывает текущее состояние; история
изменений — в [changes-log.md](changes-log.md).

## 1. Общая схема

```
React (Vite :5173)
  │  axios, Bearer access-токен
  ▼
FastAPI (:8000)
  ├─ /auth/*      авторизация, профиль, аватар
  ├─ /api/lessons каталог уроков + персональный прогресс
  └─ /uploads/*    статика: аватары и PDF-презентации
  │  SQLAlchemy async + asyncpg
  ▼
PostgreSQL (edudb)
  ├─ users
  ├─ lessons
  └─ lesson_progress
```

В dev фронтенд ходит через Vite-прокси (`/auth`, `/api`, `/uploads` → `:8000`).
Для отдельного origin в API включён CORS (`CORS_ORIGINS`).

## 2. Backend

Слои:

| Слой | Файлы | Ответственность |
|---|---|---|
| HTTP | `app/api/auth.py`, `app/api/lessons.py` | роуты, статусы, зависимости |
| Схемы | `app/schemas/*.py` | валидация запросов, формат ответов |
| Сервисы | `app/services/avatar.py` | обработка изображений |
| Модели | `app/models/*.py` | SQLAlchemy-таблицы |
| Ядро | `app/core/*` | конфиг, БД, JWT/Argon2, зависимости |
| Миграции | `alembic/versions/*` | схема и сидирование уроков |

`app/main.py` создаёт приложение, подключает CORS, роутеры и статику; каталоги
`uploads/avatars/` и `uploads/presentations/` создаются до монтирования, путь
`UPLOADS_DIR` не зависит от cwd.

### Конфигурация

`app/core/config.py` читает `backend/.env` (python-dotenv) и переменные
окружения. В production (`APP_ENV=production`) приложение не стартует с
дефолтным dev-секретом JWT. `DATABASE_URL` — единый источник и для приложения,
и для Alembic (`alembic/env.py`).

### Авторизация

1. `POST /auth/register` — Pydantic-валидация (пароль 8+, заглавная, цифра),
   Argon2-хеш, запись в `users`.
2. `POST /auth/login` — OAuth2 Password Flow (form-data), проверка Argon2,
   выдача access (15 мин) и refresh (7 дней).
3. Токены содержат `sub`, `type`, `role`, `iat`, `exp`; `decode_token`
   проверяет подпись, срок и тип, поэтому access и refresh не взаимозаменяемы.
4. `get_current_user` загружает пользователя из БД и проверяет `is_active`.
5. `POST /auth/refresh` принимает refresh-токен в JSON и выдаёт новую пару.

Токены stateless: отзыва и ротации refresh пока нет. На фронтенде они лежат в
`localStorage`; для production предпочтительнее refresh в httpOnly-cookie.

### Аватар

`POST /auth/avatar` (multipart, поле `file`):

1. проверка `content_type` и размера (≤ 5 МБ);
2. `process_avatar` декодирует изображение, проверяет формат (JPEG/PNG/WebP) и
   лимит пикселей, поворачивает по EXIF, уменьшает до 512px и кодирует WebP;
3. файл `{user_id}_{hex}.webp` пишется в `AVATARS_DIR`, старый удаляется;
4. `avatar_url` обновляется в БД, ответ — полный `UserResponse`.

### Уроки и прогресс

`lessons` — общий каталог (slug, title, topic, duration_minutes, sort_order,
is_published, presentation_url). `lesson_progress` — факт прохождения
пользователем, уникальная пара `(user_id, lesson_id)`, каскадное удаление.

`GET /api/lessons` (Bearer) делает `LEFT JOIN` прогресса текущего пользователя и
возвращает `completed: bool`. Неопубликованные уроки не отдаются; порядок —
`sort_order, id`. `GET /api/lessons/{slug}` отдаёт один урок для страницы
презентации; неизвестный slug — 404.

### Презентации

`lessons.presentation_url` — путь к PDF в `UPLOADS_DIR/presentations` (по
умолчанию `backend/uploads/presentations`), который отдаётся статикой по
`/uploads/presentations/...`. Каталог `uploads/` — runtime-хранилище и исключён
из git. PPTX не рендерится браузером, поэтому исходник конвертируется в PDF
(LibreOffice) до привязки к уроку. Сейчас для `py-01` привязан
`m1Lesson1.pdf`; загрузка/конвертация из админки — следующий этап.

## 3. Frontend

```
main.jsx
 └─ AuthProvider
     └─ BrowserRouter
         └─ AppContent (ждёт проверку токена)
             ├─ /login, /register
             └─ /  ProtectedRoute → AppLayout
                       ├─ AppHeader (аватар-меню)
                       ├─ Sidebar (open | mini | hidden)
                       └─ Outlet → Dashboard | Profile | Lessons
```

- `AppLayout` монтируется один раз: при переходах сайдбар не пересоздаётся.
- Начальное состояние: desktop — `open`, mobile — `hidden`; при переходе
  mobile → desktop `hidden` превращается в `mini`, при desktop → mobile
  открытая панель прячется в overlay, чтобы ширина панели и `--sb-live` не
  расходились. Escape закрывает панель только на мобильных.
- `api/client.js`: request-интерцептор добавляет Bearer, response-интерцептор
  при 401 делает один общий refresh и повторяет запрос; при неудаче чистит
  токены и шлёт `auth:logout`.
- `ProtectedRoute` без пользователя редиректит на `/login`.
- `Profile` сам запрашивает `/auth/me`, нормализует поля и после загрузки
  аватара обновляет и контекст, и локальный снимок.
- `Lessons` запрашивает `/api/lessons`, показывает loading/error/retry, группы
  «Пройдено/Предстоит» строит по `completed`; каждая строка — ссылка на
  `/lessons/:slug`.
- `LessonPresentation` (`/lessons/:slug`) компактное окно: PDF.js рендерит
  текущую страницу на canvas, кнопки «Назад/Вперёд» и стрелки клавиатуры
  листают слайды, счётчик показывает `N / всего`, кнопка «На весь экран»
  включает нативный Fullscreen API. Страница грузится ленивым чанком, чтобы
  PDF.js не попадал в основной бандл.

## 4. Стили

`styles/tokens.css` — значения дизайн-системы (чёрный/белый/оранжевый, Inter +
Manrope, шаг 8px). `styles/components.css` — кнопки, карточки, формы, шапка,
сайдбар, список уроков. Сайдбар — адаптация Preline-паттерна «content push to
mini sidebar»: ширины 256px/52px, мобильный overlay, анимация через
`@property --sb-width`.

## 5. Ограничения текущего этапа

- нет админки: уроки и презентации пока добавляются SQL/миграцией/вручную;
- нет эндпоинта отметки прохождения — `lesson_progress` наполняется вручную;
- загрузка PPTX и конвертация в PDF автоматизированы только вручную;
- PDF-файлы лежат в `backend/uploads/presentations/` (gitignored) и пока
  не воспроизводятся на чистом клоне без ручной загрузки;
- нет отзыва refresh-токенов, rate limiting и подтверждения email;
- нет постоянных e2e-тестов браузера; есть unit-тесты, живой smoke-скрипт и
  ручная проверка viewer через headless Chrome.
