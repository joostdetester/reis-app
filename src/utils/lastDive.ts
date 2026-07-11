import type { Destination, TransportItem, TripDay } from '../types/trip'
import { dayPartOf, fmtLocalDateTime, guessTimeZone, subtractHours } from './dates'
import { buildDestinationBlocks } from './destinationBlocks'

export interface LastDiveInfo {
  islandName: string
  lastDayId: string
  text: string
}

/**
 * Per bestemmingsblok met duikcentra: op welke dag (de laatste volledige dag van dat blok) mag je
 * voor het laatst duiken, gegeven de 18-uursregel voor vliegen na duiken. Gebruikt dezelfde
 * bestemmingsblokken als de Bestemmingen-pagina (dus ook "Palawan - El Nido" en "Cebu - Moalboal"
 * los van hun buurblok), omdat elk sub-blok zijn eigen duikcentra en vertrekvlucht heeft. De
 * overgangsdag zelf (de laatste dag van het blok) is de dag van de vlucht, niet een duikdag.
 */
export function computeLastDiveInfo(
  days: TripDay[],
  destinations: Destination[],
  transportItems: TransportItem[],
): LastDiveInfo[] {
  const blocks = buildDestinationBlocks(days)
  const destinationByName = new Map(destinations.map((d) => [d.name, d]))

  const results: LastDiveInfo[] = []
  for (const block of blocks) {
    const diveShops = destinationByName.get(block.name)?.dive_shops
    if (!diveShops || diveShops.length === 0) continue
    if (block.days.length < 2) continue

    const transferDay = block.days[block.days.length - 1]
    const flight = transportItems.find(
      (t) => t.trip_day_id === transferDay.id && /vlucht/i.test(t.type) && t.departure_time,
    )
    if (!flight?.departure_time) continue

    const lastFullDay = block.days[block.days.length - 2]
    const lastDiveMoment = subtractHours(flight.departure_time, 18)
    const zone = guessTimeZone(flight.origin)
    const part = dayPartOf(lastDiveMoment, zone)
    const text = `🤿 Laatste duik: ${fmtLocalDateTime(lastDiveMoment.toISOString(), flight.origin)} (${part}) — min. 18u voor de vlucht${flight.booking_reference ? ` (${flight.booking_reference})` : ''}`

    results.push({ islandName: block.name, lastDayId: lastFullDay.id, text })
  }
  return results
}
