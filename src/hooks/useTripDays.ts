import { useRealtimeTable } from './useRealtimeTable'
import type { TripDay } from '../types/trip'

export function useTripDays() {
  const { rows, loading, error } = useRealtimeTable<TripDay>(
    'trip_days',
    '*',
    (row) => row.id,
    (a, b) => a.sort_order - b.sort_order,
  )
  return { days: rows, loading, error }
}
