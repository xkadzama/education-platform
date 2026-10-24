import axios from 'axios'
import { saveTokens, getTokens, clearTokens } from '../auth/tokenStorage'

// В dev запросы идут через прокси Vite (/auth -> http://localhost:8000).
// Для продакшена задайте VITE_API_URL в .env, например https://api.example.com
const BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({ baseURL: BASE_URL })

// --- Автоматически добавляем access-токен ко всем запросам -------------------
api.interceptors.request.use((config) => {
  const { accessToken } = getTokens()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// --- При 401 пытаемся один раз обновить токены и повторить запрос ------------
let refreshPromise = null

async function refreshTokens() {
  const { refreshToken } = getTokens()
  if (!refreshToken) throw new Error('No refresh token')
  // Параллельные 401 должны запускать только одно обновление
  refreshPromise ??= api
    .post('/auth/refresh', { refresh_token: refreshToken })
    .then((res) => {
      saveTokens(res.data)
      return res.data.access_token
    })
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const isAuthEndpoint =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/admin-login') ||
      original?.url?.includes('/auth/refresh')
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        const newAccessToken = await refreshTokens()
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return api(original) // повторяем исходный запрос с новым токеном
      } catch {
        clearTokens() // refresh не удался — выходим на страницу логина
        window.dispatchEvent(new Event('auth:logout'))
      }
    }
    return Promise.reject(error)
  },
)
