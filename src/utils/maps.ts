/** Google Maps-routelink tussen twee locaties (bv. voor een vliegbeweging). Geen API-key nodig. */
export function flightMapUrl(origin: string | null | undefined, destination: string | null | undefined): string | null {
  if (!origin || !destination) return null
  const params = new URLSearchParams({ api: '1', origin, destination })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Splitst een vluchtnummer-veld op in losse codes (bv. "PR2352 / PR2868" bij een vlucht met overstap). */
export function splitFlightNumbers(bookingReference: string): string[] {
  return bookingReference
    .split('/')
    .map((code) => code.trim())
    .filter(Boolean)
}

/**
 * Flightradar24-pagina voor een vluchtnummer (werkt met alleen het vluchtnummer, geen datum
 * nodig), zodat er ook al doorgeklikt kan worden vóórdat onze eigen vluchtstatus-API iets weet.
 */
export function flightradar24Url(flightNumber: string): string {
  const clean = flightNumber.replace(/\s+/g, '').toLowerCase()
  return `https://www.flightradar24.com/data/flights/${encodeURIComponent(clean)}`
}
