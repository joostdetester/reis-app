import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { TRIP_SLUG } from '../lib/tripAccess'

export interface Trip {
  id: string
  name: string
  start_date: string
  end_date: string
  photos_album_url: string | null
  flight_status_api_enabled: boolean
}

// access_token_hash wordt hier bewust nooit geselecteerd (zie SECURITY.md).
const TRIP_COLUMNS = 'id, name, start_date, end_date, photos_album_url, flight_status_api_enabled'

/** De ene trip-rij zelf (naam, data, gedeeld foto-album-link). Geen trip_id-kolom hier — filtert op eigen id. */
export function useTrip() {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error: fetchError } = await supabase
        .from('trips')
        .select(TRIP_COLUMNS)
        .eq('slug', TRIP_SLUG)
        .single()

      if (cancelled) return
      if (fetchError || !data) {
        setError('Reis niet gevonden')
        setLoading(false)
        return
      }
      setTrip(data)
      setLoading(false)

      const channel = supabase
        .channel(`trips:${data.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${data.id}` },
          (payload) => setTrip(payload.new as Trip),
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
  }, [])

  return { trip, loading, error }
}
