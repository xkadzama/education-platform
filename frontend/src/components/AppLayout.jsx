import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

// Каркас защищённых страниц: шапка сверху, сайдбар слева, контент справа.
export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-body container">
        <Sidebar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
