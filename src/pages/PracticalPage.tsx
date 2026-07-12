import { usePracticalInfo } from '../hooks/usePracticalInfo'
import { useTrip } from '../hooks/useTrip'
import { FieldRow } from '../components/FieldRow'
import { CurrencyConverter } from '../components/CurrencyConverter'
import { WeatherForecast } from '../components/WeatherForecast'

export function PracticalPage() {
  const { info, loading, error } = usePracticalInfo()
  const { trip } = useTrip()

  if (loading) return <div className="notice">Laden…</div>
  if (error) return <div className="notice">{error}</div>

  return (
    <>
      <h2 className="section-title">Praktische informatie</h2>
      <div className="grid">
        <WeatherForecast />
        {trip && (
          <div className="list-card">
            <h3>📷 Foto's &amp; video's</h3>
            <p className="muted">
              Eén gedeeld Google Photos-album voor de hele reis. Ieder voegt daar zelf foto's en
              video's aan toe vanuit de eigen Google-app — geen inloggen in deze site nodig.
            </p>
            <FieldRow
              icon="🔗"
              label="Albumlink"
              value={trip.photos_album_url}
              table="trips"
              id={trip.id}
              field="photos_album_url"
              placeholder="Nog geen album gekoppeld"
            />
            {trip.photos_album_url && (
              <a target="_blank" rel="noreferrer" href={trip.photos_album_url}>
                Open het reisalbum
              </a>
            )}
          </div>
        )}
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
