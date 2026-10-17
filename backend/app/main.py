from fastapi import FastAPI

from backend.app.api import auth


app = FastAPI()

app.include_router(auth.router)


@app.get('/')
async def main():
	return {'detail': 'main_page'}