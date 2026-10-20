import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Пустышка-аватар: пока фото не загружено — показываем инициалы
export function getInitials(user) {
  const first = user?.first_name?.[0] ?? ''
  const last = user?.last_name?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

// Круглый аватар: реальное фото, если avatar_url задан, иначе инициалы
export function Avatar({ user, size = '', className = '' }) {
  const base = size === 'lg' ? 'avatar-lg' : ''
  if (user?.avatar_url) {
    return (
      <img
        className={`avatar avatar-photo ${base} ${className}`}
        src={user.avatar_url}
        alt={`${user.first_name} ${user.last_name}`}
      />
    )
  }
  return (
    <span className={`avatar ${base} ${className}`} aria-hidden="true">
      {getInitials(user)}
    </span>
  )
}

// Аватарка справа сверху: клик открывает выпадающее меню (Профиль / Выйти)
export default function AvatarButton() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Закрытие меню по клику вне него и по Escape
  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onEscape = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const goProfile = () => {
    setOpen(false)
    navigate('/profile')
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <div className="avatar-menu-wrap" ref={ref}>
      <button
        type="button"
        className="avatar-button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Меню профиля"
      >
        <Avatar user={user} />
        <span className="avatar-name">{user.first_name}</span>
        <span className={`avatar-caret${open ? ' open' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="dropdown" role="menu">
          <div className="dropdown-header">
            <span className="dropdown-email">{user.email}</span>
          </div>
          <button type="button" className="dropdown-item" role="menuitem" onClick={goProfile}>
            Профиль
          </button>
          <button
            type="button"
            className="dropdown-item dropdown-item-danger"
            role="menuitem"
            onClick={handleLogout}
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
