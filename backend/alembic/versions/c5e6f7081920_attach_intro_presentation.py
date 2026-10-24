"""attach intro presentation to py-01

Revision ID: c5e6f7081920
Revises: a4d5e6f70819
Create Date: 2026-10-24 22:25:00.000000

Ручная привязка первой презентации (пока без админки). PDF сконвертирован
из presentations/m1Lesson1.pptx и лежит в presentations/; бэкенд отдаёт его
по /presentations/m1Lesson1.pdf.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c5e6f7081920'
down_revision: Union[str, Sequence[str], None] = 'a4d5e6f70819'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	op.execute(
		"UPDATE lessons "
		"SET presentation_url = '/presentations/m1Lesson1.pdf', updated_at = now() "
		"WHERE slug = 'py-01'"
	)


def downgrade() -> None:
	op.execute(
		"UPDATE lessons SET presentation_url = NULL, updated_at = now() "
		"WHERE slug = 'py-01' "
		"AND presentation_url = '/presentations/m1Lesson1.pdf'"
	)
