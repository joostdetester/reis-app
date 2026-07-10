import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { TransportItem, TripDay } from '../types/trip'
import { fmtDate, fmtDateTime } from '../utils/dates'
import { EditSheet } from './EditSheet'
import { FieldRow } from './FieldRow'
import { saveEdit } from '../lib/saveEdit'

type PartField = 'morning_text' | 'afternoon_text' | 'evening_text'

const PART_LABELS: Record<PartField, string> = {
  morning_text: 'Ochtend',
  afternoon_text: 'Middag',
  evening_text: 'Avond',
}

interface DayCardProps {
  day: TripDay
  transportItems?: TransportItem[]
  collapsed?: boolean
}

function TransportRow({ item }: { item: TransportItem }) {
  const summary = [item.type, item.carrier, item.booking_reference].filter(Boolean).join(' · ')
  const route = [item.origin, item.destination].filter(Boolean).join(' → ')

  return (
    <Link className="row" to="/transport">
      <div>🚐</div>
      <div>
        <div className="kicker">Vervoer</div>
        <div className="value">{summary || item.type}</div>
        {(route || item.departure_time) && (
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {route}
            {item.departure_time ? ` · ${fmtDateTime(item.departure_time)}` : ''}
          </div>
        )}
      </div>
      <span>›</span>
    </Link>
  )
}

export function DayCard({ day, transportItems = [], collapsed = false }: DayCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [editingPart, setEditingPart] = useState<PartField | null>(null)

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.location + ' Philippines')}`
  const dayTransport = transportItems.filter((t) => t.trip_day_id === day.id)

  async function handleSavePart(field: PartField, value: string) {
    await saveEdit('trip_days', day.id, { [field]: value || null })
    setEditingPart(null)
  }

  return (
    <article className={`day-card ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="day-head" onClick={() => setIsCollapsed((c) => !c)}>
        <div>
          <div className="day-title">{day.location}</div>
          <div className="day-date">{fmtDate(day.travel_date)}</div>
        </div>
        <span className={`badge ${day.day_type}`}>{day.day_type}</span>
      </div>
      <div className="day-body">
        {dayTransport.map((item) => (
          <TransportRow key={item.id} item={item} />
        ))}
        <div className="parts">
          {(['morning_text', 'afternoon_text', 'evening_text'] as const).map((field) => (
            <div className="part" key={field}>
              <div className="kicker">{PART_LABELS[field]}</div>
              <b>{day[field] ?? 'Nog in te vullen'}</b>
              <button className="edit" onClick={() => setEditingPart(field)}>
                Bewerk
              </button>
            </div>
          ))}
        </div>
        <FieldRow icon="📝" label="Notitie" value={day.notes} table="trip_days" id={day.id} field="notes" placeholder="Geen notitie" />
        <a className="map-link" href={mapsUrl} target="_blank" rel="noreferrer">
          <span>📍 Open locatie in Google Maps</span>
          <span>›</span>
        </a>
      </div>

      {editingPart && (
        <EditSheet
          label={PART_LABELS[editingPart]}
          value={day[editingPart] ?? ''}
          onCancel={() => setEditingPart(null)}
          onSave={(value) => handleSavePart(editingPart, value)}
        />
      )}
    </article>
  )
}
