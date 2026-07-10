import { useState } from 'react'
import type { TripDay } from '../types/trip'
import { fmtDate } from '../utils/dates'
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
  collapsed?: boolean
}

export function DayCard({ day, collapsed = false }: DayCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [editingPart, setEditingPart] = useState<PartField | null>(null)

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.location + ' Philippines')}`

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
