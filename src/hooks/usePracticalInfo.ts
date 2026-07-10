import { useRealtimeTable } from './useRealtimeTable'
import type { PracticalInfo } from '../types/trip'

export function usePracticalInfo() {
  const { rows, loading, error } = useRealtimeTable<PracticalInfo>(
    'practical_info',
    '*',
    (row) => row.id,
    (a, b) => a.sort_order - b.sort_order,
  )
  return { info: rows, loading, error }
}
