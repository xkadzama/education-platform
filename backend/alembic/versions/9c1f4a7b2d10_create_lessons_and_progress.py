"""create lessons and lesson_progress

Revision ID: 9c1f4a7b2d10
Revises: 147b63821882
Create Date: 2026-10-24 22:00:00.000000

Каталог уроков вынесен из фронтенд-заглушки в PostgreSQL. Здесь же
сидируются 12 стартовых тем Python, чтобы страница /lessons сразу
показывала реальные данные. Прогресс (lesson_progress) не сидируется:
у каждого пользователя он свой и начинается с нуля.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c1f4a7b2d10'
down_revision: Union[str, Sequence[str], None] = '147b63821882'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LESSONS = [
	('py-01', 'Введение в Python: установка и первый скрипт', 'Основы', 25),
	('py-02', 'Переменные и типы данных', 'Основы', 30),
	('py-03', 'Операторы и выражения', 'Основы', 20),
	('py-04', 'Условные конструкции: if / elif / else', 'Контроль потока', 35),
	('py-05', 'Циклы for и while', 'Контроль потока', 40),
	('py-06', 'Функции: аргументы, return, области видимости', 'Функции', 45),
	('py-07', 'Списки и кортежи', 'Структуры данных', 30),
	('py-08', 'Словари и множества', 'Структуры данных', 35),
	('py-09', 'Работа со строками и f-строки', 'Текст', 25),
	('py-10', 'Чтение и запись файлов', 'Практика', 40),
	('py-11', 'Исключения: try / except / finally', 'Надёжность', 30),
	('py-12', 'Модули и пакеты', 'Структура проекта', 35),
]


def upgrade() -> None:
	op.create_table(
		'lessons',
		sa.Column('id', sa.Integer(), nullable=False),
		sa.Column('slug', sa.String(length=50), nullable=False),
		sa.Column('title', sa.String(length=255), nullable=False),
		sa.Column('topic', sa.String(length=100), nullable=False),
		sa.Column('description', sa.Text(), nullable=True),
		sa.Column('duration_minutes', sa.Integer(), nullable=False),
		sa.Column('presentation_url', sa.String(length=500), nullable=True),
		sa.Column('sort_order', sa.Integer(), nullable=False),
		sa.Column('is_published', sa.Boolean(), server_default=sa.true(), nullable=False),
		sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
		sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
		sa.PrimaryKeyConstraint('id'),
	)
	op.create_index(op.f('ix_lessons_id'), 'lessons', ['id'], unique=False)
	op.create_index(op.f('ix_lessons_slug'), 'lessons', ['slug'], unique=True)
	op.create_index(op.f('ix_lessons_sort_order'), 'lessons', ['sort_order'], unique=False)

	op.create_table(
		'lesson_progress',
		sa.Column('id', sa.Integer(), nullable=False),
		sa.Column('user_id', sa.Integer(), nullable=False),
		sa.Column('lesson_id', sa.Integer(), nullable=False),
		sa.Column('completed_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
		sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
		sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
		sa.PrimaryKeyConstraint('id'),
		sa.UniqueConstraint('user_id', 'lesson_id', name='uq_lesson_progress_user_lesson'),
	)
	op.create_index(op.f('ix_lesson_progress_id'), 'lesson_progress', ['id'], unique=False)
	op.create_index(op.f('ix_lesson_progress_user_id'), 'lesson_progress', ['user_id'], unique=False)
	op.create_index(op.f('ix_lesson_progress_lesson_id'), 'lesson_progress', ['lesson_id'], unique=False)

	lessons_table = sa.table(
		'lessons',
		sa.column('slug', sa.String),
		sa.column('title', sa.String),
		sa.column('topic', sa.String),
		sa.column('duration_minutes', sa.Integer),
		sa.column('sort_order', sa.Integer),
		sa.column('is_published', sa.Boolean),
	)
	op.bulk_insert(
		lessons_table,
		[
			{
				'slug': slug,
				'title': title,
				'topic': topic,
				'duration_minutes': duration,
				'sort_order': index,
				'is_published': True,
			}
			for index, (slug, title, topic, duration) in enumerate(LESSONS, start=1)
		],
	)


def downgrade() -> None:
	op.drop_index(op.f('ix_lesson_progress_lesson_id'), table_name='lesson_progress')
	op.drop_index(op.f('ix_lesson_progress_user_id'), table_name='lesson_progress')
	op.drop_index(op.f('ix_lesson_progress_id'), table_name='lesson_progress')
	op.drop_table('lesson_progress')

	op.drop_index(op.f('ix_lessons_sort_order'), table_name='lessons')
	op.drop_index(op.f('ix_lessons_slug'), table_name='lessons')
	op.drop_index(op.f('ix_lessons_id'), table_name='lessons')
	op.drop_table('lessons')
