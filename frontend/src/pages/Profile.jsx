import { useAuth } from '../auth/AuthContext'
import { getInitials } from '../components/AvatarButton'

// «Мой профиль»: показываем только те данные, что реально есть в модели User / ответе /auth/me
export default function Profile() {
  const { user } = useAuth()

  // Ровно те поля, которые возвращает бэкенд (UserResponse) + даты из модели
  const rows = [
    { label: 'Имя', value: user.first_name },
    { label: 'Фамилия', value: user.last_name },
    { label: 'Email', value: user.email },
    { label: 'Роль', value: user.role },
    { label: 'ID', value: user.id },
  ]

  return (
    <div className="page">
      <div className="container page-narrow">
        <h1 className="page-title">Мой профиль</h1>

        <section className="card card-wide">
          {/* Аватарка-пустышка (инициалы), как в шапке */}
          <div className="profile-header">
            <span className="avatar avatar-lg" aria-hidden="true">
              {getInitials(user)}
            </span>
            <div>
              <h2>{user.first_name} {user.last_name}</h2>
              <p className="text-secondary">{user.email}</p>
            </div>
          </div>

          <hr className="divider" />

          <ul className="user-info">
            {rows.map((row) => (
              <li key={row.label}>
                <strong>{row.label}</strong>
                <span>{row.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
