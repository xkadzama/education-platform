import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AppHeader from '../components/AppHeader'

// Главная (защищённая) страница: доступна только после входа по JWT.
// Справа сверху — окошко с аватаркой, ведущее в «Мой профиль».
export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <>
      <AppHeader />

      <div className="page">
        <div className="container page-narrow">
          <h1 className="page-title">Добро пожаловать, {user.first_name}!</h1>
          <p className="text-secondary">
            Вы видите эту страницу, потому что сервер проверил ваш Bearer-токен в эндпоинте{' '}
            <code>GET /auth/me</code>. Нажмите на аватарку справа сверху, чтобы открыть профиль.
          </p>

          <section className="card card-wide" style={{ marginTop: 'var(--space-md)' }}>
            <ul className="user-info">
              <li><strong>Email</strong> {user.email}</li>
              <li><strong>Роль</strong> {user.role}</li>
              <li><strong>ID</strong> {user.id}</li>
            </ul>

            <div className="dashboard-actions">
              <Link to="/profile" className="btn btn-primary">Мой профиль</Link>
              <button type="button" className="btn btn-secondary" onClick={logout}>
                Выйти
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
