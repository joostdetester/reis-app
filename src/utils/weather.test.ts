import { describe, expect, it } from 'vitest'
import { arrivalLocation, beachScore, guessCoords, weatherCodeInfo, type DailyForecast } from './weather'

function forecast(overrides: Partial<DailyForecast>): DailyForecast {
  return {
    date: '2026-07-25',
    tempMax: 30,
    tempMin: 24,
    precipitationSum: 0,
    weatherCode: 0,
    windSpeedMax: 10,
    ...overrides,
  }
}

describe('guessCoords', () => {
  it('herkent bekende bestemmingen', () => {
    expect(guessCoords('El Nido')).toEqual({ lat: 11.1949, lon: 119.4079 })
    expect(guessCoords('Amsterdam (AMS)')).toEqual({ lat: 52.3676, lon: 4.9041 })
  })

  it('valt terug op Manila voor onbekende of ontbrekende locaties', () => {
    expect(guessCoords('Onbekende plek')).toEqual({ lat: 14.5995, lon: 120.9842 })
    expect(guessCoords(null)).toEqual({ lat: 14.5995, lon: 120.9842 })
  })
})

describe('arrivalLocation', () => {
  it('geeft het laatste deel van een transferdag met liggend streepje', () => {
    expect(arrivalLocation('Amsterdam - Muscat')).toBe('Muscat')
    expect(arrivalLocation('Muscat - Manila')).toBe('Manila')
  })

  it('geeft het laatste deel van een transferdag met pijl', () => {
    expect(arrivalLocation('Manila → Puerto Princesa')).toBe('Puerto Princesa')
  })

  it('geeft de locatie ongewijzigd terug zonder scheidingsteken', () => {
    expect(arrivalLocation('El Nido')).toBe('El Nido')
    expect(arrivalLocation('Siargao/Surigao')).toBe('Siargao/Surigao')
  })
})

describe('weatherCodeInfo', () => {
  it('geeft een label en emoji voor bekende WMO-codes', () => {
    expect(weatherCodeInfo(0).label).toBe('Helder')
    expect(weatherCodeInfo(95).label).toBe('Onweer')
  })

  it('valt terug op een neutrale waarde voor onbekende codes', () => {
    expect(weatherCodeInfo(9999).label).toBe('Onbekend')
  })
})

describe('beachScore', () => {
  it('geeft een hoog cijfer bij droog, warm, windstil weer', () => {
    const { score, label } = beachScore(forecast({ tempMax: 31, precipitationSum: 0, windSpeedMax: 10 }))
    expect(score).toBe(10)
    expect(label).toBe('Uitstekend strandweer')
  })

  it('trekt punten af voor neerslag', () => {
    const { score } = beachScore(forecast({ precipitationSum: 15 }))
    expect(score).toBe(7)
  })

  it('trekt punten af voor veel wind', () => {
    const { score } = beachScore(forecast({ windSpeedMax: 45 }))
    expect(score).toBe(7)
  })

  it('trekt punten af voor een koele dag', () => {
    const { score } = beachScore(forecast({ tempMax: 22 }))
    expect(score).toBe(7)
  })

  it('cijfer zakt nooit onder 0', () => {
    const { score, label } = beachScore(forecast({ tempMax: 20, precipitationSum: 60, windSpeedMax: 50 }))
    expect(score).toBe(0)
    expect(label).toBe('Slecht strandweer')
  })
})
