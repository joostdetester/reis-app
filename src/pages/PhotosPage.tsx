import { useRef, useState } from 'react'
import { useTripDays } from '../hooks/useTripDays'
import { useDayPhotos } from '../hooks/useDayPhotos'
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

/** Foto met een verwijderknop (alleen met edit-token, met een expliciete bevestigingsstap) en een klik om 'm vergroot te bekijken. */
function PhotoThumbnail({ photo, onOpen }: { photo: DayPhoto; onOpen: () => void }) {
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
      <img src={dayPhotoUrl(photo.storage_path)} alt="" loading="lazy" onClick={onOpen} />
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
function DayPhotosCard({
  day,
  photos,
  onOpenPhoto,
}: {
  day: TripDay
  photos: DayPhoto[]
  onOpenPhoto: (photoId: string) => void
}) {
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
            <PhotoThumbnail key={photo.id} photo={photo} onOpen={() => onOpenPhoto(photo.id)} />
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

interface LightboxEntry {
  photo: DayPhoto
  day: TripDay
}

const SWIPE_THRESHOLD_PX = 50

/** Vergrote foto met navigatie (swipe + knoppen) door alle foto's van de reis, chronologisch over dagen heen. */
function Lightbox({
  entries,
  index,
  onClose,
  onNavigate,
}: {
  entries: LightboxEntry[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const touchStartX = useRef<number | null>(null)
  const entry = entries[index]
  if (!entry) return null

  function goPrev() {
    if (index > 0) onNavigate(index - 1)
  }
  function goNext() {
    if (index < entries.length - 1) onNavigate(index + 1)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    if (delta > SWIPE_THRESHOLD_PX) goPrev()
    else if (delta < -SWIPE_THRESHOLD_PX) goNext()
  }

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="lightbox-date">{fmtDate(entry.day.travel_date)}</div>
          <div className="lightbox-location">{entry.day.location}</div>
        </div>
        <button className="lightbox-close" onClick={onClose} aria-label="Sluiten">
          ×
        </button>
      </div>
      <div
        className="lightbox-body"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {index > 0 && (
          <button className="lightbox-nav lightbox-prev" onClick={goPrev} aria-label="Vorige foto">
            ‹
          </button>
        )}
        <img src={dayPhotoUrl(entry.photo.storage_path)} alt="" />
        {index < entries.length - 1 && (
          <button className="lightbox-nav lightbox-next" onClick={goNext} aria-label="Volgende foto">
            ›
          </button>
        )}
      </div>
    </div>
  )
}

export function PhotosPage() {
  const { days, loading: loadingDays, error: errorDays } = useTripDays()
  const { dayPhotos, loading: loadingPhotos, error: errorPhotos } = useDayPhotos()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const loading = loadingDays || loadingPhotos
  if (loading) return <div className="notice">Laden…</div>
  const error = errorDays || errorPhotos
  if (error) return <div className="notice">{error}</div>

  const photosByDay = new Map<string, DayPhoto[]>()
  for (const photo of dayPhotos) {
    const list = photosByDay.get(photo.trip_day_id) ?? []
    list.push(photo)
    photosByDay.set(photo.trip_day_id, list)
  }

  // Chronologisch, over dagen heen: dagen staan al op volgorde, foto's per dag ook (zie useDayPhotos).
  const entries: LightboxEntry[] = []
  for (const day of days) {
    for (const photo of photosByDay.get(day.id) ?? []) {
      entries.push({ photo, day })
    }
  }

  function openPhoto(photoId: string) {
    const index = entries.findIndex((entry) => entry.photo.id === photoId)
    if (index >= 0) setOpenIndex(index)
  }

  return (
    <>
      <h2 className="section-title">Foto's &amp; video's</h2>
      <div className="grid">
        {days.map((day) => (
          <DayPhotosCard key={day.id} day={day} photos={photosByDay.get(day.id) ?? []} onOpenPhoto={openPhoto} />
        ))}
      </div>
      {openIndex !== null && (
        <Lightbox entries={entries} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
      )}
    </>
  )
}
