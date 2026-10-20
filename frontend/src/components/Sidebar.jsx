import { NavLink } from 'react-router-dom'

// Сайдбар слева: навигация по приложению.
// Пока один пункт — «Уроки». Новые пункты добавляем в массив items.
const items = [
  { to: '/lessons', label: 'Уроки', icon: '📘' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="Основная навигация">
        <ul className="sidebar-list">
          {items.map((item) => (
            <li key={item.to}>
              {/* NavLink сам проставляет .active при совпадении маршрута */}
              <NavLink to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
