import { describe, expect, it } from 'vitest'
import { guessCoords, isBadTravelWeather, weatherCodeInfo, type DailyForecast } from './weather'

function forecast(overrides: Partial<DailyForecast>): DailyForecast {
  return { date: '2026-07-25', tempMax: 30, tempMin: 24, precipitationSum: 0, weatherCode: 0, ...overrides }
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

describe('weatherCodeInfo', () => {
  it('geeft een label en emoji voor bekende WMO-codes', () => {
    expect(weatherCodeInfo(0).label).toBe('Helder')
    expect(weatherCodeInfo(95).label).toBe('Onweer')
  })

  it('valt terug op een neutrale waarde voor onbekende codes', () => {
    expect(weatherCodeInfo(9999).label).toBe('Onbekend')
  })
})

describe('isBadTravelWeather', () => {
  it('waarschuwt bij veel neerslag, ook zonder onweer-code', () => {
    expect(isBadTravelWeather(forecast({ precipitationSum: 25, weatherCode: 61 }))).toBe(true)
  })

  it('waarschuwt bij onweer, ook met weinig neerslag', () => {
    expect(isBadTravelWeather(forecast({ precipitationSum: 1, weatherCode: 95 }))).toBe(true)
  })

  it('waarschuwt niet bij droog, helder weer', () => {
    expect(isBadTravelWeather(forecast({ precipitationSum: 0, weatherCode: 1 }))).toBe(false)
  })
})
