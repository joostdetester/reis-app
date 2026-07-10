import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { TRIP_SLUG } from '../lib/tripAccess'

interface UseRealtimeTableResult<T> {
  rows: T[]
  loading: boolean
  error: string | null
}

/**
 * Haalt alle rijen van `table` voor de huidige trip op en houdt ze live in sync
 * via Supabase Realtime (INSERT/UPDATE/DELETE). `sortFn` bepaalt de weergavevolgorde,
 * `getKey` de (samengestelde) sleutel — niet elke tabel heeft een enkele 'id'-kolom.
 *
 * Let op: `select` moet een platte kolomlijst zijn (geen embeds/joins) — realtime-
 * payloads bevatten alleen de rauwe rij van de gewijzigde tabel, dus joins zouden na
 * een live update stilletjes verdwijnen. Joins doe je client-side in de pagina zelf.
 */
export function useRealtimeTable<T>(
  table: string,
  select: string,
  getKey: (row: T) => string,
  sortFn: (a: T, b: T) => number,
): UseRealtimeTableResult<T> {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id')
        .eq('slug', TRIP_SLUG)
        .single()

      if (cancelled) return
      if (tripError || !trip) {
        setError('Reis niet gevonden')
        setLoading(false)
        return
      }

      const { data, error: rowsError } = await supabase
        .from(table)
        .select(select)
        .eq('trip_id', trip.id)

      if (cancelled) return
      if (rowsError) {
        setError(rowsError.message)
      } else {
        setRows(((data ?? []) as unknown as T[]).sort(sortFn))
      }
      setLoading(false)

      const channel = supabase
        .channel(`${table}:${trip.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `trip_id=eq.${trip.id}` },
          (payload) => {
            setRows((current) => {
              if (payload.eventType === 'DELETE') {
                const deletedKey = getKey(payload.old as T)
                return current.filter((r) => getKey(r) !== deletedKey)
              }
              const updated = payload.new as T
              const updatedKey = getKey(updated)
              const exists = current.some((r) => getKey(r) === updatedKey)
              const next = exists
                ? current.map((r) => (getKey(r) === updatedKey ? updated : r))
                : [...current, updated]
              return next.sort(sortFn)
            })
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const cleanupPromise = load()
    return () => {
      cancelled = true
      cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [table, select])

  return { rows, loading, error }
}
