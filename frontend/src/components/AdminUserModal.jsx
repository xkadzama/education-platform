import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'
import { Avatar } from './AvatarButton'

const ROLE_OPTIONS = [
  { value: 'student', label: 'Студент' },
  { value: 'teacher', label: 'Преподаватель' },
  { value: 'admin', label: 'Администратор' },
]

const ROLE_LABELS = {
  student: 'Студент',
  teacher: 'Преподаватель',
  admin: 'Администратор',
  superuser: 'Суперадминистратор',
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function extractError(err, fallback) {
  if (err?.response?.status === 400) return 'Этого пользователя нельзя изменить.'
  if (err?.response?.status === 403) return 'Нет прав администратора.'
  if (err?.response?.status === 404) return 'Пользователь не найден.'
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg || fallback
  return detail || err?.message || fallback
}

// Модальная карточка пользователя + подтверждение деактивации + смена роли.
export default function AdminUserModal({ userId, onClose, onUserUpdated }) {
  const { user: currentUser } = useAuth()
  const canAssignAdmin = currentUser?.role === 'superuser'
  const availableRoleOptions = canAssignAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((option) => option.value !== 'admin')

  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('student')
  const [actionError, setActionError] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get(`/api/admin/users/${userId}`)
      .then((res) => {
        if (cancelled) return
        setUser(res.data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(extractError(err, 'Не удалось загрузить пользователя.'))
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [userId])

  // Escape закрывает верхний слой; блокируем прокрутку страницы под модалкой.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (roleOpen) {
        setRoleOpen(false)
      } else if (confirmOpen) {
        setConfirmOpen(false)
      } else {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [roleOpen, confirmOpen, onClose])

  const canModify = user && user.role !== 'superuser'

  const openConfirm = () => {
    setActionError('')
    setConfirmOpen(true)
  }

  const openRole = () => {
    setActionError('')
    setSelectedRole(user.role)
    setRoleOpen(true)
  }

  const deactivate = async () => {
    setBusy(true)
    setActionError('')
    try {
      const res = await api.post(`/api/admin/users/${userId}/deactivate`)
      setUser(res.data)
      onUserUpdated(res.data)
      setConfirmOpen(false)
      onClose()
    } catch (err) {
      setActionError(extractError(err, 'Не удалось деактивировать аккаунт.'))
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    setBusy(true)
    setRestoreError('')
    try {
      const res = await api.post(`/api/admin/users/${userId}/activate`)
      setUser(res.data)
      onUserUpdated(res.data)
    } catch (err) {
      setRestoreError(extractError(err, 'Не удалось восстановить аккаунт.'))
    } finally {
      setBusy(false)
    }
  }

  const applyRole = async () => {
    if (!canAssignAdmin && selectedRole === 'admin') {
      setActionError('Только суперпользователь может назначать администраторов.')
      return
    }

    setBusy(true)
    setActionError('')
    try {
      const res = await api.patch(`/api/admin/users/${userId}/role`, {
        role: selectedRole,
      })
      setUser(res.data)
      onUserUpdated(res.data)
      setRoleOpen(false)
    } catch (err) {
      setActionError(extractError(err, 'Не удалось изменить роль.'))
    } finally {
      setBusy(false)
    }
  }

  const closeFromBackdrop = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={closeFromBackdrop}>
      <div
        className="modal-card admin-user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-modal-title"
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        {status === 'loading' && (
          <p className="text-secondary" role="status">Загружаем пользователя…</p>
        )}

        {status === 'error' && (
          <p className="field-error" role="alert">{error}</p>
        )}

        {status === 'ready' && user && (
          <>
            <div className="admin-user-modal-head">
              <Avatar user={user} size="lg" />
              <div>
                <h2 id="admin-user-modal-title" className="admin-user-modal-name">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-secondary">{roleLabel(user.role)}</p>
                {!user.is_active && (
                  <p className="admin-user-modal-inactive">Аккаунт деактивирован</p>
                )}
              </div>
            </div>

            <dl className="admin-user-meta">
              <div><dt>Имя</dt><dd>{user.first_name}</dd></div>
              <div><dt>Фамилия</dt><dd>{user.last_name}</dd></div>
              <div><dt>Почта</dt><dd>{user.email}</dd></div>
              <div><dt>Роль</dt><dd>{roleLabel(user.role)}</dd></div>
              <div><dt>Дата создания</dt><dd>{formatDate(user.created_at)}</dd></div>
            </dl>

            {restoreError && <p className="field-error" role="alert">{restoreError}</p>}

            <div className="admin-user-modal-actions">
              {user.is_active ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={openConfirm}
                  disabled={!canModify || busy}
                >
                  Удалить аккаунт
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={restore}
                  disabled={!canModify || busy}
                >
                  {busy ? 'Восстанавливаем…' : 'Восстановить аккаунт'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={openRole}
                disabled={!canModify || busy}
              >
                Сменить роль
              </button>
            </div>

            {!canModify && (
              <p className="admin-user-modal-note">
                Аккаунт суперпользователя защищён от деактивации и смены роли.
              </p>
            )}
          </>
        )}

        {confirmOpen && (
          <div
            className="modal-backdrop modal-backdrop-nested"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setConfirmOpen(false)
            }}
          >
            <div
              className="modal-card modal-card-small"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-confirm-title"
            >
              <h2 id="admin-confirm-title" className="modal-title">Вы уверены?</h2>
              <p className="text-secondary">
                Аккаунт будет деактивирован. Пользователь не сможет войти в систему.
              </p>
              {actionError && <p className="field-error" role="alert">{actionError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivate}
                  disabled={busy}
                >
                  {busy ? 'Удаляем…' : 'Да'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmOpen(false)}
                  disabled={busy}
                >
                  Нет
                </button>
              </div>
            </div>
          </div>
        )}

        {roleOpen && (
          <div
            className="modal-backdrop modal-backdrop-nested"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setRoleOpen(false)
            }}
          >
            <div
              className="modal-card modal-card-small"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-role-title"
            >
              <h2 id="admin-role-title" className="modal-title">Сменить роль</h2>

              <div className="field">
                <label htmlFor="admin-role-select">Роль</label>
                <select
                  id="admin-role-select"
                  className="input admin-role-select"
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  disabled={busy}
                >
                  {!availableRoleOptions.some((option) => option.value === user.role) && (
                    <option value={user.role} disabled>
                      {roleLabel(user.role)} (недоступно)
                    </option>
                  )}
                  {availableRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {!canAssignAdmin && (
                <p className="admin-user-modal-note">
                  Назначать роль «Администратор» может только суперпользователь.
                </p>
              )}

              {actionError && <p className="field-error" role="alert">{actionError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyRole}
                  disabled={busy || selectedRole === user.role || (!canAssignAdmin && selectedRole === 'admin')}
                >
                  {busy ? 'Применяем…' : 'Применить'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRoleOpen(false)}
                  disabled={busy}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
