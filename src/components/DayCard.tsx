import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { TransportItem, TripDay } from '../types/trip'
import type { DayAccommodationInfo } from '../utils/dayAccommodations'
import { fmtDate, fmtLocalDateTime, fmtPhilippineTime } from '../utils/dates'
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
  accommodationInfo?: DayAccommodationInfo
  collapsed?: boolean
  showMapLink?: boolean
  lastDiveNotice?: string
}

/** Vertrektijd in lokale tijd vertrekland, met de aankomsttijd (lokale tijd aankomstland) erachter tussen haakjes. */
function formatFlightTimes(item: TransportItem): string | null {
  const departure = item.departure_time ? fmtLocalDateTime(item.departure_time, item.origin) : null
  const arrival = item.arrival_time ? fmtLocalDateTime(item.arrival_time, item.destination) : null
  if (departure && arrival) return `${departure} (${arrival})`
  return departure ?? arrival
}

function TransportLine({ item }: { item: TransportItem }) {
  const summary = [item.type, item.carrier, item.booking_reference].filter(Boolean).join(' · ')
  const route = [item.origin, item.destination].filter(Boolean).join(' → ')
  const times = formatFlightTimes(item)

  return (
    <Link className="day-transport" to="/transport" onClick={(e) => e.stopPropagation()}>
      🚐 {[summary || item.type, route, times].filter(Boolean).join(' · ')}
    </Link>
  )
}

function HotelLine({ info }: { info: DayAccommodationInfo }) {
  const { accommodation, isCheckIn, isCheckOut } = info
  const parts = [accommodation.name]
  if (isCheckIn && accommodation.check_in) parts.push(`inchecken ${fmtPhilippineTime(accommodation.check_in)}`)
  if (isCheckOut && accommodation.check_out) parts.push(`uitchecken ${fmtPhilippineTime(accommodation.check_out)}`)

  return (
    <Link className="day-hotel" to="/hotels" onClick={(e) => e.stopPropagation()}>
      🏨 {parts.join(' · ')}
    </Link>
  )
}

export function DayCard({
  day,
  transportItems = [],
  accommodationInfo,
  collapsed = false,
  showMapLink = true,
  lastDiveNotice,
}: DayCardProps) {
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
          {accommodationInfo && <HotelLine info={accommodationInfo} />}
          {dayTransport.map((item) => (
            <TransportLine key={item.id} item={item} />
          ))}
          {lastDiveNotice && <div className="day-notice">{lastDiveNotice}</div>}
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
        {showMapLink && (
          <a className="map-link" href={mapsUrl} target="_blank" rel="noreferrer">
            <span>📍 Open locatie in Google Maps</span>
            <span>›</span>
          </a>
        )}
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
