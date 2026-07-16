import { useDayWeather } from '../hooks/useDayWeather'
import { beachScore, weatherCodeInfo } from '../utils/weather'

export function DayWeather({ location, date }: { location: string; date: string }) {
  const { forecast, loading } = useDayWeather(location, date)

  if (loading || !forecast) return null

  const info = weatherCodeInfo(forecast.weatherCode)
  const beach = beachScore(forecast)

  return (
    <div className="muted day-weather" style={{ fontSize: 12 }} data-testid="day-weather">
      {info.emoji} {Math.round(forecast.tempMax)}° / {Math.round(forecast.tempMin)}° · 🏖️ {beach.score}/10
    </div>
  )
}
