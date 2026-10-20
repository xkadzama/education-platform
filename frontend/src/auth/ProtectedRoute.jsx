import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Оборачиваем защищённые страницы: нет пользователя — редирект на /login
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="auth-hint">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}
