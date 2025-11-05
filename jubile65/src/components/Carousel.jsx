import { useState } from 'react'
import { moments } from '../data/events.js'

export default function Carousel() {
  const [index, setIndex] = useState(0)
  const visible = 2 // cartes visibles desktop

  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(moments.length - visible, i + 1))

  return (
    <div className="carousel">
      <div className="track" style={{ transform: `translateX(calc(${-index} * (100% / ${visible}) + ${-index * 18}px))` }}>
        {moments.map(m => (
          <div className="slide" key={m.id}>
            <img src={m.image} alt={m.caption} />
            <div className="cap">{m.caption}</div>
          </div>
        ))}
      </div>
      <div className="ctrl">
        <button className="btn prev" onClick={prev} aria-label="Précédent">‹</button>
        <button className="btn next" onClick={next} aria-label="Suivant">›</button>
      </div>
    </div>
  )
}
