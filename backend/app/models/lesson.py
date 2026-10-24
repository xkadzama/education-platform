from datetime import datetime

from sqlalchemy import (
	Boolean,
	DateTime,
	ForeignKey,
	Integer,
	String,
	Text,
	UniqueConstraint,
	func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Lesson(Base):
	"""Урок образовательной программы.

	Каталог уроков заполняет администратор (админка — следующий этап).
	Порядок вывода задаётся `sort_order`; `presentation_url` появится, когда
	подключим показ презентаций по клику на тему.
	"""

	__tablename__ = 'lessons'

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	slug: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
	title: Mapped[str] = mapped_column(String(255), nullable=False)
	topic: Mapped[str] = mapped_column(String(100), nullable=False)
	description: Mapped[str | None] = mapped_column(Text, nullable=True)
	duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
	presentation_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
	sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
	is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	created_at: Mapped[datetime] = mapped_column(server_default=func.now())
	updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class LessonProgress(Base):
	"""Факт прохождения урока конкретным пользователем.

	Наличие строки = урок пройден; отдельный статус не нужен. Запись
	уникальна по паре (user_id, lesson_id). API проставляет `completed`
	в ответе /lessons на основе этой таблицы.
	"""

	__tablename__ = 'lesson_progress'
	__table_args__ = (
		UniqueConstraint('user_id', 'lesson_id', name='uq_lesson_progress_user_lesson'),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	user_id: Mapped[int] = mapped_column(
		ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True
	)
	lesson_id: Mapped[int] = mapped_column(
		ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False, index=True
	)
	completed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
