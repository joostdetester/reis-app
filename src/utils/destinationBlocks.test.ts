import { describe, expect, it } from 'vitest'
import { buildDestinationBlocks, sharedBoundaryDayIds } from './destinationBlocks'
import type { TripDay } from '../types/trip'

function day(date: string, island: string, location: string = island): TripDay {
  return {
    id: date,
    trip_id: 't',
    travel_date: date,
    location,
    island,
    day_type: 'reisdag',
    morning_text: null,
    afternoon_text: null,
    evening_text: null,
    notes: null,
    sort_order: 0,
    updated_at: '',
  }
}

describe('buildDestinationBlocks', () => {
  it('splitst een transferdag als laatste dag van het ene en eerste dag van het volgende blok', () => {
    const days = [day('2026-07-24', 'Luzon'), day('2026-07-25', 'Luzon → Palawan'), day('2026-07-26', 'Palawan')]
    const blocks = buildDestinationBlocks(days)

    expect(blocks.map((b) => b.name)).toEqual(['Luzon', 'Palawan'])
    expect(blocks[0].days.map((d) => d.travel_date)).toEqual(['2026-07-24', '2026-07-25'])
    expect(blocks[1].days.map((d) => d.travel_date)).toEqual(['2026-07-25', '2026-07-26'])
  })

  it('vertaalt "Europa" naar "Amsterdam"', () => {
    const blocks = buildDestinationBlocks([day('2026-07-23', 'Europa')])
    expect(blocks.map((b) => b.name)).toEqual(['Amsterdam'])
  })

  it('maakt twee aparte blokken voor eenzelfde bestemming die niet-aaneengesloten opnieuw wordt bezocht', () => {
    const days = [
      day('2026-07-24', 'Luzon'),
      day('2026-07-25', 'Luzon → Palawan'),
      day('2026-08-11', 'Siargao → Luzon'),
      day('2026-08-12', 'Luzon'),
    ]
    const blocks = buildDestinationBlocks(days)
    const luzonBlocks = blocks.filter((b) => b.name === 'Luzon')
    expect(luzonBlocks).toHaveLength(2)
    expect(luzonBlocks[0].days.map((d) => d.travel_date)).toEqual(['2026-07-24', '2026-07-25'])
    expect(luzonBlocks[1].days.map((d) => d.travel_date)).toEqual(['2026-08-11', '2026-08-12'])
  })

  it('splitst Palawan verder op in Puerto Princesa en El Nido, met de overgangsdag gedeeld', () => {
    const days = [
      day('2026-07-25', 'Palawan', 'Manila → Puerto Princesa'),
      day('2026-07-26', 'Palawan', 'Puerto Princesa'),
      day('2026-07-27', 'Palawan', 'Puerto Princesa'),
      day('2026-07-28', 'Palawan', 'Puerto Princesa → El Nido'),
      day('2026-07-29', 'Palawan', 'El Nido'),
      day('2026-08-01', 'Palawan', 'El Nido → Cebu City'),
    ]
    const blocks = buildDestinationBlocks(days)

    expect(blocks.map((b) => b.name)).toEqual(['Palawan - Puerto Princesa', 'Palawan - El Nido'])
    expect(blocks[0].days.map((d) => d.travel_date)).toEqual(['2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28'])
    expect(blocks[1].days.map((d) => d.travel_date)).toEqual(['2026-07-28', '2026-07-29', '2026-08-01'])
  })

  it('splitst Cebu op in Cebu City en Moalboal ook zonder pijl in de locatietekst', () => {
    const days = [
      day('2026-08-01', 'Cebu', 'El Nido → Cebu City'),
      day('2026-08-02', 'Cebu', 'Cebu City'),
      day('2026-08-04', 'Cebu', 'Moalboal'),
      day('2026-08-07', 'Cebu', 'Moalboal → Siargao'),
    ]
    const blocks = buildDestinationBlocks(days)

    expect(blocks.map((b) => b.name)).toEqual(['Cebu - Cebu City', 'Cebu - Moalboal'])
    expect(blocks[0].days.map((d) => d.travel_date)).toEqual(['2026-08-01', '2026-08-02'])
    expect(blocks[1].days.map((d) => d.travel_date)).toEqual(['2026-08-04', '2026-08-07'])
  })
})

describe('sharedBoundaryDayIds', () => {
  it('herkent de overstapdag tussen twee blokken, maar geen gewone dagen', () => {
    const days = [day('2026-07-24', 'Luzon'), day('2026-07-25', 'Luzon → Palawan'), day('2026-07-26', 'Palawan')]
    const blocks = buildDestinationBlocks(days)

    expect(sharedBoundaryDayIds(blocks)).toEqual(new Set(['2026-07-25']))
  })
})
