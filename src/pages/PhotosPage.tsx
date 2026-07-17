import { useEffect, useRef, useState } from 'react'
import { useTripDays } from '../hooks/useTripDays'
import { useDayPhotos } from '../hooks/useDayPhotos'
import { useHasEditAccess } from '../lib/editAccessContext'
import { GOOGLE_CLIENT_ID, requestGooglePhotosAccessToken } from '../lib/googlePhotosAuth'
import {
  getGoogleAccessToken,
  setGoogleAccessToken as cacheGoogleAccessToken,
} from '../lib/googleSession'
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

function dayPhotoUrl(storagePath: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/day-photos/${storagePath}`
}

/** Foto met een verwijderknop (alleen met edit-token, met een expliciete bevestigingsstap) en een klik om 'm vergroot te bekijken. */
function PhotoThumbnail({ photo, onOpen }: { photo: DayPhoto; onOpen: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAccess = useHasEditAccess()

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
    <div className="photo-thumb" data-testid={`photo-thumb-${photo.id}`}>
      <img
        src={dayPhotoUrl(photo.storage_path)}
        alt=""
        loading="lazy"
        onClick={onOpen}
        data-testid={`photo-thumb-${photo.id}-image`}
      />
      {hasAccess &&
        (confirming ? (
          <div className="photo-thumb-confirm">
            {error ? (
              <button onClick={reset} aria-label={error} data-testid={`photo-thumb-${photo.id}-error`}>
                ⚠️
              </button>
            ) : (
              <>
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  data-testid={`photo-thumb-${photo.id}-delete-confirm`}
                >
                  {deleting ? '…' : 'Ja'}
                </button>
                <button
                  onClick={reset}
                  disabled={deleting}
                  data-testid={`photo-thumb-${photo.id}-delete-cancel`}
                >
                  Nee
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            className="photo-thumb-delete"
            onClick={() => setConfirming(true)}
            aria-label="Foto verwijderen"
            data-testid={`photo-thumb-${photo.id}-delete`}
          >
            ×
          </button>
        ))}
    </div>
  )
}

/**
 * Zolang er nog geen gedeeld Google-toegangstoken is (deze paginabezoek), zijn het twee
 * losse tikken: mobiele browsers (vooral iOS Safari) staan meestal maar één pop-up per
 * directe gebruikersactie toe, en inloggen bij Google (via GIS) opent zelf al een pop-up.
 * Is er al een gedeeld token (van een andere dag op deze pagina eerder ingelogd), dan is
 * er nog maar één pop-up nodig (het keuzescherm zelf) — dus dan is het één tik: direct
 * "Open keuzescherm", dat zelf eerst (zonder pop-up) een nieuwe sessie aanmaakt.
 */
function DayPhotosCard({
  day,
  photos,
  onOpenPhoto,
  accessToken,
  onAccessToken,
}: {
  day: TripDay
  photos: DayPhoto[]
  onOpenPhoto: (photoId: string) => void
  accessToken: string | null
  onAccessToken: (token: string | null) => void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState<PickerSession | null>(null)
  const hasAccess = useHasEditAccess()

  async function handlePrepare() {
    if (!GOOGLE_CLIENT_ID) {
      setError('Foto-import is nog niet geconfigureerd (ontbrekende Google-client-ID).')
      return
    }
    setBusy(true)
    setError(null)
    setStatus('Inloggen bij Google…')
    try {
      const { accessToken: token, expiresInSeconds } = await requestGooglePhotosAccessToken(GOOGLE_CLIENT_ID)
      cacheGoogleAccessToken(token, expiresInSeconds)
      onAccessToken(token)
      setStatus('Google Photos-sessie voorbereiden…')
      setSession(await createPickerSession(token))
      setStatus('Klik op "Open keuzescherm" om foto\'s te kiezen.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen bij Google is mislukt')
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  function handleOpenPicker() {
    if (!session || !accessToken) return
    // Rechtstreeks in deze klik-handler, dus geen aparte async stap ervoor: dit is de
    // enige pop-up die uit déze tik voortkomt.
    window.open(session.pickerUri, '_blank', 'noopener,noreferrer')
    void handleAfterPicking(accessToken, session)
  }

  /** Al ingelogd via een andere dag: sessie aanmaken (geen pop-up) én meteen openen, in één tik. */
  async function handleQuickOpen() {
    if (!accessToken) return
    setBusy(true)
    setError(null)
    setStatus('Google Photos-sessie voorbereiden…')
    try {
      const newSession = await createPickerSession(accessToken)
      window.open(newSession.pickerUri, '_blank', 'noopener,noreferrer')
      void handleAfterPicking(accessToken, newSession)
    } catch (err) {
      // Token waarschijnlijk verlopen: terug naar de inlogknop voor de volgende poging.
      onAccessToken(null)
      setError(err instanceof Error ? err.message : 'Kon geen Google Photos-sessie starten, log opnieuw in')
      setStatus(null)
      setBusy(false)
    }
  }

  async function handleAfterPicking(token: string, activeSession: PickerSession) {
    setBusy(true)
    setError(null)
    setStatus("Kies foto's in het geopende tabblad…")
    try {
      await waitForSelection(activeSession.id, token)

      setStatus("Foto's ophalen…")
      const items = (await listSelectedMediaItems(activeSession.id, token)).filter((item) => item.type === 'PHOTO')

      for (let i = 0; i < items.length; i++) {
        setStatus(`Bezig met uploaden (${i + 1}/${items.length})…`)
        const { base64, contentType, filename } = await downloadMediaItem(items[i], token)
        await uploadDayPhoto(day.id, filename, contentType, base64)
      }
      setStatus(items.length > 0 ? `${items.length} foto's toegevoegd.` : "Geen foto's gekozen.")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Importeren is mislukt')
      setStatus(null)
    } finally {
      setBusy(false)
      setSession(null)
    }
  }

  return (
    <div className="list-card" data-testid={`day-photos-${day.id}`}>
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
      {hasAccess && (
        <>
          {session ? (
            <button className="chip" onClick={handleOpenPicker} disabled={busy} data-testid={`day-photos-${day.id}-add`}>
              ➡️ Open keuzescherm
            </button>
          ) : accessToken ? (
            <button
              className="chip"
              onClick={() => void handleQuickOpen()}
              disabled={busy}
              data-testid={`day-photos-${day.id}-add`}
            >
              ➡️ Open keuzescherm
            </button>
          ) : (
            <button
              className="chip"
              onClick={() => void handlePrepare()}
              disabled={busy}
              data-testid={`day-photos-${day.id}-add`}
            >
              📷 Foto's kiezen uit Google Photos
            </button>
          )}
          {status && (
            <div className="muted" style={{ marginTop: 8 }} data-testid={`day-photos-${day.id}-status`}>
              {status}
            </div>
          )}
          {error && (
            <div className="notice" data-testid={`day-photos-${day.id}-error`}>
              {error}
            </div>
          )}
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
const MIN_SCALE = 1
const MAX_SCALE = 4

type GestureMode = 'idle' | 'swipe' | 'pinch' | 'pan'

function touchDistance(touches: React.TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

/**
 * Vergrote foto met navigatie (swipe + knoppen) door alle foto's van de reis, chronologisch
 * over dagen heen, plus pinch-to-zoom en (bij ingezoomd) verslepen met één vinger. Swipen om
 * naar de vorige/volgende foto te gaan werkt alleen als er niet is ingezoomd.
 */
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
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const gestureMode = useRef<GestureMode>('idle')
  const touchStartX = useRef(0)
  const pinchStartDistance = useRef(0)
  const pinchStartScale = useRef(1)
  const panStart = useRef({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })

  const entry = entries[index]

  // Bij het wisselen van foto (navigeren, of opnieuw openen) altijd weer uitgezoomd tonen.
  useEffect(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [index])

  if (!entry) return null

  function goPrev() {
    if (index > 0) onNavigate(index - 1)
  }
  function goNext() {
    if (index < entries.length - 1) onNavigate(index + 1)
  }

  /** Voorkomt dat de foto bij verslepen helemaal van het scherm verdwijnt. */
  function clampTranslate(x: number, y: number, atScale: number): { x: number; y: number } {
    const img = imgRef.current
    const body = bodyRef.current
    if (!img || !body) return { x, y }
    const maxX = Math.max(0, (img.offsetWidth * atScale - body.offsetWidth) / 2)
    const maxY = Math.max(0, (img.offsetHeight * atScale - body.offsetHeight) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      gestureMode.current = 'pinch'
      pinchStartDistance.current = touchDistance(e.touches)
      pinchStartScale.current = scale
    } else if (e.touches.length === 1) {
      if (scale > MIN_SCALE) {
        gestureMode.current = 'pan'
        panStart.current = { x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y }
      } else {
        gestureMode.current = 'swipe'
        touchStartX.current = e.touches[0].clientX
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (gestureMode.current === 'pinch' && e.touches.length === 2) {
      const ratio = touchDistance(e.touches) / pinchStartDistance.current
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.current * ratio))
      setScale(nextScale)
      setTranslate((current) => clampTranslate(current.x, current.y, nextScale))
    } else if (gestureMode.current === 'pan' && e.touches.length === 1) {
      const next = { x: e.touches[0].clientX - panStart.current.x, y: e.touches[0].clientY - panStart.current.y }
      setTranslate(clampTranslate(next.x, next.y, scale))
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (gestureMode.current === 'swipe' && e.touches.length === 0) {
      const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
      if (delta > SWIPE_THRESHOLD_PX) goPrev()
      else if (delta < -SWIPE_THRESHOLD_PX) goNext()
    }

    if (e.touches.length === 1 && gestureMode.current === 'pinch') {
      // Eén vinger losgelaten na een knijpgebaar: direct door kunnen slepen als er is ingezoomd.
      if (scale > MIN_SCALE) {
        gestureMode.current = 'pan'
        panStart.current = { x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y }
      } else {
        gestureMode.current = 'idle'
      }
    } else if (e.touches.length === 0) {
      gestureMode.current = 'idle'
      if (scale <= MIN_SCALE) {
        setScale(1)
        setTranslate({ x: 0, y: 0 })
      }
    }
  }

  return (
    <div className="lightbox" onClick={onClose} data-testid="lightbox">
      <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="lightbox-date" data-testid="lightbox-date">
            {fmtDate(entry.day.travel_date)}
          </div>
          <div className="lightbox-location" data-testid="lightbox-location">
            {entry.day.location}
          </div>
        </div>
        <button className="lightbox-close" onClick={onClose} aria-label="Sluiten" data-testid="lightbox-close">
          ×
        </button>
      </div>
      <div
        ref={bodyRef}
        className="lightbox-body"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {index > 0 && scale === MIN_SCALE && (
          <button
            className="lightbox-nav lightbox-prev"
            onClick={goPrev}
            aria-label="Vorige foto"
            data-testid="lightbox-prev"
          >
            ‹
          </button>
        )}
        <img
          ref={imgRef}
          src={dayPhotoUrl(entry.photo.storage_path)}
          alt=""
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` }}
          data-testid="lightbox-image"
        />
        {index < entries.length - 1 && scale === MIN_SCALE && (
          <button
            className="lightbox-nav lightbox-next"
            onClick={goNext}
            aria-label="Volgende foto"
            data-testid="lightbox-next"
          >
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
  // Eén Google-toegangstoken voor alle dagen én voor "Inloggen met Google" in de header: is er
  // al een (nog geldig) gedeeld token — bv. via de inlogknop — dan tonen alle dagen meteen
  // "Open keuzescherm" i.p.v. opnieuw "Foto's kiezen uit Google Photos".
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => getGoogleAccessToken())

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
    <div data-testid="page-photos">
      <h2 className="section-title">Foto's</h2>
      <div className="grid">
        {days.map((day) => (
          <DayPhotosCard
            key={day.id}
            day={day}
            photos={photosByDay.get(day.id) ?? []}
            onOpenPhoto={openPhoto}
            accessToken={googleAccessToken}
            onAccessToken={setGoogleAccessToken}
          />
        ))}
      </div>
      {openIndex !== null && (
        <Lightbox entries={entries} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
      )}
    </div>
  )
}
