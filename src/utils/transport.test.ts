import { describe, expect, it } from 'vitest'
import { nextUpcomingFlight } from './transport'
import type { TransportItem, TripDay } from '../types/trip'

function day(date: string): TripDay {
  return {
    id: date,
    trip_id: 't',
    travel_date: date,
    location: date,
    island: date,
    day_type: 'reisdag',
    morning_text: null,
    afternoon_text: null,
    evening_text: null,
    notes: null,
    sort_order: 0,
    updated_at: '',
  }
}

function flight(tripDayId: string, departureTime: string | null, type = 'Vlucht', bookingReference = 'XX123'): TransportItem {
  return {
    id: `flight-${tripDayId}`,
    trip_id: 't',
    trip_day_id: tripDayId,
    type,
    carrier: null,
    booking_reference: bookingReference,
    origin: 'Manila (MNL)',
    destination: 'Cebu City (CEB)',
    departure_time: departureTime,
    arrival_time: null,
    departure_terminal: null,
    departure_gate: null,
    arrival_terminal: null,
    delay_minutes: null,
    maps_url: null,
    status: null,
    schedule_changed: false,
    updated_at: '',
  }
}

describe('nextUpcomingFlight', () => {
  const days = [day('2026-07-23'), day('2026-07-24'), day('2026-07-25'), day('2026-08-01')]
  const now = new Date('2026-07-24T00:00:00Z')

  it('geeft de eerstvolgende vlucht na nu, met het bijbehorende vakantiedagnummer', () => {
    const items = [
      flight('2026-07-23', '2026-07-23T18:25:00Z', 'Vlucht', 'WY172'),
      flight('2026-07-25', '2026-07-25T01:50:00Z', 'Vlucht', '5J635'),
      flight('2026-08-01', '2026-08-01T08:40:00Z', 'Vlucht', 'DG6255'),
    ]

    const result = nextUpcomingFlight(days, items, now)

    expect(result?.flight.booking_reference).toBe('5J635')
    expect(result?.vacationDay).toBe(3)
  })

  it('negeert vervoer dat geen vlucht is', () => {
    const items = [flight('2026-07-25', '2026-07-25T01:50:00Z', 'Taxi')]
    expect(nextUpcomingFlight(days, items, now)).toBeNull()
  })

  it('negeert vluchten zonder vertrektijd', () => {
    const items = [flight('2026-07-25', null)]
    expect(nextUpcomingFlight(days, items, now)).toBeNull()
  })

  it('geeft null als er geen vlucht meer gepland is', () => {
    const items = [flight('2026-07-23', '2026-07-23T18:25:00Z')]
    expect(nextUpcomingFlight(days, items, now)).toBeNull()
  })
})
