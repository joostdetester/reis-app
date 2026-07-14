// Client voor de Google Photos Picker API: laat de gebruiker foto's kiezen uit hun
// eigen Google Photos (incl. wat anderen in een gedeeld album hebben gezet) via een
// door Google gehost keuzescherm — wij krijgen alleen de zelf aangewezen foto's terug.
// Documentatie: https://developers.google.com/photos/picker

const API_BASE = 'https://photospicker.googleapis.com/v1'

export interface PickerSession {
  id: string
  pickerUri: string
  mediaItemsSet: boolean
}

interface PickerMediaFile {
  baseUrl: string
  mimeType: string
  filename: string
}

export interface PickerMediaItem {
  id: string
  type: string
  mediaFile?: PickerMediaFile
}

async function apiFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new Error(`Google Photos-fout (${response.status})`)
  return response.json()
}

export function createPickerSession(accessToken: string): Promise<PickerSession> {
  return apiFetch('/sessions', accessToken, { method: 'POST', body: '{}' })
}

function getPickerSession(sessionId: string, accessToken: string): Promise<PickerSession> {
  return apiFetch(`/sessions/${sessionId}`, accessToken)
}

/** Wacht tot de gebruiker klaar is met kiezen in het Google-tabblad (peilt elke paar seconden). */
export async function waitForSelection(sessionId: string, accessToken: string, timeoutMs = 5 * 60_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const session = await getPickerSession(sessionId, accessToken)
    if (session.mediaItemsSet) return
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  throw new Error("Time-out: er zijn geen foto's gekozen binnen 5 minuten")
}

export async function listSelectedMediaItems(sessionId: string, accessToken: string): Promise<PickerMediaItem[]> {
  const result = await apiFetch<{ mediaItems?: PickerMediaItem[] }>(
    `/mediaItems?sessionId=${encodeURIComponent(sessionId)}`,
    accessToken,
  )
  return result.mediaItems ?? []
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Kon foto niet lezen'))
    reader.readAsDataURL(blob)
  })
}

/** Haalt een verkleinde versie van de gekozen foto op (max 1600px) als base64. */
export async function downloadMediaItem(
  item: PickerMediaItem,
  accessToken: string,
): Promise<{ base64: string; contentType: string; filename: string }> {
  if (!item.mediaFile) throw new Error('Geen bruikbaar mediabestand voor dit item')
  const response = await fetch(`${item.mediaFile.baseUrl}=w1600-h1600`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`Kon foto niet downloaden (${response.status})`)
  const blob = await response.blob()
  return { base64: await blobToBase64(blob), contentType: item.mediaFile.mimeType, filename: item.mediaFile.filename }
}
