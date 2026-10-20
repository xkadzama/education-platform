import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'      // дизайн-токены из docs/design-system.md
import './styles/components.css'  // глобальные стили + компоненты
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
