import type { Destination, TransportItem, TripDay } from '../types/trip'
import { dayPartOf, fmtLocalDateTime, guessTimeZone, subtractHours } from './dates'

export interface LastDiveInfo {
  islandName: string
  lastDayId: string
  text: string
}

/** De vlucht die het eiland verlaat: de eerste vervoersregel op de dag ná de laatste dag van dit eiland. */
function findDepartureFlight(
  islandDays: TripDay[],
  allDays: TripDay[],
  transportItems: TransportItem[],
): TransportItem | null {
  const lastDay = islandDays[islandDays.length - 1]
  const nextDay = allDays.find((d) => d.sort_order === lastDay.sort_order + 1)
  if (!nextDay) return null
  return transportItems.find((t) => t.trip_day_id === nextDay.id && t.departure_time) ?? null
}

/** Per eiland met duikcentra: op welke dag (de laatste van dat eiland) mag je voor het laatst duiken, gegeven de 18-uursregel voor vliegen na duiken. */
export function computeLastDiveInfo(
  days: TripDay[],
  destinations: Destination[],
  transportItems: TransportItem[],
): LastDiveInfo[] {
  const groups = new Map<string, TripDay[]>()
  for (const day of days) {
    const list = groups.get(day.island) ?? []
    list.push(day)
    groups.set(day.island, list)
  }
  const destinationByName = new Map(destinations.map((d) => [d.name, d]))

  const results: LastDiveInfo[] = []
  for (const [island, items] of groups) {
    const diveShops = destinationByName.get(island)?.dive_shops
    if (!diveShops || diveShops.length === 0) continue

    const flight = findDepartureFlight(items, days, transportItems)
    if (!flight?.departure_time) continue

    const lastDiveMoment = subtractHours(flight.departure_time, 18)
    const zone = guessTimeZone(flight.origin)
    const part = dayPartOf(lastDiveMoment, zone)
    const text = `🤿 Laatste duik: ${fmtLocalDateTime(lastDiveMoment.toISOString(), flight.origin)} (${part}) — min. 18u voor de vlucht${flight.booking_reference ? ` (${flight.booking_reference})` : ''}`

    results.push({ islandName: island, lastDayId: items[items.length - 1].id, text })
  }
  return results
}
