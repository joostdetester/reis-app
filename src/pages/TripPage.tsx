import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTripDays } from '../hooks/useTripDays'
import { useTransportItems } from '../hooks/useTransportItems'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTripDayAccommodations } from '../hooks/useTripDayAccommodations'
import { useDestinations } from '../hooks/useDestinations'
import { DayCard } from '../components/DayCard'
import { dayPartOf, fmtLocalDateTime, guessTimeZone, shortDate, subtractHours, todayIndex, tripPhase } from '../utils/dates'
import { matchesQuery } from '../utils/search'
import { buildDayAccommodationMap, type DayAccommodationInfo } from '../utils/dayAccommodations'
import type { Destination, TransportItem, TripDay } from '../types/trip'

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
  const [searchParams] = useSearchParams()
  const targetDate = searchParams.get('day')
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!targetDate) return
    cardRefs.current.get(targetDate)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [targetDate])

  // Standaard: vóór de reis de eerste dag open, tijdens de reis alleen vandaag,
  // na de reis alles dicht. Een expliciete ?day=... (vanuit Kalender) overstemt dit.
  const phase = tripPhase(days)
  const defaultOpenDate =
    phase === 'before' ? days[0]?.travel_date : phase === 'during' ? days[todayIndex(days)]?.travel_date : null
  const openDate = targetDate ?? defaultOpenDate

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
        <div key={d.id} ref={(el) => void (el ? cardRefs.current.set(d.travel_date, el) : cardRefs.current.delete(d.travel_date))}>
          <DayCard
            day={d}
            transportItems={transportItems}
            accommodationInfo={accommodationByDay.get(d.id)}
            collapsed={d.travel_date !== openDate}
            showMapLink={false}
            showActivityLink
          />
        </div>
      ))}
    </>
  )
}

/** De vlucht die het eiland verlaat: de eerste vervoersregel op de dag ná de laatste dag van dit eiland. */
function findDepartureFlight(
  islandDays: TripDay[],
  allDays: TripDay[],
  transportItems: TransportItem[],
): TransportItem | null {
  const lastDay = islandDays[islandDays.length - 1]
  const nextDay = allDays.find((d) => d.sort_order === lastDay.sort_order + 1)
  if (!nextDay) return null
  return transportItems.find((t) => t.trip_day_id === nextDay.id && t.departure_time) ?? null
}

function LastDiveNotice({ flight }: { flight: TransportItem }) {
  if (!flight.departure_time) return null
  const lastDiveMoment = subtractHours(flight.departure_time, 18)
  const zone = guessTimeZone(flight.origin)
  const part = dayPartOf(lastDiveMoment, zone)

  return (
    <p className="notice" style={{ marginTop: 10 }}>
      🤿 Laatste duik: {fmtLocalDateTime(lastDiveMoment.toISOString(), flight.origin)} ({part}) — minimaal 18 uur
      voor de vlucht{flight.booking_reference ? ` (${flight.booking_reference})` : ''}
    </p>
  )
}

function DestinationsView({
  days,
  destinations,
  transportItems,
}: {
  days: TripDay[]
  destinations: Destination[]
  transportItems: TransportItem[]
}) {
  const groups = new Map<string, TripDay[]>()
  for (const day of days) {
    const list = groups.get(day.island) ?? []
    list.push(day)
    groups.set(day.island, list)
  }
  const destinationByName = new Map(destinations.map((d) => [d.name, d]))

  return (
    <div className="grid">
      {[...groups.entries()].map(([island, items]) => {
        const activities = items
          .flatMap((d) => [d.morning_text, d.afternoon_text, d.evening_text])
          .filter((v): v is string => Boolean(v))
          .slice(0, 6)
        const diveShops = destinationByName.get(island)?.dive_shops
        const departureFlight = diveShops && diveShops.length > 0 ? findDepartureFlight(items, days, transportItems) : null

        return (
          <div className="list-card" key={island}>
            <h3>{island}</h3>
            <div className="muted">
              {shortDate(items[0].travel_date)} – {shortDate(items[items.length - 1].travel_date)}
            </div>
            <p>
              <b>Activiteiten:</b> {activities.length > 0 ? activities.join(', ') : '-'}
            </p>
            {diveShops && diveShops.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="kicker">🤿 Duikbedrijven (PADI)</div>
                {diveShops.map((shop) => (
                  <div key={shop.name} style={{ marginTop: 8 }}>
                    <a href={shop.url} target="_blank" rel="noreferrer">
                      <b>{shop.name}</b>
                    </a>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {shop.distance_from_hotel} · {shop.price_indication}
                    </div>
                  </div>
                ))}
                {departureFlight && <LastDiveNotice flight={departureFlight} />}
              </div>
            )}
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
        <Link key={d.id} to={`/trip?view=timeline&day=${d.travel_date}`}>
          <b>{shortDate(d.travel_date)}</b>
          {d.location.split('→')[0]}
        </Link>
      ))}
    </div>
  )
}

export function TripPage() {
  const { days, loading, error } = useTripDays()
  const { transportItems } = useTransportItems()
  const { accommodations } = useAccommodations()
  const { links } = useTripDayAccommodations()
  const { destinations } = useDestinations()
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
      {view === 'destinations' && (
        <DestinationsView days={days} destinations={destinations} transportItems={transportItems} />
      )}
      {view === 'calendar' && <CalendarView days={days} />}
    </>
  )
}
