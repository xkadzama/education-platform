from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional



# 1. Модель ЗАПРОСА (то, что присылает фронтенд)
class UserRegisterRequest(BaseModel):
	email: EmailStr = Field(..., description="Электронная почта пользователя")

	password: str = Field(
		...,
		min_length=8,
		max_length=50,
		description="Пароль должен быть не менее 8 символов"
	)

	first_name: str = Field(..., min_length=2, max_length=50, description="Имя")
	last_name: str = Field(..., min_length=2, max_length=50, description="Фамилия")

	# Роль по умолчанию "student".
	# Мы не даем возможность зарегистрироваться как "admin" через открытое API
	role: str = Field(default="student", pattern="^(student|teacher)$")

	# Дополнительная валидация пароля (опционально, но рекомендуется)
	@model_validator(mode='after')
	def check_password_strength(self) -> 'UserRegisterRequest':
		if not any(char.isdigit() for char in self.password):
			raise ValueError('Пароль должен содержать хотя бы одну цифру')
		if not any(char.isupper() for char in self.password):
			raise ValueError('Пароль должен содержать хотя бы одну заглавную букву')
		return self



# 2. Модель ОТВЕТА (то, что сервер возвращает после успешной регистрации)
class UserResponse(BaseModel):
	id: int
	email: EmailStr
	first_name: str
	last_name: str
	role: str
	is_active: bool = True

	# Необходимо для преобразования SQLAlchemy модели в Pydantic
	model_config = {"from_attributes": True}