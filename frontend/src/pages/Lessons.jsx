import { lessons } from '../data/lessons'

// Страница «Уроки».
// ВАЖНО: данные об уроках берутся из локальной заглушки src/data/lessons.js,
// они НЕ зависят от PostgreSQL/FastAPI. Если список пуст — значит, проблема
// не в БД (в ней есть только таблица users), а в загрузке страницы (см. ниже
// защиту от падений на Profile/Dashboard).
export default function Lessons() {
  // Защита от undefined/null на случай, если модуль данных повредят при правках
  const safeLessons = Array.isArray(lessons) ? lessons : []
  const completed = safeLessons.filter((l) => l.status === 'completed')
  const upcoming = safeLessons.filter((l) => l.status === 'upcoming')

  return (
    <div className="page">
      <div className="page-narrow">
        <section className="lessons-page">
          <h1 className="page-title">Уроки</h1>
          <p className="text-secondary">
            Список уроков пока — заглушка по темам Python. Данные хранятся в{' '}
            <code>src/data/lessons.js</code>, позже подключим API.
          </p>

          {safeLessons.length === 0 && (
            <p className="text-secondary">Уроки ещё не добавлены.</p>
          )}

          <div className="lessons-section">
            <h2 className="lessons-heading">Пройдено · {completed.length}</h2>
            <ul className="lesson-list">
              {completed.map((lesson) => (
                <li key={lesson.id} className="lesson-item lesson-completed">
                  <span className="lesson-check" aria-hidden="true">✓</span>
                  <div className="lesson-info">
                    <span className="lesson-title">{lesson.title}</span>
                    <span className="lesson-meta">{lesson.topic} · {lesson.duration}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lessons-section">
            <h2 className="lessons-heading">Предстоит · {upcoming.length}</h2>
            <ul className="lesson-list">
              {upcoming.map((lesson) => (
                <li key={lesson.id} className="lesson-item lesson-upcoming">
                  <span className="lesson-dot" aria-hidden="true" />
                  <div className="lesson-info">
                    <span className="lesson-title">{lesson.title}</span>
                    <span className="lesson-meta">{lesson.topic} · {lesson.duration}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
