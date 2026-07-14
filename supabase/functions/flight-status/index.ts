// Supabase Edge Function: flight-status
//
// Haalt de actuele status van een vlucht op (op tijd/vertraagd/geannuleerd/geland/...)
// bij de AeroDataBox API (via RapidAPI), voor een vluchtnummer + lokale vertrekdatum.
// De RapidAPI-key leeft alleen hier (nooit in de frontend). De frontend roept dit
// alleen aan binnen het actieve venster (zie STATUS_LOOKUP_WINDOW_HOURS in TransportPage)
// om binnen de quota van het gratis abonnement te blijven.
//
// Wijkt de actuele (revised) vertrek-/aankomsttijd van de API af van wat er in
// transport_items staat, dan wordt die rij automatisch bijgewerkt (incl. schedule_changed
// = true, dezelfde vlag als bij een handmatige tijdswijziging). Vertrekhal/gate/aankomst-
// terminal worden pas overgenomen vlak vóór de vlucht (zie GATE_LOOKUP_WINDOW_HOURS) —
// die zijn hoe dan ook nog niet bekend als je verder vooruit kijkt. Dit alles gebeurt met
// de service-role key, dus geen edit-token nodig: het is een systeemsync van extern
// geverifieerde data, geen wijziging door een gezinslid. Puur uitlezen (vluchtstatus
// tonen) vergt sowieso geen token.
//
// Deploy: supabase functions deploy flight-status
// Env (Supabase dashboard > Edge Functions > flight-status > Secrets):
//   AERODATABOX_RAPIDAPI_KEY
//   (SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn al automatisch beschikbaar)

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

// Vertrekhal/gate/aankomstterminal worden pas gebruikt binnen dit venster vóór de
// vertrek- resp. aankomsttijd (met een korte marge erna voor een korte vertraging).
// Moet gelijk zijn aan GATE_LOOKUP_WINDOW_HOURS in TransportPage.tsx (die tekst toont
// dezelfde "nog niet beschikbaar"-boodschap voor velden die dit venster nog niet bereikt hebben).
const GATE_LOOKUP_WINDOW_HOURS = 2
const GATE_LOOKUP_GRACE_HOURS = 1

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  })
}

interface FlightStatusRequest {
  transportItemId: string
  flightNumbers: string[]
  date: string
  currentDepartureIso: string | null
  currentArrivalIso: string | null
}

export interface FlightStatusResult {
  flightNumber: string
  status: string
  delayMinutes: number | null
  found: boolean
}

interface AeroDataBoxTime {
  utc?: string
}

interface AeroDataBoxLeg {
  scheduledTime?: AeroDataBoxTime
  revisedTime?: AeroDataBoxTime
  runwayTime?: AeroDataBoxTime
  terminal?: string
  gate?: string
}

interface AeroDataBoxFlight {
  status?: string
  departure?: AeroDataBoxLeg
  arrival?: AeroDataBoxLeg
}

// AeroDataBox geeft een Engelse status terug (o.a. "Unknown", "Expected", "EnRoute",
// "Landed", "Delayed", "Canceled", "Diverted") — hier vertaald voor de UI. Een status
// die hier niet in staat, tonen we gewoon rauw terug i.p.v.'m te verbergen.
const STATUS_LABELS: Record<string, string> = {
  unknown: 'Onbekend',
  expected: 'Gepland',
  scheduled: 'Gepland',
  enroute: 'Onderweg',
  inflight: 'Onderweg',
  departed: 'Vertrokken',
  landed: 'Geland',
  arrived: 'Geland',
  delayed: 'Vertraagd',
  cancelled: 'Geannuleerd',
  canceled: 'Geannuleerd',
  diverted: 'Omgeleid',
}

function minutesBetween(aIso: string | undefined, bIso: string | undefined): number | null {
  if (!aIso || !bIso) return null
  const diff = Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 60_000)
  return Number.isFinite(diff) && diff !== 0 ? diff : null
}

/** De "echte" tijd van een AeroDataBox-tijdsblok: revised > runway > scheduled, wat het eerst bekend is. */
function actualTime(leg: AeroDataBoxLeg | undefined): string | null {
  return leg?.revisedTime?.utc ?? leg?.runwayTime?.utc ?? leg?.scheduledTime?.utc ?? null
}

/** True als `now` hooguit `hoursBefore` uur vóór `targetIso` ligt (met een korte marge erna). */
function withinPreWindow(targetIso: string | null, hoursBefore: number, now: Date): boolean {
  if (!targetIso) return false
  const diffMs = new Date(targetIso).getTime() - now.getTime()
  return diffMs <= hoursBefore * 3_600_000 && diffMs >= -GATE_LOOKUP_GRACE_HOURS * 3_600_000
}

async function lookupFlight(flightNumber: string, date: string, apiKey: string): Promise<{ result: FlightStatusResult; flight: AeroDataBoxFlight | null }> {
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${date}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
    })
  } catch {
    return { result: { flightNumber, status: 'Onbekend', delayMinutes: null, found: false }, flight: null }
  }

  if (!response.ok) {
    return { result: { flightNumber, status: 'Onbekend', delayMinutes: null, found: false }, flight: null }
  }

  const data = await response.json()
  const flight: AeroDataBoxFlight | undefined = Array.isArray(data) ? data[0] : data
  if (!flight) {
    return { result: { flightNumber, status: 'Onbekend', delayMinutes: null, found: false }, flight: null }
  }

  const rawStatus = String(flight.status ?? '').toLowerCase()
  const status = STATUS_LABELS[rawStatus] ?? (flight.status ? String(flight.status) : 'Onbekend')

  const delayMinutes =
    minutesBetween(flight.departure?.scheduledTime?.utc, flight.departure?.revisedTime?.utc) ??
    minutesBetween(flight.departure?.scheduledTime?.utc, flight.departure?.runwayTime?.utc)

  return { result: { flightNumber, status, delayMinutes, found: true }, flight }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Alleen POST toegestaan' }, 405)
  }

  const apiKey = Deno.env.get('AERODATABOX_RAPIDAPI_KEY')
  if (!apiKey) {
    return jsonResponse({ error: 'Vluchtstatus is nog niet geconfigureerd (ontbrekende API-key)' }, 501)
  }

  let body: FlightStatusRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ongeldige JSON' }, 400)
  }

  const { transportItemId, flightNumbers, date, currentDepartureIso, currentArrivalIso } = body
  if (!transportItemId || !Array.isArray(flightNumbers) || flightNumbers.length === 0 || !date) {
    return jsonResponse({ error: 'transportItemId, flightNumbers en date zijn verplicht' }, 400)
  }

  const lookups = await Promise.all(flightNumbers.map((num) => lookupFlight(num, date, apiKey)))
  const results = lookups.map((l) => l.result)

  // Eerste vluchtnummer bepaalt het vertrek, laatste het aankomst (bij een vlucht met
  // overstap, bv. "PR2352 / PR2868", is dat de eerste resp. laatste leg van de reis).
  const firstFlight = lookups[0]?.flight
  const lastFlight = lookups[lookups.length - 1]?.flight
  const newDepartureIso = firstFlight ? actualTime(firstFlight.departure) : null
  const newArrivalIso = lastFlight ? actualTime(lastFlight.arrival) : null

  const departureChanged = Boolean(newDepartureIso) && minutesBetween(currentDepartureIso ?? undefined, newDepartureIso ?? undefined) !== null
  const arrivalChanged = Boolean(newArrivalIso) && minutesBetween(currentArrivalIso ?? undefined, newArrivalIso ?? undefined) !== null

  const now = new Date()
  const updates: Record<string, unknown> = {}
  if (departureChanged) updates.departure_time = newDepartureIso
  if (arrivalChanged) updates.arrival_time = newArrivalIso

  let gateUpdated = false
  if (withinPreWindow(currentDepartureIso, GATE_LOOKUP_WINDOW_HOURS, now)) {
    const terminal = firstFlight?.departure?.terminal
    const gate = firstFlight?.departure?.gate
    if (terminal) {
      updates.departure_terminal = terminal
      gateUpdated = true
    }
    if (gate) {
      updates.departure_gate = gate
      gateUpdated = true
    }
  }
  if (withinPreWindow(currentArrivalIso, GATE_LOOKUP_WINDOW_HOURS, now)) {
    const terminal = lastFlight?.arrival?.terminal
    if (terminal) {
      updates.arrival_terminal = terminal
      gateUpdated = true
    }
  }

  if (departureChanged || arrivalChanged) updates.schedule_changed = true

  if (Object.keys(updates).length > 0) {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await supabaseAdmin
      .from('transport_items')
      .update({ ...updates, updated_at: now.toISOString() })
      .eq('id', transportItemId)
  }

  return jsonResponse({ data: results, timesUpdated: departureChanged || arrivalChanged, gateUpdated })
})
