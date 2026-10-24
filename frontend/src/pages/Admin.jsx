import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Auth.css'

function extractError(err) {
  const status = err?.response?.status
  if (status === 403) return 'Нет прав суперпользователя.'
  if (status === 401) return 'Неверный email или пароль.'

  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg || 'Ошибка проверки данных'
  return detail || err?.message || 'Не удалось подключиться к серверу'
}

// /admin: отдельная страница вне основного каркаса.
// Показывает форму входа, а после успешного admin-login — заглушку панели.
export default function Admin() {
  const { user, adminLogin, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSuperuser = user?.role === 'superuser'

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

  if (isSuperuser) {
    return (
      <div className="auth-page">
        <div className="card">
          <div className="auth-card-header">
            <p className="brand">Xkadzama<span>.</span></p>
            <h1>Админ-панель</h1>
            <p className="text-secondary">
              Вы вошли как суперпользователь. Разделы управления появятся позже.
            </p>
          </div>

          <ul className="user-info">
            <li><strong>Email</strong><span>{user.email}</span></li>
            <li><strong>Роль</strong><span>{user.role}</span></li>
          </ul>

          <button type="button" className="btn btn-primary btn-block" onClick={logout}>
            Выйти
          </button>

          <hr className="divider" />
          <p className="text-secondary auth-footer">
            <Link to="/">Перейти на сайт</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <div className="auth-card-header">
          <p className="brand">Xkadzama<span>.</span></p>
          <h1>Админ-панель</h1>
          <p className="text-secondary">Вход только для суперпользователя.</p>
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
