import { useWeather } from '../hooks/useWeather'
import { shortDate } from '../utils/dates'
import { beachScore, guessWeatherLabel, weatherCodeInfo } from '../utils/weather'

export function WeatherForecast({ location, days = 14 }: { location: string | null | undefined; days?: number }) {
  const { weather, loading, error } = useWeather(location, days)

  if (loading) return null
  if (error || !weather) return null

  return (
    <div className="list-card">
      <h3>Weer · {guessWeatherLabel(location)}</h3>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Komende {weather.daily.length} dagen</div>
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
    </div>
  )
}
