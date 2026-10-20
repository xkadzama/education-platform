import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

// Сайдбар по референс-макету (dribbble 45744381):
//  • узкая декоративная колонка-«рельс» слева (у нас — чёрная, наша палитра);
//  • КРУГЛАЯ белая кнопка-бургер живёт на рельсе и наполовину выступает за
//    его правый край, «прилипая» к контентной карточке;
//  • контентная карточка = единое целое с сайдбаром: навигация идёт
//    вертикальным столбцом ВНУТРИ карточки слева, справа — основной контент;
//  • бургер схлопывает/раздвигает столбец навигации ПО ШИРИНЕ (208px → 0),
//    поэтому контент плавно «выезжает» влево — горизонтальная анимация.
// По умолчанию сайдбар открыт. Цвета макета не копируем — своя палитра.

// Пока один пункт — «Уроки». Новые пункты добавляем в массив items.
const items = [
  { to: '/lessons', label: 'Уроки', icon: '📘' },
]

export default function Sidebar({ open, setOpen, ready }) {
  // Escape скрывает навигацию — быстрый способ закрыть меню.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <div className={`sidebar-shell${open ? ' open' : ''}${ready ? ' is-ready' : ''}`}>
      {/* Единая белая карточка-подложка: объединяет рельс, навигацию и
          контент в один визуальный блок (одна рамка, один радиус). */}
      <div className="sidebar-card" aria-hidden="true" />

      {/* Рельс + выступающий круглый бургер */}
      <div className="sidebar-rail">
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
      </div>

      {/* Столбец навигации — вторая колонка грида поверх карточки-подложки */}
      <nav className="sidebar-nav" id="sidebar-nav" aria-label="Основная навигация">
        <ul className="sidebar-list">
          {items.map((item) => (
            <li key={item.to}>
              {/* NavLink сам проставляет .active при совпадении маршрута */}
              <NavLink
                to={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
