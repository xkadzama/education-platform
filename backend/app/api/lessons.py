from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.auth import User
from app.models.lesson import Lesson, LessonProgress
from app.schemas.lesson import LessonResponse


router = APIRouter(prefix='/api/lessons', tags=['lessons'])


def _lesson_response(lesson: Lesson, progress_id: int | None) -> LessonResponse:
	"""Единый маппинг ORM-урока + строки прогресса в ответ API."""
	return LessonResponse(
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


def _lesson_query(user_id: int):
	"""Уроки + прогресс текущего пользователя (LEFT JOIN, чтобы были и непройденные)."""
	return (
		select(Lesson, LessonProgress.id)
		.outerjoin(
			LessonProgress,
			and_(
				LessonProgress.lesson_id == Lesson.id,
				LessonProgress.user_id == user_id,
			),
		)
		.where(Lesson.is_published.is_(True))
	)


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
	rows = (
		await session.execute(
			_lesson_query(current_user.id).order_by(Lesson.sort_order, Lesson.id)
		)
	).all()

	return [_lesson_response(lesson, progress_id) for lesson, progress_id in rows]


@router.get('/{slug}', response_model=LessonResponse)
async def get_lesson(
	slug: str,
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
):
	"""Один урок по slug — для страницы просмотра презентации."""
	row = (
		await session.execute(_lesson_query(current_user.id).where(Lesson.slug == slug))
	).first()
	if row is None:
		raise HTTPException(status_code=404, detail='Lesson not found')

	lesson, progress_id = row
	return _lesson_response(lesson, progress_id)
