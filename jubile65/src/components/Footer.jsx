export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="container">
        © {year} FPMA Paris — Jubilé 65 • <a href="#">Mentions légales</a>
      </div>
    </footer>
  )
}
