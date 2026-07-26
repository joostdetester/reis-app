import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TransportItem, TripDay } from '../types/trip'
import type { DayAccommodationInfo } from '../utils/dayAccommodations'
import { fmtDate, formatDurationHM, formatFlightTimes, fmtPhilippineTime } from '../utils/dates'
import { isFlight } from '../utils/transport'
import { DayWeather } from './DayWeather'
import { EditButton } from './EditButton'
import { EditSheet } from './EditSheet'
import { FieldRow } from './FieldRow'
import { FormattedText } from './FormattedText'
import { saveEdit } from '../lib/saveEdit'

type PartField = 'morning_text' | 'afternoon_text' | 'evening_text'

const PART_LABELS: Record<PartField, string> = {
  morning_text: 'Ochtend',
  afternoon_text: 'Middag',
  evening_text: 'Avond',
}

interface DayCardProps {
  day: TripDay
  dayNumber: number
  totalDays: number
  transportItems?: TransportItem[]
  accommodationInfo?: DayAccommodationInfo
  collapsed?: boolean
  showMapLink?: boolean
  lastDiveNotice?: string
}

function TransportLine({ item }: { item: TransportItem }) {
  const summary = [item.type, item.carrier, item.booking_reference].filter(Boolean).join(' · ')
  const route = [item.origin, item.destination].filter(Boolean).join(' → ')
  const times = formatFlightTimes(item.departure_time, item.arrival_time, item.origin, item.destination)
  const duration =
    item.departure_time && item.arrival_time ? formatDurationHM(item.departure_time, item.arrival_time) : null
  const timesWithDuration = times && duration ? `${times} - vluchtduur: ${duration}` : times
  const icon = isFlight(item) ? '✈️' : '🚐'
  const text = `${icon} ${[summary || item.type, route, timesWithDuration].filter(Boolean).join(' · ')}`

  if (isFlight(item)) {
    return (
      <Link
        className="day-transport"
        to={`/transport?item=${item.id}`}
        data-testid={`day-card-transport-${item.id}`}
      >
        {text}
      </Link>
    )
  }

  return (
    <div className="day-transport" data-testid={`day-card-transport-${item.id}`}>
      {text}
    </div>
  )
}

function HotelLine({ info }: { info: DayAccommodationInfo }) {
  const { accommodation, isCheckIn, isCheckOut } = info
  const parts = [accommodation.name]
  if (isCheckIn && accommodation.check_in) parts.push(`inchecken ${fmtPhilippineTime(accommodation.check_in)}`)
  if (isCheckOut && accommodation.check_out) parts.push(`uitchecken ${fmtPhilippineTime(accommodation.check_out)}`)

  return (
    <Link className="day-hotel" to={`/hotels?item=${accommodation.id}`} data-testid="day-card-hotel">
      🏨 {parts.join(' · ')}
    </Link>
  )
}

export function DayCard({
  day,
  dayNumber,
  totalDays,
  transportItems = [],
  accommodationInfo,
  collapsed = false,
  showMapLink = true,
  lastDiveNotice,
}: DayCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [editingPart, setEditingPart] = useState<PartField | null>(null)

  // `collapsed` bepaalt hier niet alleen de startstand: als de tijdlijn bv. door een
  // zoekopdracht alle kaarten openklapt, moet een al gemonteerde kaart daar wel op reageren.
  useEffect(() => {
    setIsCollapsed(collapsed)
  }, [collapsed])

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.location + ' Philippines')}`
  const dayTransport = transportItems.filter((t) => t.trip_day_id === day.id)

  async function handleSavePart(field: PartField, value: string) {
    await saveEdit('trip_days', day.id, { [field]: value || null })
    setEditingPart(null)
  }

  return (
    <article className={`day-card ${isCollapsed ? 'collapsed' : ''}`} data-testid={`day-card-${day.id}`}>
      <div className="day-head" data-testid={`day-card-${day.id}-head`}>
        <div className="day-head-content">
          <button
            type="button"
            className="day-head-toggle"
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed((c) => !c)}
          >
            <div className="day-title-row">
              <div className="day-title" data-testid={`day-card-${day.id}-location`}>
                {day.location}
              </div>
              <span className="day-vacation-day" data-testid={`day-card-${day.id}-vacation-day`}>
                Dag {dayNumber} van {totalDays}
              </span>
            </div>
            <div className="day-date" data-testid={`day-card-${day.id}-date`}>
              {fmtDate(day.travel_date)}
            </div>
            <DayWeather location={day.location} date={day.travel_date} />
          </button>
          {accommodationInfo && <HotelLine info={accommodationInfo} />}
          {dayTransport.map((item) => (
            <TransportLine key={item.id} item={item} />
          ))}
          {lastDiveNotice && <div className="day-notice">{lastDiveNotice}</div>}
        </div>
        <span className={`badge ${day.day_type}`} data-testid={`day-card-${day.id}-badge`}>
          {day.day_type}
        </span>
      </div>
      <div className="day-body">
        <div className="parts">
          {(['morning_text', 'afternoon_text', 'evening_text'] as const).map((field) => (
            <div className="part" key={field} data-testid={`day-part-${field}-${day.id}`}>
              <div className="kicker">{PART_LABELS[field]}</div>
              <div className="part-value" data-testid={`day-part-${field}-${day.id}-value`}>
                <FormattedText text={day[field] ?? 'Nog in te vullen'} />
              </div>
              <EditButton onClick={() => setEditingPart(field)} testId={`day-part-${field}-${day.id}-edit`} />
            </div>
          ))}
        </div>
        <FieldRow icon="📝" label="Notitie" value={day.notes} table="trip_days" id={day.id} field="notes" placeholder="Geen notitie" />
        {showMapLink && (
          <a
            className="map-link"
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            data-testid={`day-card-${day.id}-map-link`}
          >
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
          testId={`day-part-${editingPart}-${day.id}-sheet`}
        />
      )}
    </article>
  )
}
