import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import AppLayout from './components/AppLayout'
import AppRoutes from './components/AppRoutes'

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
          через <Outlet/> внутри AppLayout (см. components/AppRoutes.jsx) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route element={<AppRoutes />} />
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
