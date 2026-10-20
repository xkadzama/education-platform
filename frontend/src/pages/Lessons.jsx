import { lessons } from '../data/lessons'

// Страница «Уроки»: пройденные и предстоящие уроки (пока заглушка по темам Python).
export default function Lessons() {
  const completed = lessons.filter((l) => l.status === 'completed')
  const upcoming = lessons.filter((l) => l.status === 'upcoming')

  return (
    <section className="lessons-page">
      <h1 className="page-title">Уроки</h1>
      <p className="text-secondary">
        Список уроков пока — заглушка по темам Python. Данные хранятся в{' '}
        <code>src/data/lessons.js</code>, позже подключим API.
      </p>

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
  )
}
