/** Google Maps-routelink tussen twee locaties (bv. voor een vliegbeweging). Geen API-key nodig. */
export function flightMapUrl(origin: string | null | undefined, destination: string | null | undefined): string | null {
  if (!origin || !destination) return null
  const params = new URLSearchParams({ api: '1', origin, destination })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Vluchtstatuspagina voor een vluchtnummer. Elke luchtvaartmaatschappij heeft een eigen
 * (vaak niet-uniforme) manier om naar één vlucht te linken, dus we gebruiken FlightRadar24
 * als neutrale, werkende link voor élk vluchtnummer — geen airline-specifieke logica nodig.
 */
export function flightStatusUrl(flightNumber: string): string {
  const code = flightNumber.replace(/\s+/g, '').toLowerCase()
  return `https://www.flightradar24.com/data/flights/${encodeURIComponent(code)}`
}

/** Splitst een vluchtnummer-veld op in losse codes (bv. "PR2352 / PR2868" bij een vlucht met overstap). */
export function splitFlightNumbers(bookingReference: string): string[] {
  return bookingReference
    .split('/')
    .map((code) => code.trim())
    .filter(Boolean)
}
