import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import Profile from '../pages/Profile'
import Lessons from '../pages/Lessons'

// Вложенные маршруты каркаса AppLayout (роутер-обёртка).
// Каркас (шапка + сайдбар) рендерится ОДИН раз в App.jsx, а сюда
// подменяется только <main> с контентом страницы — поэтому при
// переходе по пунктам меню («Уроки» и др.) сайдбар не перемонтируется
// и никуда не исчезает; состояние open/mini сохраняется.
export default function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="profile" element={<Profile />} />
      <Route path="lessons" element={<Lessons />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
