import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

// Сайдбар адаптирован с эталонного HTML-сниппета (Preline-style):
//  • fixed-панель w-64 слева, bg-sidebar + border-e;
//  • header: бренд; бургер-переключатель внутри панели (absolute, прижат к
//    правому краю открытой панели и остаётся виден при закрытой);
//  • nav со скроллом и тонким скроллбаром;
//  • пункты: flex gap-x-3.5 py-2 px-2.5 text-sm rounded-lg + hover/focus;
//  • аккордеоны (Users/Account/Projects) с chevron-up/down и вложенными
//    списками ps-7 — always-open группа (одна открыта);
//  • бейдж «New» (ms-auto rounded-full);
//  • desktop: -translate-x-full → translate-x-0 при сворачивании, контент
//    сдвигается через margin-inline-start (content-push).
// При закрытии панель уходит за левый край целиком, а бургер остаётся на
// экране (прижат к левому краю) — это единственная видимая часть сайдбара в
// свёрнутом состоянии; клик по нему снова раскрывает меню.
// Цвета сниппета (bg-sidebar и т.п.) не копируем — наша палитра из tokens.css.
// По умолчанию сайдбар открыт ([--opened:lg] → open=true на десктопе).

const NAV = [
  { kind: 'link', to: '/lessons', label: 'Уроки', icon: 'book' },
  {
    kind: 'accordion',
    id: 'courses',
    label: 'Курсы',
    icon: 'layers',
    children: [
      {
        kind: 'accordion',
        id: 'frontend',
        label: 'Frontend',
        children: [
          { kind: 'link', to: '/lessons', label: 'HTML и CSS' },
          { kind: 'link', to: '/lessons', label: 'JavaScript' },
          { kind: 'link', to: '/lessons', label: 'React' },
        ],
      },
      {
        kind: 'accordion',
        id: 'design',
        label: 'Дизайн',
        children: [
          { kind: 'link', to: '/lessons', label: 'Figma' },
          { kind: 'link', to: '/lessons', label: 'Основы композиции' },
        ],
      },
    ],
  },
  {
    kind: 'accordion',
    id: 'profile',
    label: 'Профиль',
    icon: 'settings',
    children: [
      { kind: 'link', to: '/profile', label: 'Личные данные' },
      { kind: 'link', to: '/profile', label: 'Настройки' },
      { kind: 'link', to: '/profile', label: 'Подписка' },
    ],
  },
  {
    kind: 'accordion',
    id: 'projects',
    label: 'Проекты',
    icon: 'folder',
    children: [
      { kind: 'link', to: '/lessons', label: 'Мои проекты' },
      { kind: 'link', to: '/lessons', label: 'Шаблоны' },
    ],
  },
  { kind: 'link', to: '/', label: 'Расписание', icon: 'calendar', badge: 'Новое' },
  { kind: 'link', to: '/', label: 'Документация', icon: 'docs' },
]

// Иконки 16px (size-4), stroke 2 — как SVG из эталонного сниппета.
const ICONS = {
  book: <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />,
  layers: <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  folder: <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8 M15 2v5h5" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  docs: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />,
}

// Пункты без собственной иконки получают «точку» — декоративный маркер,
// который остаётся видимым в свёрнутом рельсе (там, где у остальных иконки).
const Bullet = () => (
  <svg className="sidebar-icon-svg sidebar-bullet" xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
  </svg>
)

function Icon({ name }) {
  return (
    <svg className="sidebar-icon-svg" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

const Chevron = () => (
  <svg className="sidebar-chevron" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

// Аккордеон: всегда открыта одна секция на верхнем уровне
// (аналог data-hs-accordion-always-open в эталоне). Вложенные аккордеоны
// управляются собственным состоянием.
function AccordionSection({ item, controlled, openId, setOpenId }) {
  const [localOpen, setLocalOpen] = useState(false)
  const isOpen = controlled ? openId === item.id : localOpen

  const toggle = () => {
    if (controlled) setOpenId(isOpen ? null : item.id)
    else setLocalOpen((v) => !v)
  }

  return (
    <li className={`hs-accordion${isOpen ? ' hs-accordion-active' : ''}`} id={`${item.id}-accordion`}>
      <button type="button" className="sidebar-toggle-btn hs-accordion-toggle"
        aria-expanded={isOpen} aria-controls={`${item.id}-accordion-collapse`}
        onClick={toggle}>
        {/* .sidebar-item-content — «выдвижной ящик»: в свёрнутом состоянии его
            левый край уезжает за границу панели, поэтому в видимом рельсе 56px
            остаются именно иконка пункта и маркер-точка */}
        <span className="sidebar-item-content">
          {item.icon ? <Icon name={item.icon} /> : <Bullet />}
          {item.label}
          <Chevron />
        </span>
      </button>
      <div id={`${item.id}-accordion-collapse`}
        className={`hs-accordion-content${isOpen ? '' : ' hidden'}`}
        role="region" aria-labelledby={`${item.id}-accordion`}>
        <ul className="sidebar-sublist">
          {item.children.map((child, ci) =>
            child.kind === 'link'
              ? <SidebarLink key={ci} item={child} nested />
              : <AccordionSection key={child.id} item={child} controlled={false} />
          )}
        </ul>
      </div>
    </li>
  )
}

function SidebarLink({ item, nested }) {
  return (
    <li>
      <NavLink to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-nav-active' : ''}${nested ? ' sidebar-link-nested' : ''}`}>
        <span className="sidebar-item-content">
          {item.icon ? <Icon name={item.icon} /> : <Bullet />}
          {item.label}
          {item.badge && <span className="sidebar-badge">{item.badge}</span>}
        </span>
      </NavLink>
    </li>
  )
}

export default function Sidebar({ open, setOpen }) {
  // always-open: по умолчанию раскрыта первая секция с иконкой (как Users в эталоне)
  const firstSection = NAV.find((i) => i.kind === 'accordion')
  const [openId, setOpenId] = useState(firstSection ? firstSection.id : null)
  const panelRef = useRef(null)

  // Escape закрывает панель (аналог поведения hs-overlay)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  // При закрытии на десктопе снимаем фокус с панели (a11y)
  useEffect(() => {
    if (!open && panelRef.current?.contains(document.activeElement)) {
      panelRef.current.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <div ref={panelRef} id="sidebar-panel" className={`sidebar${open ? ' sidebar-open' : ''}`}
      role="dialog" tabIndex={-1} aria-label="Сайдбар">

      <div className="sidebar-inner">
        {/* Header: БУРГЕР + бренд на ОДНОМ уровне (flex-строка).
            • Открытая панель → бургер у ЛЕВОГО края, бренд прижат к правому;
              клик сворачивает меню.
            • Свёрнутая панель → рельс 56px: бренд гаснет, flex-строка
              сжимается вместе с шириной — бургер остаётся видимым и
              кликабельным (клик снова открывает меню). */}
        <header className="sidebar-header">
          <button
            type="button"
            className="sidebar-burger"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="sidebar-panel"
            aria-label={open ? 'Свернуть меню' : 'Открыть меню'}
            onClick={() => setOpen((v) => !v)}
          >
            {/* icon «развернуть панель» — показываем, когда панель свёрнута */}
            <svg className="sidebar-burger-icon sidebar-burger-expand" xmlns="http://www.w3.org/2000/svg"
              width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="m16 15-3-3 3-3" />
            </svg>
            {/* icon «свернуть панель» — показываем, когда панель открыта */}
            <svg className="sidebar-burger-icon sidebar-burger-collapse" xmlns="http://www.w3.org/2000/svg"
              width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="m15 10-3 3 3 3" />
            </svg>
          </button>
          <a className="sidebar-brand" href="/" aria-label="Xkadzama — на главную">Xkadzama</a>
        </header>

        {/* Body: навигация со скроллом */}
        <nav className="sidebar-body" aria-label="Основная навигация">
          <div className="sidebar-group">
            <ul className="sidebar-list">
              {NAV.map((item) =>
                item.kind === 'link'
                  ? <SidebarLink key={item.to + item.label} item={item} />
                  : <AccordionSection key={item.id} item={item} controlled openId={openId} setOpenId={setOpenId} />
              )}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  )
}
