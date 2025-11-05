import { events } from '../data/events.js'

export default function Events() {
  return (
    <div className="events-list">
      {events.map(ev => (
        <article key={ev.id} className="event">
          <img src={ev.image} alt={ev.title} />
          <div>
            <h4>{ev.title}</h4>
            <div className="meta">{ev.date}</div>
            <p>{ev.desc}</p>
            <div className="addr"><span className="pin"></span>{ev.address}</div>
          </div>
        </article>
      ))}
    </div>
  )
}
