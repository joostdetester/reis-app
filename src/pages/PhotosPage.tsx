import { useState } from 'react'
import { useTrip } from '../hooks/useTrip'
import { useTripDays } from '../hooks/useTripDays'
import { useDayPhotos } from '../hooks/useDayPhotos'
import { FieldRow } from '../components/FieldRow'
import { hasEditAccess } from '../lib/tripAccess'
import { requestGooglePhotosAccessToken } from '../lib/googlePhotosAuth'
import {
  createPickerSession,
  downloadMediaItem,
  listSelectedMediaItems,
  waitForSelection,
  type PickerSession,
} from '../lib/googlePhotosPicker'
import { uploadDayPhoto } from '../lib/uploadDayPhoto'
import { deleteDayPhoto } from '../lib/deleteDayPhoto'
import { fmtDate } from '../utils/dates'
import type { DayPhoto, TripDay } from '../types/trip'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function dayPhotoUrl(storagePath: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/day-photos/${storagePath}`
}

/** Foto met een verwijderknop (alleen met edit-token), met een expliciete bevestigingsstap. */
function PhotoThumbnail({ photo }: { photo: DayPhoto }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteDayPhoto(photo.id)
      // Succes: de rij verdwijnt vanzelf via de realtime-subscriptie, geen lokale state-reset nodig.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen is mislukt')
      setDeleting(false)
    }
  }

  function reset() {
    setConfirming(false)
    setError(null)
  }

  return (
    <div className="photo-thumb">
      <img src={dayPhotoUrl(photo.storage_path)} alt="" loading="lazy" />
      {hasEditAccess() &&
        (confirming ? (
          <div className="photo-thumb-confirm">
            {error ? (
              <button onClick={reset} aria-label={error}>
                ⚠️
              </button>
            ) : (
              <>
                <button onClick={() => void handleDelete()} disabled={deleting}>
                  {deleting ? '…' : 'Ja'}
                </button>
                <button onClick={reset} disabled={deleting}>
                  Nee
                </button>
              </>
            )}
          </div>
        ) : (
          <button className="photo-thumb-delete" onClick={() => setConfirming(true)} aria-label="Foto verwijderen">
            ×
          </button>
        ))}
    </div>
  )
}

interface ReadySession {
  accessToken: string
  session: PickerSession
}

/**
 * Twee losse tikken i.p.v. één doorlopende actie: mobiele browsers (vooral iOS Safari)
 * staan meestal maar één pop-up per directe gebruikersactie toe. Inloggen bij Google
 * (via GIS, opent zelf een pop-up) en het openen van het keuzescherm (onze eigen
 * pop-up) zijn dus bewust twee aparte knoppen/tikken, elk met hun eigen pop-up.
 */
function DayPhotosCard({ day, photos }: { day: TripDay; photos: DayPhoto[] }) {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState<ReadySession | null>(null)

  async function handlePrepare() {
    if (!GOOGLE_CLIENT_ID) {
      setError('Foto-import is nog niet geconfigureerd (ontbrekende Google-client-ID).')
      return
    }
    setBusy(true)
    setError(null)
    setStatus('Inloggen bij Google…')
    try {
      const accessToken = await requestGooglePhotosAccessToken(GOOGLE_CLIENT_ID)
      setStatus('Google Photos-sessie voorbereiden…')
      const session = await createPickerSession(accessToken)
      setReady({ accessToken, session })
      setStatus('Klik op "Open keuzescherm" om foto\'s te kiezen.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen bij Google is mislukt')
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  function handleOpenPicker() {
    if (!ready) return
    // Rechtstreeks in deze klik-handler, dus geen aparte async stap ervoor: dit is de
    // enige pop-up die uit déze tik voortkomt.
    window.open(ready.session.pickerUri, '_blank', 'noopener,noreferrer')
    void handleAfterPicking(ready)
  }

  async function handleAfterPicking({ accessToken, session }: ReadySession) {
    setBusy(true)
    setError(null)
    setStatus("Kies foto's in het geopende tabblad…")
    try {
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
      setError(err instanceof Error ? err.message : 'Importeren is mislukt')
      setStatus(null)
    } finally {
      setBusy(false)
      setReady(null)
    }
  }

  return (
    <div className="list-card">
      <h3>{fmtDate(day.travel_date)}</h3>
      <div className="muted">{day.location}</div>
      {photos.length > 0 ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <PhotoThumbnail key={photo.id} photo={photo} />
          ))}
        </div>
      ) : (
        <p className="muted">Nog geen foto's voor deze dag.</p>
      )}
      {hasEditAccess() && (
        <>
          {ready ? (
            <button className="chip" onClick={handleOpenPicker} disabled={busy}>
              ➡️ Open keuzescherm
            </button>
          ) : (
            <button className="chip" onClick={() => void handlePrepare()} disabled={busy}>
              📷 Foto's kiezen uit Google Photos
            </button>
          )}
          {status && (
            <div className="muted" style={{ marginTop: 8 }}>
              {status}
            </div>
          )}
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
        {dayPhotos.length > 0 && (
          <div className="list-card">
            <h3>🖼️ Alle foto's van de reis</h3>
            <div className="photo-grid">
              {dayPhotos.map((photo) => (
                <PhotoThumbnail key={photo.id} photo={photo} />
              ))}
            </div>
          </div>
        )}
        {days.map((day) => (
          <DayPhotosCard key={day.id} day={day} photos={photosByDay.get(day.id) ?? []} />
        ))}
      </div>
    </>
  )
}
