from pydantic import BaseModel


class LessonResponse(BaseModel):
	"""Урок в ответе GET /lessons.

	`completed` — персональный флаг текущего пользователя (из lesson_progress),
	а не свойство самого урока.
	"""

	id: int
	slug: str
	title: str
	topic: str
	description: str | None = None
	duration_minutes: int
	presentation_url: str | None = None
	sort_order: int
	completed: bool = False
