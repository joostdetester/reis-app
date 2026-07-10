import { useState } from 'react'
import { useWeather } from '../hooks/useWeather'
import { shortDate } from '../utils/dates'
import { beachScore, weatherCodeInfo, WEATHER_DESTINATIONS } from '../utils/weather'

const STORAGE_KEY = 'weather-destination'
const DEFAULT_DESTINATION = 'El Nido'

function loadStoredDestination(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_DESTINATION
  } catch {
    return DEFAULT_DESTINATION
  }
}

export function WeatherForecast({ days = 14 }: { days?: number }) {
  const [destination, setDestination] = useState(loadStoredDestination)
  const { weather, loading, error } = useWeather(destination, days)

  function handleChange(value: string) {
    setDestination(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // localStorage niet beschikbaar (bv. privémodus) — selectie geldt dan alleen voor deze sessie.
    }
  }

  return (
    <div className="list-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Weer</h3>
        <select className="select-pill" value={destination} onChange={(e) => handleChange(e.target.value)}>
          {WEATHER_DESTINATIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {loading && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Laden…</div>}
      {!loading && (error || !weather) && (
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Weer kon niet worden geladen.</div>
      )}
      {!loading && weather && (
        <>
          <div className="muted" style={{ fontSize: 12, margin: '8px 0' }}>Komende {weather.daily.length} dagen</div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {weather.daily.map((day) => {
              const info = weatherCodeInfo(day.weatherCode)
              const beach = beachScore(day)
              return (
                <div key={day.date} style={{ textAlign: 'center', fontSize: 12, flex: '0 0 auto', minWidth: 58 }}>
                  <div className="muted">{shortDate(day.date)}</div>
                  <div style={{ fontSize: 20 }}>{info.emoji}</div>
                  <div>
                    {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                  </div>
                  <div className="muted">🏖️ {beach.score}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
