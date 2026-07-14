import { useState } from 'react'
import { useTrip } from '../hooks/useTrip'
import { useTripDays } from '../hooks/useTripDays'
import { useDayPhotos } from '../hooks/useDayPhotos'
import { FieldRow } from '../components/FieldRow'
import { hasEditAccess } from '../lib/tripAccess'
import { requestGooglePhotosAccessToken } from '../lib/googlePhotosAuth'
import { createPickerSession, downloadMediaItem, listSelectedMediaItems, waitForSelection } from '../lib/googlePhotosPicker'
import { uploadDayPhoto } from '../lib/uploadDayPhoto'
import { fmtDate } from '../utils/dates'
import type { DayPhoto, TripDay } from '../types/trip'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function dayPhotoUrl(storagePath: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/day-photos/${storagePath}`
}

function DayPhotosCard({ day, photos }: { day: TripDay; photos: DayPhoto[] }) {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleImport() {
    if (!GOOGLE_CLIENT_ID) {
      setError("Foto-import is nog niet geconfigureerd (ontbrekende Google-client-ID).")
      return
    }

    // Meteen (synchroon binnen de kliklogica) een leeg tabblad openen, anders blokkeren
    // browsers de latere redirect naar de picker-URL als "ongevraagde pop-up".
    const popup = window.open('', '_blank')

    setBusy(true)
    setError(null)
    setStatus('Inloggen bij Google…')
    try {
      const accessToken = await requestGooglePhotosAccessToken(GOOGLE_CLIENT_ID)

      setStatus("Kies foto's in het geopende tabblad…")
      const session = await createPickerSession(accessToken)
      if (popup) popup.location.href = session.pickerUri
      else window.open(session.pickerUri, '_blank', 'noopener,noreferrer')

      await waitForSelection(session.id, accessToken)

      setStatus("Foto's ophalen…")
      const items = (await listSelectedMediaItems(session.id, accessToken)).filter((item) => item.type === 'PHOTO')

      for (let i = 0; i < items.length; i++) {
        setStatus(`Bezig met uploaden (${i + 1}/${items.length})…`)
        const { base64, contentType, filename } = await downloadMediaItem(items[i], accessToken)
        await uploadDayPhoto(day.id, filename, contentType, base64)
      }
      setStatus(items.length > 0 ? `${items.length} foto's toegevoegd.` : "Geen foto's gekozen.")
    } catch (err) {
      popup?.close()
      setError(err instanceof Error ? err.message : 'Importeren is mislukt')
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="list-card">
      <h3>{fmtDate(day.travel_date)}</h3>
      <div className="muted">{day.location}</div>
      {photos.length > 0 ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <img key={photo.id} src={dayPhotoUrl(photo.storage_path)} alt="" loading="lazy" />
          ))}
        </div>
      ) : (
        <p className="muted">Nog geen foto's voor deze dag.</p>
      )}
      {hasEditAccess() && (
        <>
          <button className="chip" onClick={() => void handleImport()} disabled={busy}>
            📷 Foto's kiezen uit Google Photos
          </button>
          {status && <div className="muted" style={{ marginTop: 8 }}>{status}</div>}
          {error && <div className="notice">{error}</div>}
        </>
      )}
    </div>
  )
}

export function PhotosPage() {
  const { trip, loading: loadingTrip, error: errorTrip } = useTrip()
  const { days, loading: loadingDays, error: errorDays } = useTripDays()
  const { dayPhotos, loading: loadingPhotos, error: errorPhotos } = useDayPhotos()

  const loading = loadingTrip || loadingDays || loadingPhotos
  if (loading) return <div className="notice">Laden…</div>
  const error = errorTrip || errorDays || errorPhotos
  if (error) return <div className="notice">{error}</div>

  const photosByDay = new Map<string, DayPhoto[]>()
  for (const photo of dayPhotos) {
    const list = photosByDay.get(photo.trip_day_id) ?? []
    list.push(photo)
    photosByDay.set(photo.trip_day_id, list)
  }

  return (
    <>
      <h2 className="section-title">Foto's &amp; video's</h2>
      <div className="grid">
        {trip && (
          <div className="list-card">
            <h3>🔗 Gedeeld album</h3>
            <p className="muted">
              Eén gedeeld Google Photos-album voor de hele reis, voor wie liever alles los in
              Google Photos bekijkt.
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
        {days.map((day) => (
          <DayPhotosCard key={day.id} day={day} photos={photosByDay.get(day.id) ?? []} />
        ))}
      </div>
    </>
  )
}
