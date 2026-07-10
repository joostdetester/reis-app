import { usePracticalInfo } from '../hooks/usePracticalInfo'
import { useTripDays } from '../hooks/useTripDays'
import { FieldRow } from '../components/FieldRow'
import { CurrencyConverter } from '../components/CurrencyConverter'
import { WeatherForecast } from '../components/WeatherForecast'
import { todayIndex } from '../utils/dates'

export function PracticalPage() {
  const { info, loading, error } = usePracticalInfo()
  const { days } = useTripDays()

  if (loading) return <div className="notice">Laden…</div>
  if (error) return <div className="notice">{error}</div>

  const location = days[todayIndex(days)]?.location ?? days[0]?.location

  return (
    <>
      <h2 className="section-title">Praktische informatie</h2>
      <div className="grid">
        <WeatherForecast location={location} />
        <CurrencyConverter />
        {info.map((item) => (
          <div className="list-card" key={item.id}>
            <h3>{item.title}</h3>
            <FieldRow icon="ℹ️" label={item.title} value={item.content} table="practical_info" id={item.id} field="content" />
          </div>
        ))}
      </div>
    </>
  )
}
