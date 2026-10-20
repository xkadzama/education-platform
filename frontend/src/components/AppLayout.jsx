import { useEffect, useState } from 'react'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

// Каркас защищённых страниц: шапка сверху; ниже — по референс-макету:
// узкий чёрный «рельс» с круглым бургером слева и ЕДИНАЯ белая карточка,
// внутри которой столбец навигации (слева) и основной контент (справа).
// Сайдбар открыт по умолчанию; состояние живёт здесь, т.к. контент — дети.
export default function AppLayout({ children }) {
  const [open, setOpen] = useState(true)
  // Переходы включаем только после первого кадра, чтобы при загрузке
  // страницы колонка навигации не «раздвигалась» сама без пользователя.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="app-shell">
      <AppHeader />
      {/* Классы .open/.is-ready на самой сетке: --nav-col-w анимируется там,
          где определён grid-template-columns. Открыто по умолчанию. */}
      <div className={`app-body container${open ? ' open' : ''}${ready ? ' is-ready' : ''}`}>
        <Sidebar open={open} setOpen={setOpen} ready={ready} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
