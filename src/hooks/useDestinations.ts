import { useRealtimeTable } from './useRealtimeTable'
import type { Destination } from '../types/trip'

export function useDestinations() {
  const { rows, loading, error } = useRealtimeTable<Destination>(
    'destinations',
    '*',
    (row) => row.id,
    (a, b) => a.name.localeCompare(b.name),
  )
  return { destinations: rows, loading, error }
}
