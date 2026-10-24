# Backend

FastAPI-приложение образовательной платформы. Инструкции по запуску, переменные
окружения и описание API — в корневом [README.md](../README.md), архитектура —
в [docs/architecture.md](../docs/architecture.md).

Кратко:

```bash
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```
