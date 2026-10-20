import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

function extractError(err) {
  const detail = err.response?.data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg || 'Ошибка проверки данных'
  return detail || err.message || 'Не удалось подключиться к серверу'
}

// Совпадает с валидатором UserRegisterRequest на бэкенде
const PASSWORD_RE = /^(?=.*[A-ZА-Я])(?=.*\d).{8,}$/

export default function Register() {
  const { user, register } = useAuth()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', password2: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Клиентская проверка до отправки — меньше лишних запросов к серверу
    if (!PASSWORD_RE.test(form.password)) {
      setError('Пароль: минимум 8 символов, хотя бы одна заглавная буква и одна цифра')
      return
    }
    if (form.password !== form.password2) {
      setError('Пароли не совпадают')
      return
    }

    setSubmitting(true)
    try {
      const { password2, ...data } = form
      await register(data)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Регистрация</h1>

        <label htmlFor="first_name">Имя</label>
        <input id="first_name" value={form.first_name} onChange={update('first_name')} minLength={2} required />

        <label htmlFor="last_name">Фамилия</label>
        <input id="last_name" value={form.last_name} onChange={update('last_name')} minLength={2} required />

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={update('email')} autoComplete="username" required />

        <label htmlFor="password">Пароль</label>
        <input id="password" type="password" value={form.password} onChange={update('password')} autoComplete="new-password" required />

        <label htmlFor="password2">Повторите пароль</label>
        <input id="password2" type="password" value={form.password2} onChange={update('password2')} autoComplete="new-password" required />

        {error && <p className="login-error" role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </button>

        <p className="auth-hint">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  )
}
