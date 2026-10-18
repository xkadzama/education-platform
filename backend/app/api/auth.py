from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.auth import User
from app.schemas.auth import UserRegisterRequest, UserResponse  # type: ignore
from app.core.dependencies import get_db
from app.core.security import get_password_hash


router = APIRouter(
	prefix='/auth',

)


@router.post('/register', response_model=UserResponse)
async def register(user: UserRegisterRequest, session: AsyncSession = Depends(get_db)):
	stmt = await session.execute(select(User).where(User.email == user.email))
	existing_user = stmt.scalar()
	if existing_user is not None:
		raise HTTPException(status_code=400, detail='User already existing')

	user_data: dict = user.model_dump()
	user_data['hashed_password'] = get_password_hash(user_data.pop('password'))

	new_user = User(**user_data)
	session.add(new_user)
	await session.commit()
	await session.refresh(new_user)

	return new_user