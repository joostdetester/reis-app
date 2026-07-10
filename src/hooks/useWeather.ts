import { useEffect, useState } from 'react'
import { fetchWeather, guessCoords, type WeatherData } from '../utils/weather'

export function useWeather(locationName: string | null | undefined, forecastDays = 3) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchWeather(guessCoords(locationName), forecastDays)
      .then((data) => {
        if (!cancelled) setWeather(data)
      })
      .catch(() => {
        if (!cancelled) setError('Weer kon niet worden geladen')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [locationName, forecastDays])

  return { weather, loading, error }
}
