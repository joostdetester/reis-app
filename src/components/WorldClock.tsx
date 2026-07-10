import { useEffect, useState } from 'react'
import { formatTimeInZone } from '../utils/dates'

export function WorldClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="world-clock">
      <div>
        <span className="kicker">🇵🇭 Filipijnen</span>
        <b>{formatTimeInZone(now, 'Asia/Manila')}</b>
      </div>
      <div>
        <span className="kicker">🇳🇱 Nederland</span>
        <b>{formatTimeInZone(now, 'Europe/Amsterdam')}</b>
      </div>
    </div>
  )
}
