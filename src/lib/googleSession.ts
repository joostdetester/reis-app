// Onthoudt het Google-toegangstoken voor de duur van dit paginabezoek (module-state,
// overleeft dus navigatie binnen de app maar niet een volledige herlaad). Zo hoeft een
// gezinslid dat via "Inloggen met Google" in de header inlogt niet nóg een keer in te
// loggen op de Foto's-pagina — en andersom, als iemand daar als eerste inlogt.

let cachedAccessToken: string | null = null
let cachedExpiresAt: number | null = null

export function setGoogleAccessToken(accessToken: string, expiresInSeconds: number): void {
  cachedAccessToken = accessToken
  cachedExpiresAt = Date.now() + expiresInSeconds * 1000
}

export function getGoogleAccessToken(): string | null {
  if (!cachedAccessToken || !cachedExpiresAt || Date.now() >= cachedExpiresAt) return null
  return cachedAccessToken
}

export function clearGoogleAccessToken(): void {
  cachedAccessToken = null
  cachedExpiresAt = null
}
