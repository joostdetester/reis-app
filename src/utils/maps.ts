/** Google Maps-routelink tussen twee locaties (bv. voor een vliegbeweging). Geen API-key nodig. */
export function flightMapUrl(origin: string | null | undefined, destination: string | null | undefined): string | null {
  if (!origin || !destination) return null
  const params = new URLSearchParams({ api: '1', origin, destination })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
