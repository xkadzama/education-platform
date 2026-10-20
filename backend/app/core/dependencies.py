from collections.abc import AsyncGenerator
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import async_session_maker  # Импортируем из вашего database.py
from app.core.security import decode_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/auth/login')  # путь эндпоинта логина для Swagger UI


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Асинхронная зависимость для получения сессии БД."""
    async with async_session_maker() as session:
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
):
    """Достаёт пользователя из access-токена (Bearer JWT)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        payload = decode_token(token, expected_type='access')
        user_id = int(payload['sub'])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise credentials_exception

    # Ленивый импорт, чтобы избежать циклической зависимости
    from app.models.auth import User

    stmt = await session.execute(select(User).where(User.id == user_id))
    user = stmt.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*roles: str):
    """Фабрика зависимостей для RBAC: Depends(require_role('teacher', 'admin'))."""
    async def checker(user=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not enough permissions')
        return user
    return checker
