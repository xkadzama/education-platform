Структура файла
Обзор проекта — что за платформа Xkadzama Education, стек (FastAPI + Argon2 + PyJWT / Vite + React 19 + Router v7), репозиторий и ветка main, инструкция «как продолжить работу» (poetry install, uvicorn, npm run dev);
§1 JWT-авторизация (backend) — все 5 файлов с эндпоинтами (/auth/login, /auth/refresh, /auth/me, /auth/register), логикой refresh-токенов, RBAC через require_role(), схемой БД;
§2 React-фронтенд — структура папок, механизм axios-интерцепторов с флагом isRefreshing (одновременный refresh на все 401), ProtectedRoute, прокси Vite;
§3 Дизайн-система — таблица токенов (цвета, типографика, шаг 8px), правила компонентов, ссылка на docs/design-system.md;
§4–6 Функционал профиля — аватар-навигация и страница профиля, загрузка фото (Pillow-валидация, сжатие до 512×512, /uploads/), выпадающее меню с кликами вне области;
§7 Уборка UI — ID убран везде, .avatar-button стал flat (без рамки), добавлена кнопка «← На главную»;
§8 Сайдбар и уроки — AppLayout (сетка 224px|1fr), Sidebar («Уроки», активный пункт по location.pathname), lessons.js (заглушка: 3 пройденных + 5 предстоящих тем Python);
Хронология коммитов — все 8 хешей от 133ed61 до c6c11a1… 6af087e;
Известные ограничения — stateless-токены без отзыва, localStorage вместо httpOnly-cookie, заглушки уроков/аватара, отсутствие Docker/CI/ссылки на backend в git.