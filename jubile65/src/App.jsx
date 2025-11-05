import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Events from './components/Events.jsx'
import Carousel from './components/Carousel.jsx'
import Gallery from './components/Gallery.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <section id="events" className="section">
          <div className="container">
            <h3>Événements à venir</h3>
            <Events />
          </div>
        </section>

        <section className="section section--blue">
          <div className="container">
            <h3>Retrouvez nos moments de partage</h3>
            <Carousel />
          </div>
        </section>

        <section id="media" className="section">
          <div className="container">
            <h3>Photos et vidéos</h3>
            <Gallery />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
