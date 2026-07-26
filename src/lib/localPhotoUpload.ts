import { isHeicFile } from '../utils/imageFormat'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Kon foto niet lezen'))
    reader.readAsDataURL(blob)
  })
}

/**
 * HEIC (het standaardformaat van de iPhone-camera) is niet overal weer te geven (bv. niet in
 * Chrome/Firefox) — zet 'm daarom vóór het uploaden om naar JPEG. Decoderen kan alleen
 * betrouwbaar in Safari/WebKit (native HEIC-ondersteuning), maar dat is toevallig ook de
 * browser waarmee je foto's rechtstreeks uit de iPhone-galerij kiest.
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kon de foto niet omzetten (canvas niet beschikbaar)')
  ctx.drawImage(bitmap, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Kon de foto niet omzetten naar JPEG'))), 'image/jpeg', 0.9)
  })
}

/** Bereidt een rechtstreeks van dit toestel gekozen foto voor op upload: HEIC wordt eerst naar JPEG omgezet. */
export async function prepareFileForUpload(file: File): Promise<{ base64: string; contentType: string }> {
  if (isHeicFile(file)) {
    const jpeg = await convertHeicToJpeg(file)
    return { base64: await blobToBase64(jpeg), contentType: 'image/jpeg' }
  }
  return { base64: await blobToBase64(file), contentType: file.type || 'image/jpeg' }
}
