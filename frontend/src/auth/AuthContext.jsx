import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'
import { saveTokens, getTokens, clearTokens } from './tokenStorage'
import { mockUser, mockTokens } from './mockUser'

// Демо-режим включается ТОЛЬКО по явному флагу VITE_DEMO_MODE=true (файл
// frontend/.env.local) — например, когда бэкенда нет под рукой. По умолчанию
// работает живая интеграция: ответ сервера есть — берём данные из него;
// 401/иные ошибки — штатный выход на /login.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Пока не проверим токен на сервере — показываем «загрузку», чтобы не мигала страница логина
  const [loading, setLoading] = useState(Boolean(getTokens().accessToken))

  // При старте приложения проверяем сохранённый access-токен через /auth/me
  useEffect(() => {
    if (!getTokens().accessToken) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch((err) => {
        // Демо-режим (включён явно): бэкенд не ответил — подставляем mock.
        if (DEMO_MODE && !err.response) {
          saveTokens(mockTokens)
          setUser(mockUser)
        } else {
          // Живая интеграция: токен не прошёл проверку сервера — выходим.
          clearTokens()
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // Событие из axios-интерцептора: refresh-токен недействителен — принудительный выход
  useEffect(() => {
    const onForcedLogout = () => {
      setUser(null)
      clearTokens()
    }
    window.addEventListener('auth:logout', onForcedLogout)
    return () => window.removeEventListener('auth:logout', onForcedLogout)
  }, [])

  // Логин: POST /auth/login ждёт form-data (username = email, password)
  const login = useCallback(async (email, password) => {
    const form = new FormData()
    form.append('username', email)
    form.append('password', password)

    try {
      const res = await api.post('/auth/login', form)
      saveTokens(res.data)
      const me = await api.get('/auth/me')
      setUser(me.data)
      return me.data
    } catch (err) {
      // Демо-режим без бэкенда: вход разрешаем с любой парой email/пароль
      if (DEMO_MODE && !err.response) {
        saveTokens(mockTokens)
        setUser({ ...mockUser, first_name: email.split('@')[0] || mockUser.first_name })
        return mockUser
      }
      throw err
    }
  }, [])

  // Вход в админку: отдельный endpoint, который пускает только superuser
  const adminLogin = useCallback(async (email, password) => {
    const form = new FormData()
    form.append('username', email.trim())
    form.append('password', password)

    const res = await api.post('/auth/admin-login', form)
    saveTokens(res.data)
    try {
      const me = await api.get('/auth/me')
      setUser(me.data)
      return me.data
    } catch (err) {
      clearTokens()
      setUser(null)
      throw err
    }
  }, [])

  // Регистрация: POST /auth/register принимает JSON
  const register = useCallback(async (data) => {
    try {
      await api.post('/auth/register', data)
    } catch (err) {
      // Демо-режим без бэкенда: «регистрируем» локально и сразу входим
      if (!(DEMO_MODE && !err.response)) throw err
    }
    // После регистрации сразу входим, чтобы пользователь попал в приложение
    return login(data.email, data.password)
  }, [login])

  const logout = useCallback(() => {
    setUser(null)
    clearTokens()
  }, [])

  // Обновляет пользователя в контексте (например, после загрузки аватара),
  // чтобы фото сразу появилось и в шапке, и в профиле
  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
