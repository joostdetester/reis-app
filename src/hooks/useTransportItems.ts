import { useRealtimeTable } from './useRealtimeTable'
import type { TransportItem } from '../types/trip'

export function useTransportItems() {
  const { rows, loading, error } = useRealtimeTable<TransportItem>(
    'transport_items',
    '*',
    (row) => row.id,
    (a, b) => (a.departure_time ?? '').localeCompare(b.departure_time ?? ''),
  )
  return { transportItems: rows, loading, error }
}
