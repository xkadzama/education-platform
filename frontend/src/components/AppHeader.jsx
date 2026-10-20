import AvatarButton from './AvatarButton'

// Шапка защищённых страниц: справа — аватарка-меню (бренд убран по запросу)
export default function AppHeader() {
  return (
    <header className="app-header">
      {/* flex-контейнер лежит внутри .container — иначе grid-каркас «съедает» justify-content */}
      <div className="container">
        <div className="app-header-inner">
          {/* Логотип-бренд убран по запросу — в шапке остаётся только аватар */}
          <AvatarButton />
        </div>
      </div>
    </header>
  )
}
