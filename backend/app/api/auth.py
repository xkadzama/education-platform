from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.auth import User
from app.schemas.auth import UserRegisterRequest, UserResponse  # type: ignore
from app.core.dependencies import get_db


router = APIRouter(
	prefix='/auth',

)


@router.post('/register', response_model=UserResponse)
async def register(user: UserRegisterRequest, session: AsyncSession = Depends(get_db)):
	# Проверка - существует ли данный юзер или нет
	result = await session.execute(select(User).where(User.email == user.email))
	existing_user = result.scalar()
	print(existing_user)
	return user