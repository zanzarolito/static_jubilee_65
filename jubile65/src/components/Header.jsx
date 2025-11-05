export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <div className="brand">
          <img src="/assets/logo.png" alt="FPMA Paris" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <span>FPMA Paris</span>
        </div>
        <nav className="nav">
          <a href="#events">Événements</a>
          <a href="#media">Photos et vidéos du jubilé</a>
        </nav>
      </div>
    </header>
  )
}
