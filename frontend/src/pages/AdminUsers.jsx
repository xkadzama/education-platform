import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

const PER_PAGE = 10

function extractError(err) {
  const status = err?.response?.status
  if (status === 403) return 'Нет прав суперпользователя.'
  if (status === 401) return 'Сессия истекла — войдите в админку заново.'
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg || 'Ошибка запроса'
  return detail || err?.message || 'Не удалось загрузить пользователей'
}

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [status, setStatus] = useState('loading') // loading | idle | error
  const [error, setError] = useState('')
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    per_page: PER_PAGE,
    pages: 0,
  })

  const isFirstRender = useRef(true)

  // Поиск с задержкой: не дёргаем API на каждый символ. reloadKey гарантирует
  // запрос даже если trim() не изменился (например, добавили пробел в конце).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return undefined
    }

    const timer = setTimeout(() => {
      setStatus('loading')
      setError('')
      setDebouncedSearch(search.trim())
      setPage(1)
      setReloadKey((key) => key + 1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false

    api
      .get('/api/admin/users', {
        params: {
          search: debouncedSearch,
          page,
          per_page: PER_PAGE,
        },
      })
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setStatus('idle')
      })
      .catch((err) => {
        if (cancelled) return
        setError(extractError(err))
        setStatus('error')
      })

    return () => { cancelled = true }
  }, [debouncedSearch, page, reloadKey])

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > data.pages || nextPage === page) return
    setStatus('loading')
    setError('')
    setPage(nextPage)
  }

  const retry = () => {
    setStatus('loading')
    setError('')
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="page">
      <div className="page-narrow admin-users-page">
        <h1 className="page-title">Пользователи</h1>
        <p className="text-secondary">
          Все зарегистрированные пользователи. Поиск — по фамилии и имени,
          без учёта регистра.
        </p>

        <input
          type="search"
          className="input admin-users-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по фамилии и имени"
          aria-label="Поиск по фамилии и имени"
        />

        {status === 'loading' && (
          <p className="text-secondary" role="status">Загружаем пользователей…</p>
        )}

        {status === 'error' && (
          <>
            <p className="field-error" role="alert">{error}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
              Повторить
            </button>
          </>
        )}

        {status === 'idle' && data.items.length === 0 && (
          <p className="text-secondary">
            {debouncedSearch ? 'Пользователи не найдены.' : 'Пользователей пока нет.'}
          </p>
        )}

        {status === 'idle' && data.items.length > 0 && (
          <>
            <ul className="admin-user-list">
              {data.items.map((user) => (
                <li key={user.id} className="admin-user-row">
                  <span className="admin-user-name">
                    {user.last_name} {user.first_name}
                  </span>
                  <span className="admin-user-role">{user.role}</span>
                  <span
                    className={`admin-user-status ${user.is_active ? 'is-active' : 'is-inactive'}`}
                    role="img"
                    aria-label={user.is_active ? 'Аккаунт активен' : 'Аккаунт деактивирован'}
                    title={user.is_active ? 'Аккаунт активен' : 'Аккаунт деактивирован'}
                  >
                    <span className="admin-user-status-dot" aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ul>

            {data.pages > 1 && (
              <nav className="admin-pagination" aria-label="Пагинация пользователей">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                >
                  ← Назад
                </button>

                <span className="admin-pagination-info">
                  Страница {data.page} из {data.pages} · всего {data.total}
                </span>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= data.pages}
                >
                  Вперёд →
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}
