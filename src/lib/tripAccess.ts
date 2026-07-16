import { supabase } from './supabaseClient'

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

/** Zet de edit-token na een geslaagde "Inloggen met Google" (zelfde opslagplek als de geheime link). */
export function setEditToken(token: string): void {
  localStorage.setItem(EDIT_TOKEN_STORAGE_KEY, token)
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

/**
 * Vraagt de backend (verify-edit-token) of de opgeslagen token daadwerkelijk bij deze trip
 * hoort. `hasEditAccess()` hierboven checkt alleen of er een token aanwezig is, niet of hij
 * klopt — deze functie is voor de plekken die het echt willen weten (zie editAccessContext.tsx),
 * zodat een geraden/foute token niet alsnog Bewerk-knoppen laat zien die bij opslaan toch zouden
 * falen. Geeft `false` terug bij een ontbrekende token, een netwerkfout, of een echt ongeldige
 * token — de daadwerkelijke afdwinging blijft bij save-edit, dit is puur voor de UI.
 */
export async function verifyEditToken(): Promise<boolean> {
  const token = getEditToken()
  if (!token) return false

  try {
    const { data, error } = await supabase.functions.invoke('verify-edit-token', {
      body: { slug: TRIP_SLUG, token },
    })
    if (error || !data?.data) return false
    return data.data.valid === true
  } catch {
    return false
  }
}
