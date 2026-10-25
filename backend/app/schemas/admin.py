from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AdminUserItem(BaseModel):
	"""Строка списка пользователей в админке: ФИ, роль и статус."""

	id: int
	first_name: str
	last_name: str
	role: str
	is_active: bool


class AdminUserDetail(AdminUserItem):
	"""Полная карточка пользователя для модального окна."""

	email: str
	avatar_url: str | None = None
	created_at: datetime


class AdminUsersPage(BaseModel):
	items: list[AdminUserItem]
	total: int
	page: int
	per_page: int
	pages: int


class AdminRoleUpdate(BaseModel):
	"""Допустимые роли для смены через админку (superuser не выдаётся)."""

	role: Literal['student', 'teacher', 'admin']
