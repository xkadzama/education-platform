import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import AppLayout from '../components/AppLayout'
import { Avatar } from '../components/AvatarButton'

// «Мой профиль»: показываем только те данные, что реально есть в модели User / ответе /auth/me
export default function Profile() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Загрузка фото: POST /auth/avatar (multipart/form-data, поле `file`)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // сбрасываем, чтобы можно было выбрать тот же файл повторно
    if (!file) return

    setError('')
    if (file.size > 5 * 1024 * 1024) {
      setError('Файл больше 5 МБ — выберите изображение поменьше')
      return
    }

    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      const res = await api.post('/auth/avatar', form) // axios сам поставит boundary
      updateUser({ avatar_url: res.data.avatar_url })   // фото сразу обновится и в шапке
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
    }
  }

  // Ровно те поля, которые возвращает бэкенд (UserResponse)
  const rows = [
    { label: 'Имя', value: user.first_name },
    { label: 'Фамилия', value: user.last_name },
    { label: 'Email', value: user.email },
    { label: 'Роль', value: user.role },
  ]

  return (
    <AppLayout>
      <div className="page">
        <div className="page-narrow">
        {/* Возврат на главную */}
        <Link to="/" className="back-link">← На главную</Link>

        <h1 className="page-title">Мой профиль</h1>

        <section className="card card-wide">
          {/* Аватар: реальное фото, если загружено, иначе инициалы */}
          <div className="profile-header">
            <Avatar user={user} size="lg" />
            <div>
              <h2>{user.first_name} {user.last_name}</h2>
              <p className="text-secondary">{user.email}</p>

              {/* Кнопка загрузки — скрытый input[type=file] в дизайн-стиле Secondary Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                hidden
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Загрузка…' : user.avatar_url ? 'Сменить фото' : 'Загрузить фото'}
              </button>
              <p className="form-hint">JPEG, PNG или WebP, до 5 МБ</p>
              {error && <p className="field-error">{error}</p>}
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
    </AppLayout>
  )
}
