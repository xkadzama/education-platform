import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Auth.css'

// Извлекаем текст ошибки из ответа FastAPI (detail; для 422 — первое сообщение валидатора)
function extractError(err) {
  const detail = err.response?.data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg || 'Ошибка проверки данных'
  return detail || err.message || 'Не удалось подключиться к серверу'
}

export default function Login() {
  const { user, login } = useAuth()
  const location = useLocation() // сюда ProtectedRoute может передать from: location
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Уже авторизованы — не показываем форму
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      // Куда идти после входа: на исходную страницу или на главную
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
          <h1>Вход</h1>
          <p className="text-secondary">
            Авторизация по JWT: сервер выдаёт access-токен (15 мин) и refresh-токен (7 дней).
          </p>
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="error-banner" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Входим…' : 'Войти'}
        </button>

        <hr className="divider" />

        <p className="text-secondary auth-footer">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  )
}
