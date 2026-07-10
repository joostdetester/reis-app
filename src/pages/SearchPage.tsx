import { useState } from 'react'
import { useTripDays } from '../hooks/useTripDays'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTransportItems } from '../hooks/useTransportItems'
import { fmtDate } from '../utils/dates'

type TypeFilter = 'alles' | 'hotel' | 'vervoer' | 'activiteit'

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'alles', label: 'Alles' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'vervoer', label: 'Vervoer' },
  { id: 'activiteit', label: 'Activiteit' },
]

export function SearchPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<TypeFilter>('alles')
  const { days } = useTripDays()
  const { accommodations } = useAccommodations()
  const { transportItems } = useTransportItems()

  const q = search.toLowerCase()
  const dayById = new Map(days.map((d) => [d.id, d]))

  const dayResults =
    type === 'alles' || type === 'activiteit'
      ? days.filter((d) => JSON.stringify(d).toLowerCase().includes(q))
      : []
  const hotelResults =
    type === 'alles' || type === 'hotel'
      ? accommodations.filter((a) => JSON.stringify(a).toLowerCase().includes(q))
      : []
  const transportResults =
    type === 'alles' || type === 'vervoer'
      ? transportItems.filter((t) => JSON.stringify(t).toLowerCase().includes(q))
      : []

  return (
    <>
      <h2 className="section-title">Zoeken</h2>
      <input
        autoFocus
        className="search"
        placeholder="Zoek hotel, vlucht, activiteit…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="toolbar">
        {TYPE_FILTERS.map((f) => (
          <button key={f.id} className={`chip ${type === f.id ? 'active' : ''}`} onClick={() => setType(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        {dayResults.map((d) => (
          <div className="list-card" key={`day-${d.id}`}>
            <h3>{fmtDate(d.travel_date)}</h3>
            <div>{d.location}</div>
          </div>
        ))}
        {hotelResults.map((a) => (
          <div className="list-card" key={`hotel-${a.id}`}>
            <h3>{a.name}</h3>
            <div className="muted">Hotel</div>
          </div>
        ))}
        {transportResults.map((t) => {
          const day = dayById.get(t.trip_day_id)
          return (
            <div className="list-card" key={`transport-${t.id}`}>
              <h3>{t.type}</h3>
              <div className="muted">
                {day ? fmtDate(day.travel_date) : ''} {t.carrier ? `· ${t.carrier}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
