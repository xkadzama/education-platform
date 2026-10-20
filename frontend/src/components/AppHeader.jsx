import { Link } from 'react-router-dom'
import AvatarButton from './AvatarButton'

// Шапка защищённых страниц: слева бренд, справа — аватарка-ссылка на профиль
export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="container app-header-inner">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          Xkadzama<span>.</span>
        </Link>
        <AvatarButton />
      </div>
    </header>
  )
}
