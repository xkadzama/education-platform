import { useEffect, useState } from 'react'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

// Каркас защищённых страниц по эталонному сниппету (Preline hs-overlay):
//  • сайдбар — fixed-панель слева (256px), выезжает/уезжает по translateX;
//  • контент сдвигается через margin-inline-start (content-push);
//  • бургер (иконка «panel/sidebar») живёт в контенте над страницей и
//    открывает панель (на десктопе — когда панель свёрнута);
//  • по умолчанию панель открыта ([--opened:lg]).
export default function AppLayout({ children }) {
  const [open, setOpen] = useState(true)
  // Переходы включаем только после первого кадра, чтобы при загрузке
  // страница не анимировала сама себя.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={`app-shell${ready ? ' is-ready' : ''}`}>
      <AppHeader />
      <div className={`app-body${open ? ' app-body-open' : ''}`}>
        <Sidebar open={open} setOpen={setOpen} />

        {/* Content (в эталоне — div с ms-64 и Navigation Toggle внутри) */}
        <main className="app-content">
          {/* Бургер: круглая кнопка toggle в шапке — единая строка с брендом,
              как в эталоне (кнопка стоит в контенте напротив панели) */}
          <div className="content-topbar">
            <button
              type="button"
              className="sidebar-burger"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="sidebar-panel"
              aria-label={open ? 'Свернуть меню' : 'Открыть меню'}
              onClick={() => setOpen((v) => !v)}
            >
              {/* icon «открыть панель» — показываем, когда панель свёрнута */}
              <svg className="sidebar-burger-icon sidebar-burger-open" xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
              {/* icon «свернуть панель» — показываем, когда панель открыта */}
              <svg className="sidebar-burger-icon sidebar-burger-close" xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m15 10-3 3 3 3" />
              </svg>
              <span className="sr-only">Переключить навигацию</span>
            </button>
          </div>
          <div className="container app-content-inner">{children}</div>
        </main>
      </div>
    </div>
  )
}
