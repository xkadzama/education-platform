"""add public uuid to lessons

Revision ID: e1a2b3c4d5e6
Revises: d7e8f9012345
Create Date: 2026-10-24 23:40:00.000000

Публичный идентификатор урока для URL/API. slug остаётся внутренним
(сиды, админка), чтобы нельзя было перейти к соседнему уроку, зная py-01/py-02.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd7e8f9012345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	op.add_column(
		'lessons',
		sa.Column('uuid', postgresql.UUID(as_uuid=True), nullable=True),
	)
	op.execute('UPDATE lessons SET uuid = gen_random_uuid() WHERE uuid IS NULL')
	op.alter_column(
		'lessons',
		'uuid',
		existing_type=postgresql.UUID(as_uuid=True),
		nullable=False,
		server_default=sa.text('gen_random_uuid()'),
	)
	op.create_index(op.f('ix_lessons_uuid'), 'lessons', ['uuid'], unique=True)


def downgrade() -> None:
	op.drop_index(op.f('ix_lessons_uuid'), table_name='lessons')
	op.drop_column('lessons', 'uuid')
