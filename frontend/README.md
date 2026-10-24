# Frontend

React 19 + Vite 8 + React Router 7. Стили — CSS custom properties из
`src/styles/tokens.css` (дизайн-система — `docs/design-system.md`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # oxlint
npm run build    # dist/
```

Vite проксирует `/auth`, `/api` и `/uploads` на backend
`http://localhost:8000` (см. `vite.config.js`). Полная инструкция запуска,
переменные окружения и API — в корневом [README.md](../README.md).
