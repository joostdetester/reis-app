import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTripDays } from '../hooks/useTripDays'
import { useTransportItems } from '../hooks/useTransportItems'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTripDayAccommodations } from '../hooks/useTripDayAccommodations'
import { useDestinations } from '../hooks/useDestinations'
import { DayCard } from '../components/DayCard'
import { cityLabel, fmtLocalDateTime, formatDurationHM, shortDate, todayIndex, tripPhase } from '../utils/dates'
import { matchesQuery } from '../utils/search'
import { buildDayAccommodationMap, type DayAccommodationInfo } from '../utils/dayAccommodations'
import { computeLastDiveInfo } from '../utils/lastDive'
import { buildDestinationBlocks, flightContext, type DestinationBlock } from '../utils/destinationBlocks'
import { flightMapUrl } from '../utils/maps'
import type { Destination, TransportItem, TripDay } from '../types/trip'

// Bronvermelding voor de bestemmingsfoto's (CC BY(-SA) vereist credit + link naar de bron).
const PHOTO_CREDITS: Record<string, { text: string; url: string }> = {
  Amsterdam: {
    text: 'Foto: Sarah Stierch, Prinsengracht (CC BY 4.0)',
    url: 'https://commons.wikimedia.org/wiki/File:A_canal_in_Amsterdam_-_Sarah_Stierch.jpg',
  },
  Luzon: {
    text: 'Foto: Markadan, Fort Santiago Manila (CC BY 4.0)',
    url: 'https://commons.wikimedia.org/wiki/File:Fort_Santiago,_Intramuros,_Manila.jpg',
  },
  'Palawan - El Nido': {
    text: 'Foto: Marciano Villavito, Big Lagoon El Nido (CC BY-SA 4.0)',
    url: 'https://commons.wikimedia.org/wiki/File:Big_Lagoon_at_El_Nido,_Palawan,_Philippines.jpg',
  },
  'Palawan - Puerto Princesa': {
    text: 'Foto: Charima312017, Subterranean River National Park (CC BY-SA 4.0)',
    url: 'https://commons.wikimedia.org/wiki/File:Puerto_Princesa_Subterranean_River_National_park_02.jpg',
  },
  'Cebu - Moalboal': {
    text: 'Foto: Lindstrm, White Beach Moalboal (CC BY-SA 3.0)',
    url: 'https://commons.wikimedia.org/wiki/File:White_Beach_Moalboal.JPG',
  },
  'Cebu - Cebu City': {
    text: 'Foto: Rjruiziii, Fort San Pedro (CC BY-SA 3.0)',
    url: 'https://commons.wikimedia.org/wiki/File:Fort_San_Pedro,_Cebu,_Philippines.jpg',
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

function FlightTimes({ item, context }: { item: TransportItem; context: 'arrival' | 'departure' | 'both' }) {
  const departure = item.departure_time ? fmtLocalDateTime(item.departure_time, item.origin) : null
  const arrival = item.arrival_time ? fmtLocalDateTime(item.arrival_time, item.destination) : null
  const originLabel = cityLabel(item.origin)
  const destLabel = cityLabel(item.destination)
  const range = [departure, arrival].filter(Boolean).join(' - ')
  const duration =
    item.departure_time && item.arrival_time ? formatDurationHM(item.departure_time, item.arrival_time) : null
  const durationSuffix = duration ? ` - Vluchtduur: ${duration}` : ''

  if (context === 'arrival' && arrival) {
    return (
      <div className="muted" style={{ fontSize: 12 }}>
        Aankomst {destLabel}: {arrival} ({range}){durationSuffix}
      </div>
    )
  }
  if (context === 'departure' && departure) {
    return (
      <div className="muted" style={{ fontSize: 12 }}>
        Vertrek {originLabel}: {departure} ({range}){durationSuffix}
      </div>
    )
  }
  if (range) return <div className="muted" style={{ fontSize: 12 }}>{range}{durationSuffix}</div>
  return null
}

function BlockFlights({
  block,
  totalDays,
  transportItems,
}: {
  block: DestinationBlock
  totalDays: number
  transportItems: TransportItem[]
}) {
  const dayIds = new Set(block.days.map((d) => d.id))
  const items = transportItems.filter((t) => dayIds.has(t.trip_day_id) && /vlucht/i.test(t.type))
  if (items.length === 0) return null

  return (
    <div style={{ marginTop: 10 }}>
      <div className="kicker">✈️ Vluchten</div>
      {items.map((item) => {
        const mapUrl = flightMapUrl(item.origin, item.destination)
        const route = [item.origin, item.destination].filter(Boolean).join(' → ')

        return (
          <div key={item.id} style={{ marginTop: 6 }}>
            <Link to="/transport">
              {[item.type, item.carrier, item.booking_reference].filter(Boolean).join(' · ')}
            </Link>
            {route && ` · ${route}`}
            {mapUrl && (
              <>
                {' · '}
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  Kaart
                </a>
              </>
            )}
            <FlightTimes item={item} context={flightContext(item.trip_day_id, block, totalDays)} />
          </div>
        )
      })}
    </div>
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
  const blocks = buildDestinationBlocks(days)
  const destinationByName = new Map(destinations.map((d) => [d.name, d]))

  return (
    <div className="grid">
      {blocks.map((block, index) => {
        const activities = block.days
          .flatMap((d) => [d.morning_text, d.afternoon_text, d.evening_text])
          .filter((v): v is string => Boolean(v))
          .slice(0, 6)
        const destination = destinationByName.get(block.name)
        const diveShops = destination?.dive_shops
        const getYourGuideUrl = `https://www.getyourguide.com/s/?q=${encodeURIComponent(block.name)}`

        return (
          <div className="list-card" key={`${block.name}-${index}`}>
            {destination?.photo_url && (
              <>
                <img
                  src={destination.photo_url}
                  alt={block.name}
                  style={{ width: '100%', borderRadius: 12, aspectRatio: '16/10', objectFit: 'cover' }}
                />
                {PHOTO_CREDITS[block.name] && (
                  <a
                    className="muted"
                    style={{ fontSize: 10, display: 'block', marginBottom: 8 }}
                    href={PHOTO_CREDITS[block.name].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {PHOTO_CREDITS[block.name].text}
                  </a>
                )}
              </>
            )}
            <h3>{block.name}</h3>
            <div className="muted">
              {shortDate(block.days[0].travel_date)} – {shortDate(block.days[block.days.length - 1].travel_date)}
            </div>
            <BlockFlights block={block} totalDays={days.length} transportItems={transportItems} />
            <p>
              <b>Activiteiten:</b> {activities.length > 0 ? activities.join(', ') : '-'}
            </p>
            <a target="_blank" rel="noreferrer" href={getYourGuideUrl}>
              🎟️ Top activiteiten in {block.name} op GetYourGuide
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
      {view === 'destinations' && (
        <DestinationsView days={days} destinations={destinations} transportItems={transportItems} />
      )}
      {view === 'calendar' && <CalendarView days={days} />}
    </>
  )
}
