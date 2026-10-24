import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

// Страница «Уроки».
// Каталог берётся из PostgreSQL через GET /api/lessons (Bearer-токен добавляет
// axios-интерцептор). Флаг completed — персональный прогресс пользователя
// из таблицы lesson_progress, поэтому группировка «Пройдено/Предстоит»
// сохраняется, но больше не является статической заглушкой.
export default function Lessons() {
  const [lessons, setLessons] = useState([])
  const [status, setStatus] = useState('loading') // loading | idle | error
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    api
      .get('/api/lessons')
      .then((res) => {
        if (cancelled) return
        setLessons(Array.isArray(res.data) ? res.data : [])
        setStatus('idle')
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err.response?.data?.detail ||
            'Не удалось загрузить уроки. Проверьте, что backend запущен на :8000.',
        )
        setStatus('error')
      })

    return () => { cancelled = true }
  }, [reloadKey])

  const completed = lessons.filter((l) => l.completed)
  const upcoming = lessons.filter((l) => !l.completed)

  return (
    <div className="page">
      <div className="page-narrow">
        <section className="lessons-page">
          <h1 className="page-title">Уроки</h1>
          <p className="text-secondary">
            Программа хранится в базе данных. Отметки о прохождении — персональные,
            поэтому у каждого ученика свой прогресс.
          </p>

          {status === 'loading' && (
            <p className="text-secondary" role="status">Загружаем уроки…</p>
          )}

          {status === 'error' && (
            <>
              <p className="field-error" role="alert">{error}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setStatus('loading')
                  setError('')
                  setReloadKey((k) => k + 1)
                }}
              >
                Повторить
              </button>
            </>
          )}

          {status === 'idle' && lessons.length === 0 && (
            <p className="text-secondary">Уроки ещё не добавлены.</p>
          )}

          {status === 'idle' && completed.length > 0 && (
            <div className="lessons-section">
              <h2 className="lessons-heading">Пройдено · {completed.length}</h2>
              <ul className="lesson-list">
                {completed.map((lesson) => (
                  <li key={lesson.id} className="lesson-item lesson-completed">
                    <Link
                      to={`/lessons/${lesson.uuid}`}
                      className="lesson-link"
                      aria-label={`Открыть урок: ${lesson.title}`}
                    >
                      <span className="lesson-check" aria-hidden="true">✓</span>
                      <div className="lesson-info">
                        <span className="lesson-title">{lesson.title}</span>
                        <span className="lesson-meta">
                          {lesson.topic} · {lesson.duration_minutes} мин
                        </span>
                      </div>
                      <span className="lesson-open" aria-hidden="true">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'idle' && upcoming.length > 0 && (
            <div className="lessons-section">
              <h2 className="lessons-heading">Предстоит · {upcoming.length}</h2>
              {completed.length === 0 && (
                <p className="text-secondary lessons-hint">
                  Пройденных уроков пока нет — начните с первого.
                </p>
              )}
              <ul className="lesson-list">
                {upcoming.map((lesson) => (
                  <li key={lesson.id} className="lesson-item lesson-upcoming">
                    <Link
                      to={`/lessons/${lesson.uuid}`}
                      className="lesson-link"
                      aria-label={`Открыть урок: ${lesson.title}`}
                    >
                      <span className="lesson-dot" aria-hidden="true" />
                      <div className="lesson-info">
                        <span className="lesson-title">{lesson.title}</span>
                        <span className="lesson-meta">
                          {lesson.topic} · {lesson.duration_minutes} мин
                        </span>
                      </div>
                      <span className="lesson-open" aria-hidden="true">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'idle' && lessons.length > 0 && upcoming.length === 0 && (
            <p className="text-secondary">Все уроки пройдены — отличная работа!</p>
          )}
        </section>
      </div>
    </div>
  )
}
