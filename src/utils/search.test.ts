import { describe, expect, it } from 'vitest'
import { matchesQuery } from './search'

describe('matchesQuery', () => {
  const record = { location: 'Puerto Princesa', notes: 'Optioneel: discover dive' }

  it('matcht op een veldwaarde, ongeacht hoofdletters', () => {
    expect(matchesQuery(record, 'PUERTO')).toBe(true)
  })

  it('matcht op een geneste/andere veldwaarde', () => {
    expect(matchesQuery(record, 'discover')).toBe(true)
  })

  it('geeft false als niets matcht', () => {
    expect(matchesQuery(record, 'Amsterdam')).toBe(false)
  })

  it('matcht alles bij een lege zoekopdracht', () => {
    expect(matchesQuery(record, '')).toBe(true)
  })
})
