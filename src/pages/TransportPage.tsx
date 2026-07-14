import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTransportItems } from '../hooks/useTransportItems'
import { useTripDays } from '../hooks/useTripDays'
import { useTrip, type Trip } from '../hooks/useTrip'
import { useFlightStatus } from '../hooks/useFlightStatus'
import { FieldRow } from '../components/FieldRow'
import { EditButton } from '../components/EditButton'
import { saveEdit } from '../lib/saveEdit'
import { hasEditAccess } from '../lib/tripAccess'
import {
  cityLabel,
  flightStatusWindow,
  fmtDate,
  fmtLocalDateTime,
  formatDuration,
  fromDatetimeLocalValue,
  guessTimeZone,
  hoursUntil,
  isoDateInZone,
  toDatetimeLocalValue,
} from '../utils/dates'
import { flightMapUrl, flightradar24Url, splitFlightNumbers } from '../utils/maps'
import { isFlight } from '../utils/transport'
import type { TransportItem } from '../types/trip'

function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Bewerkbaar vertrek- of aankomsttijdstip. Zet bij een echte wijziging `schedule_changed` zodat de waarschuwing verschijnt. */
function FlightTimeField({
  item,
  field,
  label,
  icon,
  zone,
  cityName,
}: {
  item: TransportItem
  field: 'departure_time' | 'arrival_time'
  label: string
  icon: string
  zone: string
  cityName: string
}) {
  const currentIso = item[field]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openEditor() {
    setDraft(currentIso ? toDatetimeLocalValue(currentIso, zone) : '')
    setError(null)
    setConfirming(false)
    setEditing(true)
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const newIso = draft ? fromDatetimeLocalValue(draft, zone) : null
      const currentMs = currentIso ? new Date(currentIso).getTime() : null
      const newMs = newIso ? new Date(newIso).getTime() : null
      const changed = newMs !== currentMs
      await saveEdit('transport_items', item.id, {
        [field]: newIso,
        ...(changed ? { schedule_changed: true } : {}),
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan is mislukt')
      setSaving(false)
      setConfirming(false)
    }
  }

  return (
    <div className="row">
      <div>{icon}</div>
      <div>
        <div className="kicker">{label}</div>
        <div className="value">
          {currentIso ? fmtLocalDateTime(currentIso, zone) : '-'}
          {currentIso && cityName ? ` (${cityName})` : ''}
        </div>
      </div>
      <EditButton onClick={openEditor} />
      {editing && (
        <div className="overlay">
          <div className="sheet">
            <h2>{label} bewerken</h2>
            <input
              type="datetime-local"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={confirming || saving}
            />
            {error && <div className="notice">{error}</div>}
            {confirming ? (
              <>
                <div className="notice">Deze wijziging opslaan?</div>
                <div className="actions">
                  <button onClick={() => setConfirming(false)} disabled={saving}>
                    Terug
                  </button>
                  <button className="primary" onClick={handleConfirm} disabled={saving}>
                    {saving ? 'Bezig…' : 'Bevestigen'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="notice">Na opslaan vervangt dit de huidige informatie.</div>
                <div className="actions">
                  <button onClick={() => setEditing(false)}>Annuleren</button>
                  <button className="primary" onClick={() => setConfirming(true)}>
                    Opslaan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Waarschuwing dat de vluchttijden zijn gewijzigd, met een knop om te bevestigen dat het gezien is. */
function ScheduleChangedNotice({ item }: { item: TransportItem }) {
  const [dismissing, setDismissing] = useState(false)

  if (!item.schedule_changed) return null

  async function handleDismiss() {
    setDismissing(true)
    try {
      await saveEdit('transport_items', item.id, { schedule_changed: false })
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className="notice">
      ⚠️ Let op: de vluchttijden zijn gewijzigd.
      {hasEditAccess() && (
        <button onClick={() => void handleDismiss()} disabled={dismissing}>
          {dismissing ? 'Bezig…' : 'Gezien'}
        </button>
      )}
    </div>
  )
}

// Alleen live opvragen dicht bij de vlucht: ver vooruit heeft een statusopvraag geen zin
// (nog niets bekend) en lang na aankomst verandert er toch niets meer — beide zijn
// verspilde quota bij de vluchtstatus-API (gratis abonnement, beperkt aantal calls/maand).
const STATUS_LOOKUP_BEFORE_HOURS = 48
const STATUS_LOOKUP_AFTER_HOURS = 24

// Vertrekhal/gate/aankomstterminal zijn vaak sowieso pas dicht bij de vlucht bekend
// (ongeacht databron) — moet gelijk zijn aan GATE_LOOKUP_WINDOW_HOURS in de edge function.
const GATE_LOOKUP_WINDOW_HOURS = 2

/** "-" als het venster al bereikt is (of er al een waarde staat); anders een duidelijke reden waarom niet. */
function gatePlaceholder(targetIso: string | null, relativeTo: 'vertrek' | 'aankomst'): string {
  if (!targetIso) return '-'
  const remaining = hoursUntil(targetIso)
  if (remaining !== null && remaining > GATE_LOOKUP_WINDOW_HOURS) {
    return `Nog niet beschikbaar (pas vanaf ${GATE_LOOKUP_WINDOW_HOURS} uur voor ${relativeTo})`
  }
  return '-'
}

function FlightStatusField({ item, apiEnabled }: { item: TransportItem; apiEnabled: boolean }) {
  const codes = item.booking_reference ? splitFlightNumbers(item.booking_reference) : []
  const zone = guessTimeZone(item.origin)
  const date = item.departure_time ? isoDateInZone(item.departure_time, zone) : ''
  const windowState = item.departure_time
    ? flightStatusWindow(item.departure_time, item.arrival_time, new Date(), STATUS_LOOKUP_BEFORE_HOURS, STATUS_LOOKUP_AFTER_HOURS)
    : 'before'
  const enabled = apiEnabled && windowState === 'active' && codes.length > 0 && Boolean(date)

  const { results, loading, error } = useFlightStatus({
    transportItemId: item.id,
    flightNumbers: codes,
    date,
    currentDepartureIso: item.departure_time,
    currentArrivalIso: item.arrival_time,
    enabled,
  })

  // Statustekst zonder vluchtnummer-per-vluchtnummer-opsplitsing: die komt hieronder per code
  // terug, samen met de doorklik-link naar Flightradar24 (die werkt sowieso al, ongeacht of onze
  // eigen vluchtstatus-API al iets weet — vandaar dat de link niet van `enabled` afhangt).
  const fallbackStatusText = !apiEnabled
    ? 'Vluchtstatus-API staat uit'
    : windowState === 'before'
      ? `Nog niet beschikbaar (pas vanaf ${STATUS_LOOKUP_BEFORE_HOURS} uur voor vertrek)`
      : windowState === 'after'
        ? null
        : loading
          ? 'Bezig met ophalen…'
          : error
            ? error
            : null

  const resultByCode = new Map((results ?? []).map((r) => [r.flightNumber, r]))

  return (
    <div className="row">
      <div>📡</div>
      <div>
        <div className="kicker">Vluchtstatus</div>
        <div className="value">
          {codes.length === 0
            ? '-'
            : codes.map((code, i) => {
                const result = resultByCode.get(code)
                const suffix = result
                  ? `${result.status}${result.delayMinutes ? ` (${result.delayMinutes} min)` : ''}`
                  : fallbackStatusText
                return (
                  <span key={code}>
                    {i > 0 ? ' · ' : ''}
                    <a target="_blank" rel="noreferrer" href={flightradar24Url(code)}>
                      {suffix ? `${code}: ${suffix}` : code}
                    </a>
                  </span>
                )
              })}
        </div>
      </div>
    </div>
  )
}

/** Schakelaar (alleen zichtbaar met edit-token) om de vluchtstatus-API helemaal uit te zetten en zo quota te sparen. */
function FlightApiToggle({ trip }: { trip: Trip }) {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    try {
      await saveEdit('trips', trip.id, { flight_status_api_enabled: !trip.flight_status_api_enabled })
    } finally {
      setSaving(false)
    }
  }

  return (
    <button className="chip" onClick={() => void toggle()} disabled={saving}>
      📡 Vluchtstatus-API: {trip.flight_status_api_enabled ? 'Aan' : 'Uit'}
    </button>
  )
}

export function TransportPage() {
  const { transportItems, loading: loadingItems, error: errorItems } = useTransportItems()
  const { days, loading: loadingDays, error: errorDays } = useTripDays()
  const { trip } = useTrip()
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('item')
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const loading = loadingItems || loadingDays

  useEffect(() => {
    if (!targetId || loading) return
    cardRefs.current.get(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [targetId, loading])

  if (loading) return <div className="notice">Laden…</div>
  const error = errorItems || errorDays
  if (error) return <div className="notice">{error}</div>

  const dayById = new Map(days.map((d) => [d.id, d]))
  const flights = transportItems.filter(isFlight)
  const sorted = [...flights].sort((a, b) => {
    const dayA = dayById.get(a.trip_day_id)?.sort_order ?? 0
    const dayB = dayById.get(b.trip_day_id)?.sort_order ?? 0
    return dayA - dayB
  })
  const apiEnabled = trip?.flight_status_api_enabled ?? true

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h2 className="section-title">Vluchten</h2>
        {hasEditAccess() && trip && <FlightApiToggle trip={trip} />}
      </div>
      <div className="grid">
        {sorted.map((item) => {
          const day = dayById.get(item.trip_day_id)
          const untilDeparture = item.departure_time ? hoursUntil(item.departure_time) : null

          return (
            <div
              className={`list-card ${item.id === targetId ? 'highlighted' : ''}`}
              key={item.id}
              ref={(el) => void (el ? cardRefs.current.set(item.id, el) : cardRefs.current.delete(item.id))}
            >
              <h3>{day ? fmtDate(day.travel_date) : '-'}</h3>
              <div>{day?.location}</div>
              <p>
                <b>{item.type}</b>
                {item.carrier ? ` · ${item.carrier}` : ''}
                {flightMapUrl(item.origin, item.destination) && (
                  <>
                    {' '}
                    (
                    <a target="_blank" rel="noreferrer" href={flightMapUrl(item.origin, item.destination)!}>
                      route
                    </a>
                    )
                  </>
                )}
              </p>
              <ScheduleChangedNotice item={item} />
              {untilDeparture !== null && untilDeparture <= 24 && (
                <div className="notice">Vertrekt over {untilDeparture} uur</div>
              )}
              <FieldRow icon="🔖" label="Vluchtnummer" value={item.booking_reference} table="transport_items" id={item.id} field="booking_reference" />
              <FieldRow
                icon="📍"
                label="Vertreklocatie"
                value={item.origin}
                table="transport_items"
                id={item.id}
                field="origin"
                href={item.origin ? mapsSearchUrl(item.origin) : undefined}
              />
              <FieldRow
                icon="📍"
                label="Aankomstlocatie"
                value={item.destination}
                table="transport_items"
                id={item.id}
                field="destination"
                href={item.destination ? mapsSearchUrl(item.destination) : undefined}
              />
              <FlightTimeField
                item={item}
                field="departure_time"
                label="Vertrektijd"
                icon="🕐"
                zone={guessTimeZone(item.origin)}
                cityName={cityLabel(item.origin)}
              />
              <FlightTimeField
                item={item}
                field="arrival_time"
                label="Aankomsttijd"
                icon="🕐"
                zone={guessTimeZone(item.destination)}
                cityName={cityLabel(item.destination)}
              />
              {item.departure_time && item.arrival_time && (
                <div className="row">
                  <div>⏳</div>
                  <div>
                    <div className="kicker">Vluchtduur</div>
                    <div className="value">{formatDuration(item.departure_time, item.arrival_time)}</div>
                  </div>
                </div>
              )}
              <FieldRow
                icon="🚪"
                label="Vertrekhal"
                value={item.departure_terminal}
                table="transport_items"
                id={item.id}
                field="departure_terminal"
                placeholder={gatePlaceholder(item.departure_time, 'vertrek')}
              />
              <FieldRow
                icon="🎫"
                label="Gate"
                value={item.departure_gate}
                table="transport_items"
                id={item.id}
                field="departure_gate"
                placeholder={gatePlaceholder(item.departure_time, 'vertrek')}
              />
              <FieldRow
                icon="🚪"
                label="Aankomstterminal"
                value={item.arrival_terminal}
                table="transport_items"
                id={item.id}
                field="arrival_terminal"
                placeholder={gatePlaceholder(item.arrival_time, 'aankomst')}
              />
              <FlightStatusField item={item} apiEnabled={apiEnabled} />
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
