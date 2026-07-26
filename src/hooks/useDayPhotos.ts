import { useRealtimeTable } from './useRealtimeTable'
import type { DayPhoto } from '../types/trip'

export function useDayPhotos() {
  const { rows, loading, error, refetch } = useRealtimeTable<DayPhoto>(
    'day_photos',
    '*',
    (row) => row.id,
    (a, b) => a.created_at.localeCompare(b.created_at),
  )
  return { dayPhotos: rows, loading, error, refetch }
}
