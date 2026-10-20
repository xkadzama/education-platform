import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Lessons from './pages/Lessons'

// Разворачиваем приложение только после проверки токена на сервере
function AppContent() {
  const { loading } = useAuth()
  if (loading) return <p style={{ padding: 24 }}>Загрузка…</p>

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Каркас (шапка + сайдбар) монтируется ОДИН раз и не пересоздаётся
          при переходах между страницами — контент подменяется динамически
          через <Outlet/> внутри AppLayout. Дочерние маршруты объявлены
          ЗДЕСЬ как element самого AppLayout (раньше они лежали в отдельном
          <Route element={<AppRoutes/>}>, у которого не было <Outlet/> —
          из-за этого React Router не матчил "/profile" и страница была
          пустой: "No routes matched location \"/profile\""). */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="lessons" element={<Lessons />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}
