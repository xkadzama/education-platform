import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

// Каркас защищённых страниц по эталонному Preline-сниппету
// #hs-sidebar-content-push-to-mini-sidebar (behavior: content push to mini):
//  • сайдбар — fixed-панель слева с состояниями (как hs-overlay + minifier):
//      'open'  — полная ширина 256px (w-64, по умолчанию);
//      'mini'  — узкий рельс 52px (hs-overlay-minified:w-13), видны иконки;
//                на десктопе панель скрытой НЕ бывает (lg:block) — toggle
//                работает как minifier open ⇄ mini;
//      'hidden'— только мобильные (<1024px): панель уезжает за край
//                (-translate-x-full), открывает её кнопка «Open» ниже;
//  • контент сдвигается через margin-inline-start = фактической ширине панели
//    (content-push: 256px ↔ 52px ↔ 0 на мобильных);
//  • переходы включаются только после первого кадра (ready).
const DESKTOP_QUERY = '(min-width: 1025px)'

// На десктопе панель по умолчанию открыта, на мобильных — скрыта
// (эталон Preline: [--opened:lg] — открыто только на lg+). Вычисляем
// синхронно в lazy-initializer, чтобы при первом кадре не было вспышки
// открытого overlay на телефоне.
function initialSidebarState() {
  if (typeof window === 'undefined') return 'open'
  return window.matchMedia(DESKTOP_QUERY).matches ? 'open' : 'hidden'
}

export default function AppLayout() {
  const [state, setState] = useState(initialSidebarState)   // 'open' | 'mini' | 'hidden'
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // При переходе через брейкпоинт поддерживаем корректное состояние:
  // mobile → desktop: 'hidden' невозможно, превращаем в 'mini' (иначе
  //   панель 256px, а --sb-live 52px — контент уезжает под панель);
  // desktop → mobile: открытую/мини-панель прячем в overlay-режим, чтобы
  //   меню не накрывало контент после сужения окна.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const sync = () => {
      if (mq.matches) {
        setState((s) => (s === 'hidden' ? 'mini' : s))
      } else {
        setState((s) => (s === 'hidden' ? s : 'hidden'))
      }
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // На десктопе панель не прячется полностью (lg:block): 'hidden' трактуется
  // как мини-рельс; реальное скрытие (translateX) происходит только <1024px.
  const widthVar =
    state === 'open' ? 'var(--sidebar-w)' :
    'var(--sidebar-w-mini)'

  return (
    <div className={`app-shell sidebar-state-${state}${ready ? ' is-ready' : ''}`}
      style={{ '--sb-live': widthVar }}>
      <AppHeader />
      {/* --sb-live = фактическая ширина панели: content-push контента
          (.app-content) и сдвиг шапки (.app-header-inner) наследуют токен
          от app-shell; transition'ы синхронны с анимацией .sidebar (0.3s) */}
      <div className="app-body">
        {/* Navigation Toggle (эталон: div.lg:hidden py-16 text-center + кнопка
            «Open») — вне панели, видна только на мобильных когда панель скрыта */}
        <div className="sidebar-open-wrap">
          <button
            type="button"
            className="sidebar-open-btn"
            aria-haspopup="dialog"
            aria-expanded={state !== 'hidden'}
            aria-controls="sidebar-panel"
            aria-label="Переключить навигацию"
            onClick={() => setState(state === 'hidden' ? 'open' : 'hidden')}
          >
            Open
          </button>
        </div>

        <Sidebar state={state} setState={setState} ready={ready} />

        {/* Content (в эталоне — div с sm:hs-overlay-layout-open:ms-64) */}
        <main className="app-content">
          <div className="container app-content-inner"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
