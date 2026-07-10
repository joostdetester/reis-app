import { useTransportItems } from '../hooks/useTransportItems'
import { useTripDays } from '../hooks/useTripDays'
import { FieldRow } from '../components/FieldRow'
import { fmtDate, fmtDateTime, hoursUntil } from '../utils/dates'

export function TransportPage() {
  const { transportItems, loading: loadingItems, error: errorItems } = useTransportItems()
  const { days, loading: loadingDays, error: errorDays } = useTripDays()

  if (loadingItems || loadingDays) return <div className="notice">Laden…</div>
  const error = errorItems || errorDays
  if (error) return <div className="notice">{error}</div>

  const dayById = new Map(days.map((d) => [d.id, d]))
  const sorted = [...transportItems].sort((a, b) => {
    const dayA = dayById.get(a.trip_day_id)?.sort_order ?? 0
    const dayB = dayById.get(b.trip_day_id)?.sort_order ?? 0
    return dayA - dayB
  })

  return (
    <>
      <h2 className="section-title">Vervoer</h2>
      <div className="grid">
        {sorted.map((item) => {
          const day = dayById.get(item.trip_day_id)
          const untilDeparture = item.departure_time ? hoursUntil(item.departure_time) : null

          return (
            <div className="list-card" key={item.id}>
              <h3>{day ? fmtDate(day.travel_date) : '-'}</h3>
              <div>{day?.location}</div>
              <p>
                <b>{item.type}</b>
                {item.carrier ? ` · ${item.carrier}` : ''}
              </p>
              {untilDeparture !== null && untilDeparture <= 24 && (
                <div className="notice">Vertrekt over {untilDeparture} uur</div>
              )}
              {(item.origin || item.destination) && (
                <p className="muted">
                  {item.origin ?? '-'} → {item.destination ?? '-'}
                </p>
              )}
              {(item.departure_time || item.arrival_time) && (
                <p className="muted">
                  {item.departure_time ? fmtDateTime(item.departure_time) : '-'}
                  {' → '}
                  {item.arrival_time ? fmtDateTime(item.arrival_time) : '-'}
                </p>
              )}
              <FieldRow icon="🔖" label="Boekingsnummer" value={item.booking_reference} table="transport_items" id={item.id} field="booking_reference" />
              <FieldRow icon="🚌" label="Vervoerder" value={item.carrier} table="transport_items" id={item.id} field="carrier" />
              <FieldRow icon="📍" label="Vertreklocatie" value={item.origin} table="transport_items" id={item.id} field="origin" />
              <FieldRow icon="📍" label="Aankomstlocatie" value={item.destination} table="transport_items" id={item.id} field="destination" />
              {item.maps_url && (
                <a target="_blank" rel="noreferrer" href={item.maps_url}>
                  Open route in Google Maps
                </a>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
