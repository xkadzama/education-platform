from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_role
from app.models.auth import User
from app.schemas.admin import AdminUserItem, AdminUsersPage


router = APIRouter(prefix='/api/admin', tags=['admin'])


def _name_filter(search: str):
	"""Поиск по «Фамилия Имя», без учёта регистра.

	Спецсимволы LIKE (%, _ и обратный слэш) экранируются, чтобы ввод
	пользователя не превращался в произвольный шаблон.
	"""
	term = search.strip().lower()
	if not term:
		return None

	escaped = (
		term
		.replace('\\', '\\\\')
		.replace('%', '\\%')
		.replace('_', '\\_')
	)
	full_name = func.lower(func.concat(User.last_name, ' ', User.first_name))
	return full_name.like(f'%{escaped}%', escape='\\')


@router.get('/users', response_model=AdminUsersPage)
async def list_users(
	search: str = Query('', max_length=100),
	page: int = Query(1, ge=1),
	per_page: int = Query(20, ge=1, le=100),
	_: User = Depends(require_role('superuser')),
	session: AsyncSession = Depends(get_db),
):
	"""Список всех пользователей для админки (только superuser).

	Поиск — по полному ФИ, регистронезависимый. Пагинация — page/per_page;
	при выходе page за пределы возвращается последняя существующая страница.
	"""
	condition = _name_filter(search)

	count_stmt = select(func.count()).select_from(User)
	if condition is not None:
		count_stmt = count_stmt.where(condition)
	total = int(await session.scalar(count_stmt) or 0)

	pages = (total + per_page - 1) // per_page if total else 0
	if pages and page > pages:
		page = pages

	stmt = select(User)
	if condition is not None:
		stmt = stmt.where(condition)
	stmt = (
		stmt
		.order_by(func.lower(User.last_name), func.lower(User.first_name), User.id)
		.offset((page - 1) * per_page)
		.limit(per_page)
	)
	users = (await session.execute(stmt)).scalars().all()

	return AdminUsersPage(
		items=[
			AdminUserItem(
				id=user.id,
				first_name=user.first_name,
				last_name=user.last_name,
				role=user.role,
				is_active=user.is_active,
			)
			for user in users
		],
		total=total,
		page=page,
		per_page=per_page,
		pages=pages,
	)
