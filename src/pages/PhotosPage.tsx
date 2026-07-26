import { useEffect, useRef, useState } from 'react'
import { useTripDays } from '../hooks/useTripDays'
import { useDayPhotos } from '../hooks/useDayPhotos'
import { useHasEditAccess } from '../lib/editAccessContext'
import { uploadDayPhotoFile } from '../lib/uploadDayPhoto'
import { prepareFileForUpload } from '../lib/localPhotoUpload'
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

function DayPhotosCard({
  day,
  photos,
  onOpenPhoto,
  onPhotosChanged,
}: {
  day: TripDay
  photos: DayPhoto[]
  onOpenPhoto: (photoId: string) => void
  onPhotosChanged: () => void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const hasAccess = useHasEditAccess()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /** Upload van één rechtstreeks van dit toestel gekozen bestand, met één automatische
   * herkansing: een los netwerkhaperinkje mag niet meteen de hele foto laten mislukken,
   * laat staan de rest van de batch blokkeren. */
  async function importOneFile(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { base64, contentType } = await prepareFileForUpload(file)
        await uploadDayPhotoFile(day.id, file.name, base64, contentType)
        return { ok: true }
      } catch (err) {
        if (attempt === 1) {
          const message = err instanceof Error ? err.message : 'Importeren is mislukt'
          return { ok: false, error: `${file.name}: ${message}` }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    return { ok: false, error: `${file.name}: Importeren is mislukt` }
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    setBusy(true)
    setError(null)
    try {
      const failures: string[] = []
      let successCount = 0
      for (let i = 0; i < files.length; i++) {
        setStatus(`Bezig met uploaden (${i + 1}/${files.length})…`)
        const result = await importOneFile(files[i])
        if (result.ok) successCount++
        else failures.push(result.error)
      }

      if (successCount > 0) onPhotosChanged()

      if (failures.length > 0) {
        setError(`${successCount} van ${files.length} foto's toegevoegd. Mislukt: ${failures.join('; ')}`)
        setStatus(null)
      } else {
        setStatus(`${files.length} foto's toegevoegd.`)
      }
    } finally {
      setBusy(false)
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void handleFilesSelected(e.target.files)
              e.target.value = ''
            }}
            data-testid={`day-photos-${day.id}-device-input`}
          />
          <button
            className="chip"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            data-testid={`day-photos-${day.id}-add`}
          >
            📱 Foto's kiezen van dit toestel
          </button>
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
  const { dayPhotos, loading: loadingPhotos, error: errorPhotos, refetch: refetchDayPhotos } = useDayPhotos()
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
    <div data-testid="page-photos">
      <h2 className="section-title">Foto's</h2>
      <div className="grid">
        {days.map((day) => (
          <DayPhotosCard
            key={day.id}
            day={day}
            photos={photosByDay.get(day.id) ?? []}
            onOpenPhoto={openPhoto}
            onPhotosChanged={() => void refetchDayPhotos()}
          />
        ))}
      </div>
      {openIndex !== null && (
        <Lightbox entries={entries} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
      )}
    </div>
  )
}
