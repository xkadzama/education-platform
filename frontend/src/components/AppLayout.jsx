import { useEffect, useState } from 'react'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

// Каркас защищённых страниц по эталонному сниппету (Preline hs-overlay):
//  • сайдбар — fixed-панель слева: открыта 256px, свёрнута — видимый рельс
//    56px (анимация ширины через @property --sb-width, панель не уезжает за
//    экран — в рельсе остаются бургер и иконки пунктов);
//  • контент сдвигается через margin-inline-start = фактической ширине
//    панели (content-push);
//  • бургер живёт ВНУТРИ header панели на одном уровне с брендом;
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
    <div className={`app-shell${ready ? ' is-ready' : ''}${open ? ' sidebar-open' : ''}`}>
      <AppHeader />
      {/* --sb-live дублирует анимируемую ширину панели для сабтрея контента
          (transition маргинала синхронен с width-анимацией .sidebar) */}
      <div
        className={`app-body${open ? ' app-body-open' : ''}`}
        style={{ '--sb-live': open ? 'var(--sidebar-w)' : 'var(--sidebar-w-rail)' }}
      >
        <Sidebar open={open} setOpen={setOpen} />

        {/* Content (в эталоне — div с ms-64). Бургер перенесён внутрь
            сайдбара (header панели), здесь только контент. */}
        <main className="app-content">
          <div className="container app-content-inner">{children}</div>
        </main>
      </div>
    </div>
  )
}
