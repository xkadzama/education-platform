from pydantic import BaseModel


class AdminUserItem(BaseModel):
	"""Строка списка пользователей в админке: ФИ, роль и статус."""

	id: int
	first_name: str
	last_name: str
	role: str
	is_active: bool


class AdminUsersPage(BaseModel):
	items: list[AdminUserItem]
	total: int
	page: int
	per_page: int
	pages: int
