import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTripDays } from '../hooks/useTripDays'
import { useTransportItems } from '../hooks/useTransportItems'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTripDayAccommodations } from '../hooks/useTripDayAccommodations'
import { DayCard } from '../components/DayCard'
import { shortDate, todayIndex } from '../utils/dates'
import { matchesQuery } from '../utils/search'
import { buildDayAccommodationMap, type DayAccommodationInfo } from '../utils/dayAccommodations'
import type { TransportItem, TripDay } from '../types/trip'

type TripView = 'timeline' | 'destinations' | 'calendar'

const VIEWS: { id: TripView; label: string }[] = [
  { id: 'timeline', label: 'Tijdlijn' },
  { id: 'destinations', label: 'Bestemmingen' },
  { id: 'calendar', label: 'Kalender' },
]

function Toolbar({ view, onChange }: { view: TripView; onChange: (v: TripView) => void }) {
  return (
    <div className="toolbar">
      {VIEWS.map((v) => (
        <button key={v.id} className={`chip ${view === v.id ? 'active' : ''}`} onClick={() => onChange(v.id)}>
          {v.label}
        </button>
      ))}
    </div>
  )
}

function TimelineView({
  days,
  transportItems,
  accommodationByDay,
}: {
  days: TripDay[]
  transportItems: TransportItem[]
  accommodationByDay: Map<string, DayAccommodationInfo>
}) {
  const [search, setSearch] = useState('')
  const i = todayIndex(days)
  const filtered = days.filter((d) => matchesQuery(d, search))

  return (
    <>
      <input
        className="search"
        placeholder="Zoek in alle reisgegevens…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filtered.map((d) => (
        <DayCard
          key={d.id}
          day={d}
          transportItems={transportItems}
          accommodationInfo={accommodationByDay.get(d.id)}
          collapsed={d.sort_order !== i && d.sort_order !== i + 1}
        />
      ))}
    </>
  )
}

function DestinationsView({ days }: { days: TripDay[] }) {
  const groups = new Map<string, TripDay[]>()
  for (const day of days) {
    const list = groups.get(day.island) ?? []
    list.push(day)
    groups.set(day.island, list)
  }

  return (
    <div className="grid">
      {[...groups.entries()].map(([island, items]) => {
        const activities = items
          .flatMap((d) => [d.morning_text, d.afternoon_text, d.evening_text])
          .filter((v): v is string => Boolean(v))
          .slice(0, 6)

        return (
          <div className="list-card" key={island}>
            <h3>{island}</h3>
            <div className="muted">
              {shortDate(items[0].travel_date)} – {shortDate(items[items.length - 1].travel_date)}
            </div>
            <p>
              <b>Activiteiten:</b> {activities.length > 0 ? activities.join(', ') : '-'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function CalendarView({ days }: { days: TripDay[] }) {
  return (
    <div className="calendar-grid">
      {days.map((d) => (
        <div key={d.id}>
          <b>{shortDate(d.travel_date)}</b>
          {d.location.split('→')[0]}
        </div>
      ))}
    </div>
  )
}

export function TripPage() {
  const { days, loading, error } = useTripDays()
  const { transportItems } = useTransportItems()
  const { accommodations } = useAccommodations()
  const { links } = useTripDayAccommodations()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get('view') as TripView) || 'timeline'

  if (loading) return <div className="notice">Laden…</div>
  if (error) return <div className="notice">{error}</div>

  const accommodationByDay = buildDayAccommodationMap(days, links, accommodations)

  return (
    <>
      <Toolbar view={view} onChange={(v) => setSearchParams({ view: v })} />
      {view === 'timeline' && (
        <TimelineView days={days} transportItems={transportItems} accommodationByDay={accommodationByDay} />
      )}
      {view === 'destinations' && <DestinationsView days={days} />}
      {view === 'calendar' && <CalendarView days={days} />}
    </>
  )
}
