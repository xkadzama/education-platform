import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AppLayout from '../components/AppLayout'
import AdminHeader from '../components/AdminHeader'
import './Auth.css'

const ADMIN_NAV = [
  { kind: 'link', to: '/admin/users', label: 'Пользователи', icon: 'users' },
]

function extractError(err) {
  const status = err?.response?.status
  if (status === 403) return 'Нет прав администратора.'
  if (status === 401) return 'Неверный email или пароль.'

  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg || 'Ошибка проверки данных'
  return detail || err?.message || 'Не удалось подключиться к серверу'
}

// Форма входа в админку. Рендерится, пока в контексте нет superuser.
function AdminLogin() {
  const { user, adminLogin, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await adminLogin(email, password)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <div className="auth-card-header">
          <p className="brand">Xkadzama<span>.</span></p>
          <h1>Админ-панель</h1>
          <p className="text-secondary">Вход для администраторов.</p>
        </div>

        {user && (
          <p className="text-secondary">
            Сейчас вы вошли как <strong>{user.role}</strong>. Вход в админку
            заменит текущую сессию.
          </p>
        )}

        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="admin-password">Пароль</label>
          <input
            id="admin-password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="error-banner" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Проверяем…' : 'Войти как администратор'}
        </button>

        <hr className="divider" />

        {user ? (
          <button type="button" className="btn btn-secondary btn-block" onClick={logout}>
            Выйти из текущей сессии
          </button>
        ) : (
          <p className="text-secondary auth-footer">
            <Link to="/login">Вход для студентов</Link>
          </p>
        )}
      </form>
    </div>
  )
}

// /admin — точка входа админки. Пока нет superuser, показываем форму;
// после входа — общий каркас с админским сайдбаром и <Outlet/>.
export default function Admin() {
  const { user } = useAuth()
  if (user?.role !== 'superuser' && user?.role !== 'admin') return <AdminLogin />

  return (
    <AppLayout
      items={ADMIN_NAV}
      brandTo="/admin/users"
      header={<AdminHeader />}
    />
  )
}
