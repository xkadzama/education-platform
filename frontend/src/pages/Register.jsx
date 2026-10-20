import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Auth.css'

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
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <div className="auth-card-header">
          <p className="brand">Xkadzama<span>.</span></p>
          <h1>Регистрация</h1>
          <p className="text-secondary">Создайте аккаунт, чтобы учиться и преподавать.</p>
        </div>

        <div className="field">
          <label htmlFor="first_name">Имя</label>
          <input id="first_name" className="input" value={form.first_name} onChange={update('first_name')} minLength={2} required />
        </div>

        <div className="field">
          <label htmlFor="last_name">Фамилия</label>
          <input id="last_name" className="input" value={form.last_name} onChange={update('last_name')} minLength={2} required />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={form.email} onChange={update('email')} autoComplete="username" required />
        </div>

        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" className="input" type="password" value={form.password} onChange={update('password')} autoComplete="new-password" required />
        </div>

        <div className="field">
          <label htmlFor="password2">Повторите пароль</label>
          <input id="password2" className="input" type="password" value={form.password2} onChange={update('password2')} autoComplete="new-password" required />
        </div>

        {error && <p className="error-banner" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </button>

        <hr className="divider" />

        <p className="text-secondary auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  )
}
