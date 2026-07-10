import { useState } from 'react'
import { useTransportItems } from '../hooks/useTransportItems'
import { useTripDays } from '../hooks/useTripDays'
import { FieldRow } from '../components/FieldRow'
import { EditSheet } from '../components/EditSheet'
import { saveEdit } from '../lib/saveEdit'
import { fmtDate, fmtDateTime, hoursUntil } from '../utils/dates'
import type { TransportItem } from '../types/trip'

function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function DelayField({ item }: { item: TransportItem }) {
  const [editing, setEditing] = useState(false)

  async function handleSave(value: string) {
    const trimmed = value.trim()
    const minutes = trimmed === '' ? null : parseInt(trimmed, 10)
    await saveEdit('transport_items', item.id, { delay_minutes: Number.isFinite(minutes) ? minutes : null })
    setEditing(false)
  }

  return (
    <div className="row">
      <div>⏱️</div>
      <div>
        <div className="kicker">Vertraging</div>
        <div className="value">{item.delay_minutes ? `${item.delay_minutes} minuten` : 'Geen bekende vertraging'}</div>
      </div>
      <button className="edit" onClick={() => setEditing(true)}>
        Bewerk
      </button>
      {editing && (
        <EditSheet
          label="Vertraging in minuten"
          value={item.delay_minutes != null ? String(item.delay_minutes) : ''}
          onCancel={() => setEditing(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

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
              {Boolean(item.delay_minutes) && (
                <div className="notice">⚠️ Vertraging: {item.delay_minutes} minuten</div>
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
              {item.origin && (
                <a target="_blank" rel="noreferrer" href={mapsSearchUrl(item.origin)}>
                  Vertreklocatie op Google Maps
                </a>
              )}
              <FieldRow icon="📍" label="Aankomstlocatie" value={item.destination} table="transport_items" id={item.id} field="destination" />
              {item.destination && (
                <a target="_blank" rel="noreferrer" href={mapsSearchUrl(item.destination)}>
                  Aankomstlocatie op Google Maps
                </a>
              )}
              <FieldRow icon="🚪" label="Vertrekterminal" value={item.departure_terminal} table="transport_items" id={item.id} field="departure_terminal" />
              <FieldRow icon="🎫" label="Gate" value={item.departure_gate} table="transport_items" id={item.id} field="departure_gate" />
              <FieldRow icon="🚪" label="Aankomstterminal" value={item.arrival_terminal} table="transport_items" id={item.id} field="arrival_terminal" />
              <DelayField item={item} />
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
