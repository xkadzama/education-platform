"""move presentations storage to uploads

Revision ID: d7e8f9012345
Revises: c5e6f7081920
Create Date: 2026-10-24 23:20:00.000000

Презентации переехали из корневой presentations/ в runtime-каталог
backend/uploads/presentations (он уже отдаётся статикой по /uploads).
Меняем сохранённый URL у py-01. Сами файлы в git не попадают — uploads
исключён из репозитория.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e8f9012345'
down_revision: Union[str, Sequence[str], None] = 'c5e6f7081920'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_URL = '/presentations/m1Lesson1.pdf'
NEW_URL = '/uploads/presentations/m1Lesson1.pdf'


def upgrade() -> None:
	op.execute(
		sa.text(
			"UPDATE lessons SET presentation_url = :new_url, updated_at = now() "
			"WHERE slug = 'py-01' AND presentation_url = :old_url"
		).bindparams(new_url=NEW_URL, old_url=OLD_URL)
	)


def downgrade() -> None:
	op.execute(
		sa.text(
			"UPDATE lessons SET presentation_url = :old_url, updated_at = now() "
			"WHERE slug = 'py-01' AND presentation_url = :new_url"
		).bindparams(new_url=NEW_URL, old_url=OLD_URL)
	)
