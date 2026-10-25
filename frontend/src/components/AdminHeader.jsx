import { useAuth } from '../auth/AuthContext'

// Шапка админки: слева заголовок, справа email и выход.
// Каркас/сайдбар — общий AppLayout, поэтому стили шапки переиспользуются.
export default function AdminHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <div className="container">
        <div className="app-header-inner admin-header-inner">
          <span className="admin-header-title">Админ-панель</span>
          <div className="admin-header-actions">
            {user?.role && <span className="admin-header-role">{user.role}</span>}
            {user?.email && <span className="admin-header-email">{user.email}</span>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
