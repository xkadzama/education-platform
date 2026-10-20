import { useEffect, useState } from 'react'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

// Каркас защищённых страниц по эталонному сниппету (Preline hs-overlay):
//  • сайдбар — fixed-панель слева (256px), выезжает/уезжает по translateX;
//  • контент сдвигается через margin-inline-start (content-push);
//  • бургер живёт ВНУТРИ сайдбара (absolute у правого края панели) и
//    остаётся виден даже при свёрнутой панели — им открываем/закрываем меню;
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

        {/* Content (в эталоне — div с ms-64). Бургер перенесён внутрь
            сайдбара (header панели), здесь только контент. */}
        <main className="app-content">
          <div className="container app-content-inner">{children}</div>
        </main>
      </div>
    </div>
  )
}
