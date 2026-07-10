import { useWeather } from '../hooks/useWeather'
import { shortDate } from '../utils/dates'
import { guessWeatherLabel, isBadTravelWeather, weatherCodeInfo } from '../utils/weather'

export function WeatherCard({ location }: { location: string | null | undefined }) {
  const { weather, loading, error } = useWeather(location)

  if (loading) return null
  if (error || !weather) return null

  const current = weatherCodeInfo(weather.current.weatherCode)
  const badDays = weather.daily.filter(isBadTravelWeather)

  return (
    <div className="panel">
      <div className="kicker">Weer · {guessWeatherLabel(location)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <span style={{ fontSize: 28 }}>{current.emoji}</span>
        <div>
          <strong>{Math.round(weather.current.temp)}°C</strong>
          <div className="muted" style={{ fontSize: 13 }}>{current.label}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        {weather.daily.map((day) => {
          const info = weatherCodeInfo(day.weatherCode)
          return (
            <div key={day.date} style={{ textAlign: 'center', fontSize: 12 }}>
              <div className="muted">{shortDate(day.date)}</div>
              <div style={{ fontSize: 20 }}>{info.emoji}</div>
              <div>
                {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
              </div>
            </div>
          )
        })}
      </div>
      {badDays.length > 0 && (
        <div className="notice" style={{ marginTop: 10 }}>
          ⚠️ Veel regen of slecht reisweer verwacht op {badDays.map((d) => shortDate(d.date)).join(', ')}.
        </div>
      )}
    </div>
  )
}
