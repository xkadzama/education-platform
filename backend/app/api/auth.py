from fastapi import APIRouter

from app.schemas.auth import UserRegisterRequest  # type: ignore


router = APIRouter(
	prefix='/auth',

)


@router.post('/register')
async def register(user: UserRegisterRequest):
	return user