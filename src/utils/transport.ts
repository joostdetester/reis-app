import type { TransportItem, TripDay } from '../types/trip'

/** Vluchten hebben een eigen detailpagina (/transport); ander vervoer (boot, scooter, taxi, ...) niet. */
export function isFlight(item: TransportItem): boolean {
  return /vlucht/i.test(item.type)
}

export interface UpcomingFlight {
  flight: TransportItem & { departure_time: string }
  vacationDay: number
}

/** Eerstvolgende vlucht na `now` (of null als er geen meer gepland is), met het vakantiedagnummer waarop 'ie valt. */
export function nextUpcomingFlight(
  days: TripDay[],
  transportItems: TransportItem[],
  now: Date = new Date(),
): UpcomingFlight | null {
  const upcoming = transportItems
    .filter(
      (item): item is TransportItem & { departure_time: string } =>
        isFlight(item) && item.departure_time !== null && new Date(item.departure_time) > now,
    )
    .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime())

  const flight = upcoming[0]
  if (!flight) return null

  const vacationDay = days.findIndex((day) => day.id === flight.trip_day_id) + 1
  return { flight, vacationDay }
}
