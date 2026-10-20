import { useEffect, useState } from 'react'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

// Каркас защищённых страниц по эталонному Preline-сниппету
// #hs-sidebar-content-push-to-mini-sidebar (behavior: content push to mini):
//  • сайдбар — fixed-панель слева с ТРЕМЯ состояниями:
//      'open'  — полная ширина 256px (по умолчанию, аналог [--opened:lg]);
//      'mini'  — узкий рельс 52px (hs-overlay-minified:w-13), видны иконки;
//      'hidden'— панель полностью скрыта (-translate-x-full / width 0);
//  • переключатель minify (круглая кнопка size-9) живёт в header панели
//    рядом с брендом: open ⇄ mini; X в header закрывает панель на мобильных;
//    мобильная кнопка «Open» (вне панели) открывает overlay;
//  • контент сдвигается через margin-inline-start = фактической ширине
//    панели (content-push: 256px ↔ 52px ↔ 0);
//  • переходы включаются только после первого кадра (ready), чтобы страница
//    не анимировала сама себя при загрузке.
export default function AppLayout({ children }) {
  const [state, setState] = useState('open')   // 'open' | 'mini' | 'hidden'
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const widthVar =
    state === 'open' ? 'var(--sidebar-w)' :
    state === 'mini' ? 'var(--sidebar-w-mini)' :
    '0px'

  return (
    <div className={`app-shell sidebar-state-${state}${ready ? ' is-ready' : ''}`}
      style={{ '--sb-live': widthVar }}>
      <AppHeader />
      {/* --sb-live = фактическая ширина панели: content-push контента
          (.app-content) и сдвиг шапки (.app-header-inner) наследуют токен
          от app-shell; transition'ы синхронны с анимацией .sidebar (0.3s) */}
      <div className="app-body">
        <Sidebar state={state} setState={setState} ready={ready} />

        {/* Content (в эталоне — div с sm:hs-overlay-layout-open:ms-64) */}
        <main className="app-content">
          <div className="container app-content-inner">{children}</div>
        </main>
      </div>
    </div>
  )
}
