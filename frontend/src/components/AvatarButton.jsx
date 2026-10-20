import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Пустышка-аватар: пока нет загрузки фото — показываем инициалы
export function getInitials(user) {
  const first = user?.first_name?.[0] ?? ''
  const last = user?.last_name?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

// Маленькое окошко с аватаркой справа сверху главной страницы.
// Клик по нему ведёт студента в «Мой профиль» (/profile).
export default function AvatarButton() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <button
      type="button"
      className="avatar-button"
      onClick={() => navigate('/profile')}
      title="Мой профиль"
      aria-label="Перейти в мой профиль"
    >
      <span className="avatar" aria-hidden="true">{getInitials(user)}</span>
      <span className="avatar-name">{user.first_name}</span>
    </button>
  )
}
