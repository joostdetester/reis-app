import { Countdown } from '../components/Countdown'
import { DayCard } from '../components/DayCard'
import { useTripDays } from '../hooks/useTripDays'
import { useTransportItems } from '../hooks/useTransportItems'
import { todayIndex } from '../utils/dates'

export function TodayPage() {
  const { days, loading, error } = useTripDays()
  const { transportItems } = useTransportItems()

  if (loading) return <div className="notice">Laden…</div>
  if (error) return <div className="notice">{error}</div>

  const i = todayIndex(days)
  const upcoming = days.slice(i, i + 2)

  return (
    <>
      <Countdown />
      <div className="notice">Tijdens de reis opent de app automatisch op vandaag en morgen.</div>
      {upcoming.map((day) => (
        <DayCard key={day.id} day={day} transportItems={transportItems} />
      ))}
    </>
  )
}
