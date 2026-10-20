import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

// Сайдбар слева: навигация по приложению.
// Пока один пункт — «Уроки». Новые пункты добавляем в массив items.
const items = [
  { to: '/lessons', label: 'Уроки', icon: '📘' },
]

export default function Sidebar() {
  // Открыт по умолчанию (по требованию).
  const [open, setOpen] = useState(true)
  // Флаг «готовности»: переходы включаем только после первого кадра,
  // чтобы при загрузке страницы сайдбар не «выезжал» без действия пользователя.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Escape закрывает свёрнутый/открытый сайдбар — быстрый способ скрыть панель.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <aside className={`sidebar${open ? ' open' : ''}${ready ? ' is-ready' : ''}`}>
      {/* Бургер: нажатие разворачивает панель, повторное — сворачивает обратно. */}
      <button
        type="button"
        className="sidebar-toggle"
        aria-expanded={open}
        aria-controls="sidebar-nav"
        aria-label={open ? 'Свернуть меню' : 'Открыть меню'}
        title={open ? 'Свернуть меню' : 'Открыть меню'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sidebar-toggle-icon" aria-hidden="true">☰</span>
      </button>

      <div className="sidebar-panel" id="sidebar-nav">
        <nav className="sidebar-nav" aria-label="Основная навигация">
          <ul className="sidebar-list">
            {items.map((item) => (
              <li key={item.to}>
                {/* NavLink сам проставляет .active при совпадении маршрута */}
                <NavLink to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                  <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
