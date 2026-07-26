import { describe, expect, it } from 'vitest'
import { isHeicFile } from './imageFormat'

describe('isHeicFile', () => {
  it('herkent het image/heic mimetype', () => {
    expect(isHeicFile({ type: 'image/heic', name: 'foto.jpg' })).toBe(true)
  })

  it('herkent het image/heif mimetype', () => {
    expect(isHeicFile({ type: 'image/heif', name: 'foto' })).toBe(true)
  })

  it('valt terug op de bestandsextensie als de browser geen mimetype meegeeft', () => {
    expect(isHeicFile({ type: '', name: 'IMG_1234.HEIC' })).toBe(true)
  })

  it('herkent gewone jpg/png-bestanden niet als HEIC', () => {
    expect(isHeicFile({ type: 'image/jpeg', name: 'foto.jpg' })).toBe(false)
    expect(isHeicFile({ type: 'image/png', name: 'foto.png' })).toBe(false)
  })
})
