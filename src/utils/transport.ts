import type { TransportItem } from '../types/trip'

/** Vluchten hebben een eigen detailpagina (/transport); ander vervoer (boot, scooter, taxi, ...) niet. */
export function isFlight(item: TransportItem): boolean {
  return /vlucht/i.test(item.type)
}
