import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTripDayAccommodations } from '../hooks/useTripDayAccommodations'
import { useTripDays } from '../hooks/useTripDays'
import { FieldRow } from '../components/FieldRow'
import { EditButton } from '../components/EditButton'
import { EditSheet } from '../components/EditSheet'
import { saveEdit } from '../lib/saveEdit'
import { fmtPhilippineDate, fmtPhilippineTime, fromDatetimeLocalValue, shortDate, toDatetimeLocalValue } from '../utils/dates'
import type { Accommodation } from '../types/trip'

// Alle overnachtingen vinden plaats op één vaste locatie, dus Filipijnse lokale tijd is ondubbelzinnig.
const MANILA_ZONE = 'Asia/Manila'

/** Bewerkbaar in- of uitchecktijdstip, analoog aan FlightTimeField in TransportPage. */
function CheckInOutField({
  acc,
  field,
  label,
  icon,
}: {
  acc: Accommodation
  field: 'check_in' | 'check_out'
  label: string
  icon: string
}) {
  const currentIso = acc[field]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const testId = `hotel-${field}-${acc.id}`

  function openEditor() {
    setDraft(currentIso ? toDatetimeLocalValue(currentIso, MANILA_ZONE) : '')
    setError(null)
    setConfirming(false)
    setEditing(true)
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const newIso = draft ? fromDatetimeLocalValue(draft, MANILA_ZONE) : null
      await saveEdit('accommodations', acc.id, { [field]: newIso })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan is mislukt')
      setSaving(false)
      setConfirming(false)
    }
  }

  return (
    <div className="row" data-testid={testId}>
      <div>{icon}</div>
      <div>
        <div className="kicker">{label}</div>
        <div className="value" data-testid={`${testId}-value`}>
          {currentIso ? fmtPhilippineTime(currentIso) : '-'}
        </div>
      </div>
      <EditButton onClick={openEditor} testId={`${testId}-edit`} />
      {editing && (
        <div className="overlay" data-testid={`${testId}-sheet`}>
          <div className="sheet">
            <h2>{label} bewerken</h2>
            <input
              type="datetime-local"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={confirming || saving}
              data-testid={`${testId}-input`}
            />
            {error && (
              <div className="notice" data-testid={`${testId}-error`}>
                {error}
              </div>
            )}
            {confirming ? (
              <>
                <div className="notice">Deze wijziging opslaan?</div>
                <div className="actions">
                  <button data-testid={`${testId}-back`} onClick={() => setConfirming(false)} disabled={saving}>
                    Terug
                  </button>
                  <button
                    data-testid={`${testId}-confirm`}
                    className="primary"
                    onClick={handleConfirm}
                    disabled={saving}
                  >
                    {saving ? 'Bezig…' : 'Bevestigen'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="notice">Na opslaan vervangt dit de huidige informatie.</div>
                <div className="actions">
                  <button data-testid={`${testId}-cancel`} onClick={() => setEditing(false)}>
                    Annuleren
                  </button>
                  <button data-testid={`${testId}-save`} className="primary" onClick={() => setConfirming(true)}>
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

export function HotelsPage() {
  const { accommodations, loading: loadingAcc, error: errorAcc } = useAccommodations()
  const { links, loading: loadingLinks, error: errorLinks } = useTripDayAccommodations()
  const { days, loading: loadingDays, error: errorDays } = useTripDays()
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('item')
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const loading = loadingAcc || loadingLinks || loadingDays

  async function handleSaveName(id: string, newName: string) {
    if (!newName) throw new Error('Naam mag niet leeg zijn')
    await saveEdit('accommodations', id, { name: newName })
    setEditingNameId(null)
  }

  useEffect(() => {
    if (!targetId || loading) return
    cardRefs.current.get(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [targetId, loading])

  if (loading) return <div className="notice">Laden…</div>
  const error = errorAcc || errorLinks || errorDays
  if (error) return <div className="notice">{error}</div>

  const dayById = new Map(days.map((d) => [d.id, d]))

  const withStayDays = accommodations
    .map((acc) => {
      const stayDays = links
        .filter((l) => l.accommodation_id === acc.id)
        .map((l) => dayById.get(l.trip_day_id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
        .sort((a, b) => a.sort_order - b.sort_order)
      return { acc, stayDays }
    })
    // Chronologisch op eerste verblijfsdag, i.p.v. alfabetisch op naam.
    .sort((a, b) => (a.stayDays[0]?.sort_order ?? Infinity) - (b.stayDays[0]?.sort_order ?? Infinity))

  return (
    <div data-testid="page-hotels">
      <h2 className="section-title">Overnachtingen</h2>
      <div className="grid cols">
        {withStayDays.map(({ acc, stayDays }) => {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acc.name + ' Philippines')}`
          const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(acc.name + ' Philippines')}`

          return (
            <div
              className={`list-card ${acc.id === targetId ? 'highlighted' : ''}`}
              key={acc.id}
              ref={(el) => void (el ? cardRefs.current.set(acc.id, el) : cardRefs.current.delete(acc.id))}
              data-testid={`hotel-card-${acc.id}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3 data-testid={`hotel-name-${acc.id}`}>{acc.name}</h3>
                <EditButton onClick={() => setEditingNameId(acc.id)} testId={`hotel-name-${acc.id}-edit`} />
              </div>
              {editingNameId === acc.id && (
                <EditSheet
                  label="Naam"
                  value={acc.name}
                  onCancel={() => setEditingNameId(null)}
                  onSave={(value) => handleSaveName(acc.id, value)}
                  testId={`hotel-name-${acc.id}-sheet`}
                />
              )}
              {stayDays.length > 0 && (
                <div className="muted" data-testid={`hotel-stay-dates-${acc.id}`}>
                  {stayDays[0].location} · Verblijf:{' '}
                  {acc.check_in && acc.check_out
                    ? `${fmtPhilippineDate(acc.check_in)} t/m ${fmtPhilippineDate(acc.check_out)}`
                    : `${shortDate(stayDays[0].travel_date)} t/m ${shortDate(stayDays[stayDays.length - 1].travel_date)}`}
                </div>
              )}
              <CheckInOutField acc={acc} field="check_in" label="Inchecken" icon="🕐" />
              <CheckInOutField acc={acc} field="check_out" label="Uitchecken" icon="🕐" />
              <FieldRow icon="📍" label="Adres" value={acc.address} table="accommodations" id={acc.id} field="address" />
              <FieldRow icon="📞" label="Telefoon" value={acc.phone} table="accommodations" id={acc.id} field="phone" />
              <FieldRow
                icon="🔖"
                label="Boekingsnummer"
                value={acc.booking_reference}
                table="accommodations"
                id={acc.id}
                field="booking_reference"
              />
              <a target="_blank" rel="noreferrer" href={mapsUrl} data-testid={`hotel-maps-link-${acc.id}`}>
                Open in Google Maps
              </a>
              <br />
              <a target="_blank" rel="noreferrer" href={bookingUrl} data-testid={`hotel-booking-link-${acc.id}`}>
                Bekijk op Booking.com
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
