import { useAuth } from '../auth/AuthContext'

// Главная (защищённая) страница: доступна только после входа по JWT
export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Добро пожаловать, {user.first_name}! 👋</h1>
        <p className="auth-hint">
          Вы видите эту страницу, потому что сервер проверил ваш Bearer-токен в эндпоинте{' '}
          <code>GET /auth/me</code>.
        </p>
        <ul className="user-info">
          <li><strong>Email:</strong> {user.email}</li>
          <li><strong>Роль:</strong> {user.role}</li>
          <li><strong>ID:</strong> {user.id}</li>
        </ul>
        <button type="button" onClick={logout}>Выйти</button>
      </div>
    </div>
  )
}
