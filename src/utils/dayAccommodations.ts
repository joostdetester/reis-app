import type { Accommodation, TripDay, TripDayAccommodation } from '../types/trip'

export interface DayAccommodationInfo {
  accommodation: Accommodation
  /** Dit is de eerste dag van het verblijf in dit hotel (aankomstdag). */
  isCheckIn: boolean
  /** Dit is de laatste dag van het verblijf in dit hotel (vertrekdag). */
  isCheckOut: boolean
}

/** Per trip_day_id: welk hotel daar hoort, en of het de aankomst- of vertrekdag is. */
export function buildDayAccommodationMap(
  days: TripDay[],
  links: TripDayAccommodation[],
  accommodations: Accommodation[],
): Map<string, DayAccommodationInfo> {
  const accommodationById = new Map(accommodations.map((a) => [a.id, a]))
  const dayById = new Map(days.map((d) => [d.id, d]))

  const daysByAccommodation = new Map<string, TripDay[]>()
  for (const link of links) {
    const day = dayById.get(link.trip_day_id)
    if (!day) continue
    const list = daysByAccommodation.get(link.accommodation_id) ?? []
    list.push(day)
    daysByAccommodation.set(link.accommodation_id, list)
  }

  const result = new Map<string, DayAccommodationInfo>()
  for (const [accommodationId, accommodationDays] of daysByAccommodation) {
    const accommodation = accommodationById.get(accommodationId)
    if (!accommodation) continue

    const sorted = [...accommodationDays].sort((a, b) => a.sort_order - b.sort_order)
    const firstDayId = sorted[0].id
    const lastDayId = sorted[sorted.length - 1].id

    for (const day of sorted) {
      result.set(day.id, {
        accommodation,
        isCheckIn: day.id === firstDayId,
        isCheckOut: day.id === lastDayId,
      })
    }
  }
  return result
}
