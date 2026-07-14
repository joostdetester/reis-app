import { Countdown } from '../components/Countdown'
import { DayCard } from '../components/DayCard'
import { useTripDays } from '../hooks/useTripDays'
import { useTransportItems } from '../hooks/useTransportItems'
import { useAccommodations } from '../hooks/useAccommodations'
import { useTripDayAccommodations } from '../hooks/useTripDayAccommodations'
import { buildDayAccommodationMap } from '../utils/dayAccommodations'
import { todayIndex } from '../utils/dates'

export function TodayPage() {
  const { days, loading, error } = useTripDays()
  const { transportItems } = useTransportItems()
  const { accommodations } = useAccommodations()
  const { links } = useTripDayAccommodations()

  if (loading) return <div className="notice">Laden…</div>
  if (error) return <div className="notice">{error}</div>

  const i = todayIndex(days)
  const upcoming = days.slice(i, i + 2)
  const accommodationByDay = buildDayAccommodationMap(days, links, accommodations)

  return (
    <>
      <Countdown />
      <div className="notice">
        Tijdens de reis opent de app automatisch op vandaag en morgen, zodat de hele familie direct ziet wat er op de planning staat.
      </div>
      {upcoming.map((day) => (
        <DayCard
          key={day.id}
          day={day}
          transportItems={transportItems}
          accommodationInfo={accommodationByDay.get(day.id)}
        />
      ))}
    </>
  )
}
