import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

// Сайдбар — точная адаптация эталонного Preline-сниппета
// #hs-sidebar-content-push-to-mini-sidebar (behavior: content push to mini sidebar).
// Структура 1:1 с эталоном:
//   .sidebar > .sidebar-inner > header(.sidebar-brand + .sidebar-close-wrap(mobile)
//   + .sidebar-minify-wrap(desktop)) + nav.sidebar-body > .sidebar-group > ul.sidebar-list
// Три состояния панели (как hs-overlay / hs-overlay-minified):
//   • desktop открытая  — w 256px, translateX(0), бренд + полные пункты;
//   • desktop мини      — w 52px (hs-overlay-minified:w-13), текст скрыт
//     (.sidebar-minified → аналог hs-overlay-minified:hidden), видны иконки;
//   • desktop закрытая  — схлопнута в 0 (translate-x-full в эталоне эмулируется
//     width:0, т.к. анимируется именно ширина — content push);
//   • mobile (<1024px)  — overlay: скрыта (-translate-x-full), открыта по «Open».
// Кнопки:
//   • внутри header: X (только mobile, как в эталоне) и круглый minify-toggle
//     size-9 (только desktop) с двумя panel-иконками (chevron right/left);
//   • вне панели: мобильная кнопка «Open» (Navigation Toggle из эталона).
// Цвета эталона (gray/neutral) НЕ копируем — наша палитра: чёрный фон панели,
// белый текст, hover — белый фон + тёмный текст, активный пункт — --color-accent.

// По просьбе пользователя в меню оставлен только пункт «Уроки»;
// аккордеоны (Курсы/Профиль/Проекты), Расписание и Документация удалены.
// Компоненты AccordionSection и остальные иконки сохранены на случай возврата
// пунктов в будущем.
const NAV = [
  { kind: 'link', to: '/lessons', label: 'Уроки', icon: 'book' },
]

// Иконки size-4 stroke-2 — SVG из эталонного сниппета (lucide).
const ICONS = {
  book: <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />,
  layers: <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  folder: <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8 M15 2v5h5" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  docs: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
}

// Пункты без собственной иконки получают маркер-точку — она остаётся видимой
// в мини-режиме (w-13), где текст скрыт (аналог hs-overlay-minified:hidden).
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

// Текст строки прячем классом-аналогом hs-overlay-minified:hidden только в
// мини-режиме на десктопе (в закрытом оверлее на мобильных скрывать нечего —
// панель уезжает целиком через transform).
const Label = ({ children, nowrap }) => (
  <span className={`sidebar-label${nowrap ? ' sidebar-label-nowrap' : ''}`}>{children}</span>
)

// Аккордеон: always-open группа на верхнем уровне (одна секция открыта),
// вложенные управляются собственным состоянием — как data-hs-accordion-always-open.
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
        {item.icon ? <Icon name={item.icon} /> : <Bullet />}
        <Label>{item.label}</Label>
        <Chevron />
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
        {item.icon ? <Icon name={item.icon} /> : <Bullet />}
        <Label nowrap={Boolean(item.badge)}>
          {item.label}
          {item.badge && <span className="sidebar-badge">{item.badge}</span>}
        </Label>
      </NavLink>
    </li>
  )
}

export default function Sidebar({
  state,
  setState,
  ready,
  items = NAV,
  brandTo = '/',
  brandLabel = 'Xkadzama',
}) {
  // always-open: по умолчанию раскрыта первая секция с иконкой (как Users в эталоне)
  const firstSection = items.find((i) => i.kind === 'accordion')
  const [openId, setOpenId] = useState(firstSection ? firstSection.id : null)
  const panelRef = useRef(null)
  const toggleRef = useRef(null)

  const isOpen = state !== 'hidden'
  const isMini = state === 'mini'

  // Escape закрывает панель только на мобильных (аналог [--auto-close:lg]).
  // На десктопе панель постоянная (lg:block): состояние 'hidden' там
  // не определено и раньше приводило к рассинхрону — панель оставалась
  // 256px, а контент сдвигался на 52px (--sb-live). Поэтому desktop Escape
  // игнорируем.
  useEffect(() => {
    if (!isOpen) return undefined
    const mobileQuery = window.matchMedia('(max-width: 1024px)')
    const onKey = (e) => {
      if (e.key === 'Escape' && mobileQuery.matches) setState('hidden')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, setState])

  // При закрытии снимаем фокус с панели (a11y)
  useEffect(() => {
    if (!isOpen && panelRef.current?.contains(document.activeElement)) {
      panelRef.current.focus({ preventScroll: true })
    }
  }, [isOpen])

  return (
    <>
      {/* Sidebar (эталон: #hs-sidebar-content-push-to-mini-sidebar).
          В эталоне классы hs-overlay-open / hs-overlay-minified навешивает JS
          Preline; здесь их эмулируют React-классы .sidebar-open /
          .sidebar-minified. Десктоп: панель никогда не скрывается полностью
          (lg:block) — toggle работает как minifier (w-64 ⇄ w-13). Мобильные:
          без .sidebar-open панель уезжает за край (-translate-x-full),
          открывает её внешняя кнопка «Open» (в AppLayout, lg:hidden). */}
      <aside
        ref={panelRef}
        id="sidebar-panel"
        className={`sidebar hs-overlay${isOpen ? ' sidebar-open' : ''}${isMini ? ' sidebar-minified' : ''}${ready ? ' is-ready' : ''}`}
        tabIndex={-1}
        aria-label="Сайдбар"
      >
        <div className="sidebar-inner">
          {/* Header: бренд слева; X — только mobile; minify-toggle — только desktop */}
          <header className="sidebar-header">
            <Link className="sidebar-brand" to={brandTo} aria-label={`${brandLabel} — на главную`}>
              {brandLabel}
            </Link>

            <div className="sidebar-close-wrap">
              {/* Close Button (mobile) */}
              <button type="button" className="sidebar-close-btn" aria-label="Закрыть меню"
                onClick={() => setState('hidden')}>
                <svg className="sidebar-close-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="sidebar-minify-wrap">
              {/* Toggle Button (Minify navigation, data-hs-overlay-minifier) */}
              <button
                ref={toggleRef}
                type="button"
                className="sidebar-burger"
                aria-haspopup="dialog"
                aria-expanded={state === 'open'}
                aria-controls="sidebar-panel"
                aria-label={isMini ? 'Развернуть меню' : 'Свернуть меню'}
                onClick={() => setState(isMini ? 'open' : 'mini')}
              >
                {/* chevron-right — когда мини (кликаем, чтобы развернуть) */}
                <svg className="sidebar-burger-icon sidebar-burger-expand" xmlns="http://www.w3.org/2000/svg"
                  width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M15 3v18" />
                  <path d="m8 9 3 3-3 3" />
                </svg>
                {/* chevron-left — когда открыта (кликаем, чтобы свернуть в мини) */}
                <svg className="sidebar-burger-icon sidebar-burger-collapse" xmlns="http://www.w3.org/2000/svg"
                  width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M15 3v18" />
                  <path d="m10 15-3-3 3-3" />
                </svg>
              </button>
            </div>
          </header>

          {/* Body: навигация со скроллом и тонким скроллбаром */}
          <nav className="sidebar-body" aria-label="Основная навигация">
            <div className="sidebar-group">
              <ul className="sidebar-list">
                {items.map((item) =>
                  item.kind === 'link'
                    ? <SidebarLink key={item.to + item.label} item={item} />
                    : <AccordionSection key={item.id} item={item} controlled openId={openId} setOpenId={setOpenId} />
                )}
              </ul>
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
