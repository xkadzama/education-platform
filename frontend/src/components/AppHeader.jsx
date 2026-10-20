import { Link } from 'react-router-dom'
import AvatarButton from './AvatarButton'

// Шапка защищённых страниц: слева бренд, справа — аватарка-ссылка на профиль
export default function AppHeader() {
  return (
    <header className="app-header">
      {/* flex-контейнер лежит внутри .container — иначе grid-каркас «съедает» justify-content */}
      <div className="container">
        <div className="app-header-inner">
          <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
            Xkadzama<span>.</span>
          </Link>
          <AvatarButton />
        </div>
      </div>
    </header>
  )
}
