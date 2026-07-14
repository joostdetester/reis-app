import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTransportItems } from '../hooks/useTransportItems'
import { useTripDays } from '../hooks/useTripDays'
import { FieldRow } from '../components/FieldRow'
import { EditButton } from '../components/EditButton'
import { EditSheet } from '../components/EditSheet'
import { saveEdit } from '../lib/saveEdit'
import { hasEditAccess } from '../lib/tripAccess'
import {
  cityLabel,
  fmtDate,
  fmtLocalDateTime,
  formatDuration,
  fromDatetimeLocalValue,
  guessTimeZone,
  hoursUntil,
  toDatetimeLocalValue,
} from '../utils/dates'
import { flightMapUrl, flightStatusUrl, splitFlightNumbers } from '../utils/maps'
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
      <EditButton onClick={() => setEditing(true)} />
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

  return (
    <>
      <h2 className="section-title">Vluchten</h2>
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
              </p>
              <ScheduleChangedNotice item={item} />
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
              {flightMapUrl(item.origin, item.destination) && (
                <a target="_blank" rel="noreferrer" href={flightMapUrl(item.origin, item.destination)!}>
                  🗺️ Bekijk route op kaart
                </a>
              )}
              <FieldRow icon="🔖" label="Vluchtnummer" value={item.booking_reference} table="transport_items" id={item.id} field="booking_reference" />
              {item.booking_reference &&
                splitFlightNumbers(item.booking_reference).map((code) => (
                  <a key={code} target="_blank" rel="noreferrer" href={flightStatusUrl(code)}>
                    ✈️ Vluchtstatus {code} opzoeken
                  </a>
                ))}
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
              <FieldRow icon="🚪" label="Vertrekhal" value={item.departure_terminal} table="transport_items" id={item.id} field="departure_terminal" />
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
