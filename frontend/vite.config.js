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
      // API уроков: GET /api/lessons и /api/lessons/:slug.
      // Отдельный префикс нужен, чтобы не конфликтовать с SPA-маршрутами
      // /lessons и /lessons/:slug (оба отдаёт Vite).
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // PDF-презентации уроков: /uploads/presentations/<file>.pdf
      // (отдаются тем же /uploads, что и аватары)
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
