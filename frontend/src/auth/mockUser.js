// Демо-режим (DEV ONLY): бэкенд FastAPI + PostgreSQL недоступен в этой среде,
// поэтому AuthContext подставляет mock-пользователя и разрешает вход с любым
// email/паролем. Файлы src/data/*.js — временные заглушки до подключения API.
export const mockUser = {
  id: 1,
  email: 'demo@xkadzama.dev',
  first_name: 'Демо',
  last_name: 'Пользователь',
  role: 'student',
  // Путь берём от '/' — при загрузке с origin vite (5199) попадёт в public/,
  // а при проксировании /uploads на backend — в backend/uploads/.
  avatar_url: '/uploads/avatar-demo.svg',
}

export const mockTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
}
