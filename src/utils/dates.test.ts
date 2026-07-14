import { describe, expect, it } from 'vitest'
import {
  countdownTo,
  fmtDate,
  fromDatetimeLocalValue,
  hoursUntil,
  shortDate,
  todayIndex,
  todayIso,
  toDatetimeLocalValue,
} from './dates'

describe('fmtDate', () => {
  it('formatteert een ISO-datum als volledige Nederlandse datum', () => {
    expect(fmtDate('2026-07-23')).toBe('donderdag 23 juli')
  })
})

describe('shortDate', () => {
  it('formatteert een ISO-datum als dd-mm', () => {
    expect(shortDate('2026-07-23')).toBe('23-07')
  })
})

describe('todayIndex', () => {
  const days = [
    { travel_date: '2026-07-23' },
    { travel_date: '2026-07-24' },
    { travel_date: '2026-07-25' },
  ]

  it('vindt de index van vandaag', () => {
    expect(todayIndex(days, new Date('2026-07-24T10:00:00'))).toBe(1)
  })

  it('valt terug op 0 als vandaag niet in de lijst voorkomt', () => {
    expect(todayIndex(days, new Date('2026-01-01T10:00:00'))).toBe(0)
  })

  it('vindt de laatste dag als vandaag de laatste reisdag is', () => {
    expect(todayIndex(days, new Date('2026-07-25T23:00:00'))).toBe(2)
  })
})

describe('todayIso', () => {
  it('geeft de datum in YYYY-MM-DD', () => {
    expect(todayIso(new Date('2026-07-23T15:30:00Z'))).toBe('2026-07-23')
  })
})

describe('countdownTo', () => {
  it('telt af in hele dagen wanneer vertrek in de toekomst ligt', () => {
    const result = countdownTo('2026-07-23T20:25:00', new Date('2026-07-21T20:25:00'))
    expect(result).toEqual({ text: '2 dagen', isStarted: false })
  })

  it('gebruikt enkelvoud binnen 1 dag', () => {
    const result = countdownTo('2026-07-23T20:25:00', new Date('2026-07-22T20:26:00'))
    expect(result.text).toBe('1 dag')
  })

  it('meldt dat de reis gestart is als het vertrekmoment voorbij is', () => {
    const result = countdownTo('2026-07-23T20:25:00', new Date('2026-07-24T00:00:00'))
    expect(result).toEqual({ text: 'Reis gestart', isStarted: true })
  })
})

describe('hoursUntil', () => {
  it('rondt uren naar boven af', () => {
    expect(hoursUntil('2026-07-23T20:00:00', new Date('2026-07-23T18:30:00'))).toBe(2)
  })

  it('geeft null als het tijdstip al voorbij is', () => {
    expect(hoursUntil('2026-07-23T20:00:00', new Date('2026-07-23T21:00:00'))).toBeNull()
  })
})

describe('toDatetimeLocalValue', () => {
  it('toont een UTC-tijdstip in de klokstijd van Asia/Manila (UTC+8)', () => {
    expect(toDatetimeLocalValue('2026-07-25T01:50:00Z', 'Asia/Manila')).toBe('2026-07-25T09:50')
  })

  it('toont een UTC-tijdstip in de klokstijd van Europe/Amsterdam (zomertijd, UTC+2)', () => {
    expect(toDatetimeLocalValue('2026-07-23T18:25:00Z', 'Europe/Amsterdam')).toBe('2026-07-23T20:25')
  })
})

describe('fromDatetimeLocalValue', () => {
  it('zet klokstijd in Asia/Manila om naar UTC', () => {
    expect(fromDatetimeLocalValue('2026-07-25T09:50', 'Asia/Manila')).toBe('2026-07-25T01:50:00.000Z')
  })

  it('zet klokstijd in Europe/Amsterdam (zomertijd) om naar UTC', () => {
    expect(fromDatetimeLocalValue('2026-07-23T20:25', 'Europe/Amsterdam')).toBe('2026-07-23T18:25:00.000Z')
  })

  it('is de omgekeerde van toDatetimeLocalValue', () => {
    const iso = '2026-08-13T09:10:00Z'
    const local = toDatetimeLocalValue(iso, 'Asia/Muscat')
    expect(fromDatetimeLocalValue(local, 'Asia/Muscat')).toBe(new Date(iso).toISOString())
  })
})
