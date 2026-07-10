import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTripDayAccommodations } from '../hooks/useTripDayAccommodations'
import { useTripDays } from '../hooks/useTripDays'
import { FieldRow } from '../components/FieldRow'
import { fmtPhilippineDate, fmtPhilippineTime, shortDate } from '../utils/dates'

export function HotelsPage() {
  const { accommodations, loading: loadingAcc, error: errorAcc } = useAccommodations()
  const { links, loading: loadingLinks, error: errorLinks } = useTripDayAccommodations()
  const { days, loading: loadingDays, error: errorDays } = useTripDays()
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('item')
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const loading = loadingAcc || loadingLinks || loadingDays

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
    <>
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
            >
              <h3>{acc.name}</h3>
              {stayDays.length > 0 && (
                <div className="muted">
                  {stayDays[0].location} · Verblijf:{' '}
                  {acc.check_in && acc.check_out
                    ? `${fmtPhilippineDate(acc.check_in)} t/m ${fmtPhilippineDate(acc.check_out)}`
                    : `${shortDate(stayDays[0].travel_date)} t/m ${shortDate(stayDays[stayDays.length - 1].travel_date)}`}
                </div>
              )}
              {(acc.check_in || acc.check_out) && (
                <p className="muted">
                  {acc.check_in && `Inchecken: ${fmtPhilippineTime(acc.check_in)}`}
                  {acc.check_in && acc.check_out ? ' · ' : ''}
                  {acc.check_out && `Uitchecken: ${fmtPhilippineTime(acc.check_out)}`}
                </p>
              )}
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
              <a target="_blank" rel="noreferrer" href={mapsUrl}>
                Open in Google Maps
              </a>
              <br />
              <a target="_blank" rel="noreferrer" href={bookingUrl}>
                Bekijk op Booking.com
              </a>
            </div>
          )
        })}
      </div>
    </>
  )
}
