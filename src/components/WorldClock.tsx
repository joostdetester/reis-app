import { useEffect, useState } from 'react'
import { formatTimeInZone } from '../utils/dates'

export function WorldClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="world-clock" data-testid="world-clock">
      <div>
        <span className="kicker">🇵🇭 Filipijnen</span>
        <b data-testid="world-clock-manila">{formatTimeInZone(now, 'Asia/Manila')}</b>
      </div>
      <div>
        <span className="kicker">🇳🇱 Nederland</span>
        <b data-testid="world-clock-amsterdam">{formatTimeInZone(now, 'Europe/Amsterdam')}</b>
      </div>
    </div>
  )
}
