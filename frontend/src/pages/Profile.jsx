import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/AvatarButton'
// Стили списка профиля (.user-info) и подсказок (.auth-hint) живут в Auth.css —
// без этого импорта страница рендерилась «без оформления», из-за чего данные
// выглядели пропавшими.
import './Auth.css'

// «Мой профиль»: показываем только те данные, что реально есть в модели User / ответе /auth/me
export default function Profile() {
  const { user: ctxUser, updateUser } = useAuth()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  // Собственный снимок данных из БД: страница НЕ зависит от того, успел ли
  // AuthContext подхватить пользователя. Всегда запрашиваем /auth/me сами —
  // так данные отображаются гарантированно (и после прямого захода по URL
  // http://localhost:5173/profile с F5).
  const [me, setMe] = useState(ctxUser ?? null)
  const [fetchState, setFetchState] = useState('idle') // idle | loading | error

  useEffect(() => {
    let cancelled = false
    setFetchState('loading')
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return
        // Защита от «двойной обёртки»: если бэкенд/прокси вернули {data: {...}},
        // берём вложенный объект, иначе setMe({data:...}) дал бы пустые поля.
        const payload = res.data?.data && !('email' in res.data) && !('id' in res.data)
          ? res.data.data
          : res.data
        setMe(payload)
        updateUser(payload) // синхронизируем контекст (шапка/аватар тоже обновятся)
        setFetchState('idle')
      })
      .catch(() => !cancelled && setFetchState('error'))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Приоритет: свежий ответ /auth/me > пользователь из контекста.
  // НОРМАЛИЗАЦИЯ: бэкенд (pydantic UserResponse) может возвращать поля с
  // другими именами (firstName, fullName и т.п.) или null — раньше из-за этого
  // JSON в DevTools приходил, а страница оставалась «пустой»: JSX читал
  // displayUser.first_name, которого в ответе нет. Приводим любые варианты
  // к единой форме и заменяем null на ''.
  const normalize = (u) => {
    if (!u) return null
    const full = String(u.full_name ?? u.fullName ?? '').trim()
    return {
      ...u,
      first_name: String(u.first_name ?? u.firstName ?? (full.split(/\s+/)[0] ?? '')).trim(),
      last_name: String(u.last_name ?? u.lastName ?? (full.split(/\s+/)[1] ?? '')).trim(),
      email: String(u.email ?? ''),
      role: String(u.role ?? ''),
      avatar_url: u.avatar_url ?? u.avatarUrl ?? null,
    }
  }
  const displayUser = { first_name: '', last_name: '', email: '', role: '', ...(normalize(me || ctxUser) || {}) }

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

  // Ровно те поля, которые возвращает бэкенд (UserResponse).
  // Если поле пришло пустым/null — показываем «—», чтобы строка была видна.
  const rows = [
    { label: 'Имя', value: displayUser.first_name || '—' },
    { label: 'Фамилия', value: displayUser.last_name || '—' },
    { label: 'Email', value: displayUser.email || '—' },
    { label: 'Роль', value: displayUser.role || '—' },
  ]

  return (
          <div className="page">
        <div className="page-narrow">
        {/* Возврат на главную */}
        <Link to="/" className="back-link">← На главную</Link>

        <h1 className="page-title">Мой профиль</h1>

        {fetchState === 'loading' && (
          <p className="text-secondary" role="status">Загружаем данные профиля…</p>
        )}
        {fetchState === 'error' && (
          <p className="field-error" role="alert">
            Не удалось получить данные из БД: сервер вернул ошибку. Проверьте, что backend
            запущен на :8000 и токен валиден, затем обновите страницу.
          </p>
        )}

        <section className="card card-wide">
          {/* Индикатор сырого ответа: если бэкенд вернул поля с именами,
              которых фронт не ждёт (например {name: ...} вместо first_name),
              страница НЕ будет выглядеть пустой — увидим реальные ключи. */}
          {me && !displayUser.first_name && !displayUser.email && (
            <p className="field-error" role="alert">
              Бэкенд вернул неизвестный формат пользователя: {JSON.stringify(me)}
            </p>
          )}
          {/* Аватар: реальное фото, если загружено, иначе инициалы */}
          <div className="profile-header">
            <Avatar user={displayUser} size="lg" />
            <div>
              <h2>{displayUser.first_name} {displayUser.last_name}</h2>
              <p className="text-secondary">{displayUser.email}</p>

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
                {uploading ? 'Загрузка…' : displayUser.avatar_url ? 'Сменить фото' : 'Загрузить фото'}
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
      )
}
