import { countdownTo } from '../utils/dates'

// Eerste vlucht (WY172, 23 juli 2026 20:25) staat hier nog hardcoded, zoals in de
// vorige versie — transport_items heeft nog geen betrouwbare exacte vertrektijden
// (zie datakwaliteitspunten in de seed-log). Wordt data-driven zodra dat is opgelost.
const FIRST_DEPARTURE = '2026-07-23T20:25:00'

export function Countdown() {
  const { text } = countdownTo(FIRST_DEPARTURE)
  return (
    <div className="panel countdown">
      <div>
        <div className="kicker">Tot vertrek</div>
        <strong>{text}</strong>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="kicker">Eerste vlucht</div>
        <b>WY172 · 20:25</b>
      </div>
    </div>
  )
}
