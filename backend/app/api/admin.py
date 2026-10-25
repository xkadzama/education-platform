from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_role
from app.models.auth import User
from app.schemas.admin import (
	AdminRoleUpdate,
	AdminUserDetail,
	AdminUserItem,
	AdminUsersPage,
)


router = APIRouter(prefix='/api/admin', tags=['admin'])

SUPERUSER_ROLE = 'superuser'


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
	role: Literal['student', 'teacher', 'admin', 'superuser'] | None = Query(None),
	is_active: bool | None = Query(None),
	sort: Literal['name', 'created_desc', 'created_asc'] = Query('created_desc'),
	page: int = Query(1, ge=1),
	per_page: int = Query(20, ge=1, le=100),
	_: User = Depends(require_role('superuser', 'admin')),
	session: AsyncSession = Depends(get_db),
):
	"""Список пользователей с поиском, фильтрами и сортировкой.

	- search — по полному ФИ, без учёта регистра;
	- role — только одна из доступных ролей;
	- is_active — true/false (активные/удалённые), None — все;
	- sort — по ФИ или по дате регистрации (created_at) в обе стороны.
	"""
	conditions = []
	name_condition = _name_filter(search)
	if name_condition is not None:
		conditions.append(name_condition)
	if role is not None:
		conditions.append(User.role == role)
	if is_active is not None:
		conditions.append(User.is_active.is_(is_active))

	count_stmt = select(func.count()).select_from(User)
	if conditions:
		count_stmt = count_stmt.where(*conditions)
	total = int(await session.scalar(count_stmt) or 0)

	pages = (total + per_page - 1) // per_page if total else 0
	if pages and page > pages:
		page = pages

	if sort == 'created_asc':
		order_by = (User.created_at.asc(), User.id.asc())
	elif sort == 'created_desc':
		order_by = (User.created_at.desc(), User.id.desc())
	else:
		order_by = (func.lower(User.last_name), func.lower(User.first_name), User.id)

	stmt = select(User)
	if conditions:
		stmt = stmt.where(*conditions)
	stmt = (
		stmt
		.order_by(*order_by)
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


def _detail(user: User) -> AdminUserDetail:
	return AdminUserDetail(
		id=user.id,
		first_name=user.first_name,
		last_name=user.last_name,
		role=user.role,
		is_active=user.is_active,
		email=user.email,
		avatar_url=user.avatar_url,
		created_at=user.created_at,
	)


async def _get_user(session: AsyncSession, user_id: int) -> User:
	user = await session.get(User, user_id)
	if user is None:
		raise HTTPException(status_code=404, detail='User not found')
	return user


def _ensure_modifiable(user: User) -> None:
	"""Суперпользователя нельзя деактивировать/понизить через админку.

	Иначе единственный superuser может случайно лишить себя доступа, и
	восстановить его можно будет только через .env + create_superuser.
	"""
	if user.role == SUPERUSER_ROLE:
		raise HTTPException(
			status_code=400,
			detail='Superuser account cannot be modified',
		)


@router.get('/users/{user_id}', response_model=AdminUserDetail)
async def get_user(
	user_id: int,
	_: User = Depends(require_role('superuser', 'admin')),
	session: AsyncSession = Depends(get_db),
):
	"""Карточка пользователя для модального окна."""
	return _detail(await _get_user(session, user_id))


@router.patch('/users/{user_id}/role', response_model=AdminUserDetail)
async def update_user_role(
	user_id: int,
	payload: AdminRoleUpdate,
	current_user: User = Depends(require_role('superuser', 'admin')),
	session: AsyncSession = Depends(get_db),
):
	"""Меняет роль на student/teacher/admin.

	`superuser` через этот endpoint не выдаётся, существующий superuser
	не может быть понижен, а `admin` не может назначать других `admin`
	(это право только у superuser).
	"""
	if current_user.role == 'admin' and payload.role == 'admin':
		raise HTTPException(
			status_code=403,
			detail='Admin cannot assign administrator role',
		)

	user = await _get_user(session, user_id)
	_ensure_modifiable(user)

	user.role = payload.role
	await session.commit()
	await session.refresh(user)
	return _detail(user)


@router.post('/users/{user_id}/deactivate', response_model=AdminUserDetail)
async def deactivate_user(
	user_id: int,
	_: User = Depends(require_role('superuser', 'admin')),
	session: AsyncSession = Depends(get_db),
):
	"""Мягкое удаление: is_active = False. Суперпользователя не трогаем."""
	user = await _get_user(session, user_id)
	_ensure_modifiable(user)

	if user.is_active:
		user.is_active = False
		await session.commit()
		await session.refresh(user)

	return _detail(user)

@router.post('/users/{user_id}/activate', response_model=AdminUserDetail)
async def activate_user(
	user_id: int,
	_: User = Depends(require_role('superuser', 'admin')),
	session: AsyncSession = Depends(get_db),
):
	"""Восстановление аккаунта после мягкого удаления."""
	user = await _get_user(session, user_id)
	_ensure_modifiable(user)

	if not user.is_active:
		user.is_active = True
		await session.commit()
		await session.refresh(user)

	return _detail(user)
