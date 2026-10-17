from fastapi import APIRouter


router = APIRouter()


@router.get('/auth')
async def auth():
	return {'auth': 200}