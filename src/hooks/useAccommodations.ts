import { useRealtimeTable } from './useRealtimeTable'
import type { Accommodation } from '../types/trip'

export function useAccommodations() {
  const { rows, loading, error } = useRealtimeTable<Accommodation>(
    'accommodations',
    '*',
    (row) => row.id,
    (a, b) => a.name.localeCompare(b.name),
  )
  return { accommodations: rows, loading, error }
}
