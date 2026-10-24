from fastapi import APIRouter, Depends
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.auth import User
from app.models.lesson import Lesson, LessonProgress
from app.schemas.lesson import LessonResponse


router = APIRouter(prefix='/lessons', tags=['lessons'])


@router.get('', response_model=list[LessonResponse])
async def list_lessons(
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
):
	"""Опубликованные уроки в порядке программы.

	Для каждого урока отдаём `completed` — есть ли запись о прохождении
	у текущего пользователя. Прогресс хранится отдельно (lesson_progress),
	поэтому один и тот же каталог одинаков для всех, а флаг — персональный.
	"""
	stmt = (
		select(Lesson, LessonProgress.id)
		.outerjoin(
			LessonProgress,
			and_(
				LessonProgress.lesson_id == Lesson.id,
				LessonProgress.user_id == current_user.id,
			),
		)
		.where(Lesson.is_published.is_(True))
		.order_by(Lesson.sort_order, Lesson.id)
	)
	rows = (await session.execute(stmt)).all()

	return [
		LessonResponse(
			id=lesson.id,
			slug=lesson.slug,
			title=lesson.title,
			topic=lesson.topic,
			description=lesson.description,
			duration_minutes=lesson.duration_minutes,
			presentation_url=lesson.presentation_url,
			sort_order=lesson.sort_order,
			completed=progress_id is not None,
		)
		for lesson, progress_id in rows
	]
