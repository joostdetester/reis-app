const EDIT_TOKEN_STORAGE_KEY = 'filipijnen-edit-token'

export const TRIP_SLUG = import.meta.env.VITE_TRIP_SLUG

if (!TRIP_SLUG) {
  throw new Error('VITE_TRIP_SLUG moet gezet zijn in .env.local')
}

/**
 * Leest de edit-token uit de geheime link (?token=...), bewaart die in localStorage (blijft
 * dus staan na het sluiten van de app/tab — belangrijk voor "Zet op beginscherm" op mobiel)
 * en verwijdert 'm daarna uit de zichtbare URL zodat hij niet in de browserhistorie blijft hangen.
 */
export function captureEditTokenFromUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (!token) return

  localStorage.setItem(EDIT_TOKEN_STORAGE_KEY, token)
  params.delete('token')
  const cleanUrl =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : '') +
    window.location.hash
  window.history.replaceState(null, '', cleanUrl)
}

export function getEditToken(): string | null {
  return localStorage.getItem(EDIT_TOKEN_STORAGE_KEY)
}

/**
 * Bewerk-modus vs. alleen-lezen: een link zonder `?token=...` geeft alleen leestoegang (voor
 * mensen die het reisplan mogen zien maar niet mogen wijzigen), een link mét token geeft
 * bewerktoegang. De backend handhaaft dit al (save-edit weigert zonder geldige token); dit
 * bepaalt alleen of de UI "Bewerk"-knoppen toont.
 */
export function hasEditAccess(): boolean {
  return getEditToken() !== null
}

/** Uitloggen: verwijdert de bewaarde edit-token van dit toestel (terug naar alleen-lezen). */
export function clearEditToken(): void {
  localStorage.removeItem(EDIT_TOKEN_STORAGE_KEY)
}
