"""add avatar_url to users

Revision ID: a4d5e6f70819
Revises: 9c1f4a7b2d10
Create Date: 2026-10-24 22:10:00.000000

Колонка исторически добавлялась startup-хуком приложения (для БД, созданных
до появления фичи). Теперь она часть миграций. Проверка через inspector
делает миграцию безопасной и для уже обновлённых локальных БД, где колонка
уже была добавлена старым кодом.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'a4d5e6f70819'
down_revision: Union[str, Sequence[str], None] = '9c1f4a7b2d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _user_columns() -> set[str]:
	bind = op.get_bind()
	return {column['name'] for column in inspect(bind).get_columns('users')}


def upgrade() -> None:
	if 'avatar_url' not in _user_columns():
		op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
	if 'avatar_url' in _user_columns():
		op.drop_column('users', 'avatar_url')
