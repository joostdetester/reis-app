import { describe, expect, it } from 'vitest'
import { computeLastDiveInfo } from './lastDive'
import type { Destination, TransportItem, TripDay } from '../types/trip'

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

function destination(name: string, hasDiveShops: boolean): Destination {
  return {
    id: name,
    trip_id: 't',
    name,
    summary: null,
    restaurants: null,
    practical_tips: null,
    bad_weather_alternatives: null,
    dive_shops: hasDiveShops ? [{ name: 'Test Divers', url: '', distance_from_hotel: '', price_indication: '' }] : null,
    photo_url: null,
  }
}

function flight(tripDayId: string, departureTime: string, origin = 'El Nido (ENI)'): TransportItem {
  return {
    id: `flight-${tripDayId}`,
    trip_id: 't',
    trip_day_id: tripDayId,
    type: 'Vlucht',
    carrier: null,
    booking_reference: null,
    origin,
    destination: null,
    departure_time: departureTime,
    arrival_time: null,
    departure_terminal: null,
    departure_gate: null,
    arrival_terminal: null,
    delay_minutes: null,
    maps_url: null,
    status: null,
    updated_at: '',
  }
}

describe('computeLastDiveInfo', () => {
  const days = [
    day('2026-07-25', 'Palawan', 'Manila → Puerto Princesa'),
    day('2026-07-26', 'Palawan', 'Puerto Princesa'),
    day('2026-07-27', 'Palawan', 'Puerto Princesa'),
    day('2026-07-28', 'Palawan', 'Puerto Princesa → El Nido'),
    day('2026-07-29', 'Palawan', 'El Nido'),
    day('2026-07-30', 'Palawan', 'El Nido'),
    day('2026-08-01', 'Palawan → Cebu', 'El Nido → Cebu City'),
    day('2026-08-02', 'Cebu', 'Cebu City'),
  ]

  it('geeft per sub-bestemming (bv. El Nido) een eigen laatste-duik-notitie, niet alleen voor het hele eiland', () => {
    const destinations = [destination('Palawan - Puerto Princesa', true), destination('Palawan - El Nido', true)]
    const transportItems = [flight('2026-08-01', '2026-08-01T09:00:00+08:00', 'El Nido (ENI)')]

    const info = computeLastDiveInfo(days, destinations, transportItems)

    expect(info).toHaveLength(1)
    expect(info[0].islandName).toBe('Palawan - El Nido')
    // 09:00 - 18u = de dag ervoor 15:00, dus de notitie hoort bij de laatste volledige duikdag (30-07), niet de vertrekdag zelf.
    expect(info[0].lastDayId).toBe('2026-07-30')
  })

  it('slaat een sub-bestemming over als de overgang geen vlucht is (bv. een landtransfer)', () => {
    const destinations = [destination('Palawan - Puerto Princesa', true), destination('Palawan - El Nido', true)]
    // Geen vlucht op 2026-07-28 (Puerto Princesa -> El Nido is een landtransfer) en geen vlucht op 2026-08-01 hier.
    const info = computeLastDiveInfo(days, destinations, [])
    expect(info).toHaveLength(0)
  })

  it('slaat een bestemming zonder duikcentra over', () => {
    const destinations = [destination('Palawan - Puerto Princesa', false), destination('Palawan - El Nido', false)]
    const transportItems = [flight('2026-08-01', '2026-08-01T09:00:00+08:00')]
    expect(computeLastDiveInfo(days, destinations, transportItems)).toHaveLength(0)
  })
})
