import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Проксируем /auth на FastAPI — фронт обращается к относительным путям,
    // и CORS-проблемы при разработке не возникает вовсе.
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Отдача загруженных фото профиля (app.mount('/uploads', ...) на бэкенде)
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
