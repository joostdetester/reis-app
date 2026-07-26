import type { TransportItem, TripDay } from '../types/trip'
import { countdownTo, fmtLocalDateTime, todayIndex, tripPhase } from '../utils/dates'
import { nextUpcomingFlight } from '../utils/transport'

interface CountdownProps {
  days: TripDay[]
  transportItems: TransportItem[]
}

export function Countdown({ days, transportItems }: CountdownProps) {
  const phase = tripPhase(days)
  const upcoming = nextUpcomingFlight(days, transportItems)

  const kicker = phase === 'before' ? 'Tot vertrek' : 'Vakantiedag'
  const value =
    phase === 'after'
      ? 'Reis afgelopen'
      : phase === 'during'
        ? `Dag ${todayIndex(days) + 1} van ${days.length}`
        : countdownTo(upcoming?.flight.departure_time ?? `${days[0]?.travel_date ?? ''}T00:00:00`).text

  return (
    <div className="panel countdown" data-testid="countdown">
      <div>
        <div className="kicker">{kicker}</div>
        <strong data-testid="countdown-value">{value}</strong>
      </div>
      {upcoming && (
        <div className="countdown-highlight" data-testid="countdown-next-flight">
          <div className="kicker">Komende vlucht</div>
          <b>{upcoming.flight.booking_reference}</b>
          <div className="muted">{fmtLocalDateTime(upcoming.flight.departure_time, upcoming.flight.origin)}</div>
          <div className="muted">{[upcoming.flight.origin, upcoming.flight.destination].filter(Boolean).join(' → ')}</div>
          <div className="muted">Vakantiedag {upcoming.vacationDay}</div>
        </div>
      )}
    </div>
  )
}
