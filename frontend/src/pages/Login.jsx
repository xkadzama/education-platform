import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

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
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Вход</h1>
        <p className="auth-hint">
          Авторизация по JWT: сервер выдаёт access-токен (15 мин) и refresh-токен (7 дней).
        </p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@example.com"
          autoComplete="username"
          required
        />

        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && <p className="login-error" role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Входим…' : 'Войти'}
        </button>

        <p className="auth-hint">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  )
}
