/**
 * HEIC/HEIF (het standaardformaat van de iPhone-camera) geven browsers via `<input type="file">`
 * niet altijd een mimetype mee (vaak leeg of `application/octet-stream`) — daarom ook op de
 * bestandsextensie controleren.
 */
export function isHeicFile(file: { type: string; name: string }): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true
  return /\.(heic|heif)$/i.test(file.name)
}
