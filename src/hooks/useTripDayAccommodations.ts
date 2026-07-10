import { useRealtimeTable } from './useRealtimeTable'
import type { TripDayAccommodation } from '../types/trip'

const linkKey = (row: TripDayAccommodation) => `${row.trip_day_id}:${row.accommodation_id}`

export function useTripDayAccommodations() {
  const { rows, loading, error } = useRealtimeTable<TripDayAccommodation>(
    'trip_day_accommodations',
    '*',
    linkKey,
    (a, b) => linkKey(a).localeCompare(linkKey(b)),
  )
  return { links: rows, loading, error }
}
