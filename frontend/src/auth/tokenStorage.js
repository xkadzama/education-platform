// Простое хранилище токенов. Для большей безопасности вместо localStorage
// можно держать access-токен только в памяти JS, а refresh — в httpOnly-cookie.
const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export function saveTokens({ access_token, refresh_token }) {
  localStorage.setItem(ACCESS_KEY, access_token)
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token)
}

export function getTokens() {
  return {
    accessToken: localStorage.getItem(ACCESS_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
