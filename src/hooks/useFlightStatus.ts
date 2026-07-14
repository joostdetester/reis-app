import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface FlightStatusResult {
  flightNumber: string
  status: string
  delayMinutes: number | null
  found: boolean
}

interface UseFlightStatusParams {
  transportItemId: string
  flightNumbers: string[]
  date: string
  currentDepartureIso: string | null
  currentArrivalIso: string | null
  enabled: boolean
}

/**
 * Vraagt de actuele status op van één of meer vluchtnummers (zie supabase/functions/flight-status).
 * Wijkt de opgehaalde vertrek-/aankomsttijd af van wat er al staat, dan werkt de functie zelf
 * transport_items bij (incl. schedule_changed) — via de realtime-subscriptie zie je die wijziging
 * dan overal in de app verschijnen, ook al toont deze hook alleen de statustekst zelf.
 */
export function useFlightStatus({
  transportItemId,
  flightNumbers,
  date,
  currentDepartureIso,
  currentArrivalIso,
  enabled,
}: UseFlightStatusParams) {
  const [results, setResults] = useState<FlightStatusResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = flightNumbers.join(',')

  useEffect(() => {
    if (!enabled || !key || !date) return
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase.functions
      .invoke('flight-status', {
        body: { transportItemId, flightNumbers: key.split(','), date, currentDepartureIso, currentArrivalIso },
      })
      .then(({ data, error: invokeError }) => {
        if (cancelled) return
        if (invokeError) throw invokeError
        if (data?.error) throw new Error(data.error)
        setResults(data.data)
      })
      .catch(() => {
        if (!cancelled) setError('Vluchtstatus kon niet worden opgehaald')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // currentDepartureIso/currentArrivalIso bewust niet in de deps: die veranderen juist ná een
    // succesvolle sync (via de realtime-update), en zouden anders een nieuwe fetch-cyclus starten.
  }, [transportItemId, key, date, enabled])

  return { results, loading, error }
}
