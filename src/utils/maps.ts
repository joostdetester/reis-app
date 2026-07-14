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
