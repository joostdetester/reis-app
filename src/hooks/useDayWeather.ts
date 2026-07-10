import { useEffect, useState } from 'react'
import { arrivalLocation, fetchDailyWeather, guessCoords, type DailyForecast } from '../utils/weather'

/** Weer voor één specifieke dag/locatie-combinatie. `null` zolang de datum buiten het voorspelbereik valt. */
export function useDayWeather(location: string, date: string) {
  const [forecast, setForecast] = useState<DailyForecast | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchDailyWeather(guessCoords(arrivalLocation(location)), date)
      .then((data) => {
        if (!cancelled) setForecast(data)
      })
      .catch(() => {
        if (!cancelled) setForecast(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [location, date])

  return { forecast, loading }
}
