import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTripDays } from '../hooks/useTripDays'
import { useTransportItems } from '../hooks/useTransportItems'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTripDayAccommodations } from '../hooks/useTripDayAccommodations'
import { useDestinations } from '../hooks/useDestinations'
import { DayCard } from '../components/DayCard'
import { shortDate, todayIndex, tripPhase } from '../utils/dates'
import { matchesQuery } from '../utils/search'
import { buildDayAccommodationMap, type DayAccommodationInfo } from '../utils/dayAccommodations'
import { computeLastDiveInfo } from '../utils/lastDive'
import type { Destination, TransportItem, TripDay } from '../types/trip'

// Bronvermelding voor de bestemmingsfoto's (CC BY-SA vereist credit + link naar de bron).
const PHOTO_CREDITS: Record<string, { text: string; url: string }> = {
  Palawan: {
    text: 'Foto: Marciano Villavito, Big Lagoon El Nido (CC BY-SA 4.0)',
    url: 'https://commons.wikimedia.org/wiki/File:Big_Lagoon_at_El_Nido,_Palawan,_Philippines.jpg',
  },
  Cebu: {
    text: 'Foto: Lindstrm, White Beach Moalboal (CC BY-SA 3.0)',
    url: 'https://commons.wikimedia.org/wiki/File:White_Beach_Moalboal.JPG',
  },
  Siargao: {
    text: 'Foto: Alsitjar, Cloud 9 (CC BY-SA 4.0)',
    url: 'https://commons.wikimedia.org/wiki/File:Cloud_9_Siargao_Island_Sunset.jpg',
  },
}

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
  lastDiveByDayId,
}: {
  days: TripDay[]
  transportItems: TransportItem[]
  accommodationByDay: Map<string, DayAccommodationInfo>
  lastDiveByDayId: Map<string, string>
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
            lastDiveNotice={lastDiveByDayId.get(d.id)}
          />
        </div>
      ))}
    </>
  )
}

function DestinationsView({
  days,
  destinations,
}: {
  days: TripDay[]
  destinations: Destination[]
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
        const destination = destinationByName.get(island)
        const diveShops = destination?.dive_shops
        const getYourGuideUrl = `https://www.getyourguide.com/s/?q=${encodeURIComponent(island)}`

        return (
          <div className="list-card" key={island}>
            {destination?.photo_url && (
              <>
                <img
                  src={destination.photo_url}
                  alt={island}
                  style={{ width: '100%', borderRadius: 12, aspectRatio: '16/10', objectFit: 'cover' }}
                />
                {PHOTO_CREDITS[island] && (
                  <a
                    className="muted"
                    style={{ fontSize: 10, display: 'block', marginBottom: 8 }}
                    href={PHOTO_CREDITS[island].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {PHOTO_CREDITS[island].text}
                  </a>
                )}
              </>
            )}
            <h3>{island}</h3>
            <div className="muted">
              {shortDate(items[0].travel_date)} – {shortDate(items[items.length - 1].travel_date)}
            </div>
            <p>
              <b>Activiteiten:</b> {activities.length > 0 ? activities.join(', ') : '-'}
            </p>
            <a target="_blank" rel="noreferrer" href={getYourGuideUrl}>
              🎟️ Top activiteiten in {island} op GetYourGuide
            </a>
            {diveShops && diveShops.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="kicker">🤿 Duikcentra (PADI)</div>
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
  const lastDiveByDayId = new Map(computeLastDiveInfo(days, destinations, transportItems).map((i) => [i.lastDayId, i.text]))

  return (
    <>
      <Toolbar view={view} onChange={(v) => setSearchParams({ view: v })} />
      {view === 'timeline' && (
        <TimelineView
          days={days}
          transportItems={transportItems}
          accommodationByDay={accommodationByDay}
          lastDiveByDayId={lastDiveByDayId}
        />
      )}
      {view === 'destinations' && <DestinationsView days={days} destinations={destinations} />}
      {view === 'calendar' && <CalendarView days={days} />}
    </>
  )
}
