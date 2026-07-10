import { supabase } from './supabaseClient'
import { getEditToken, TRIP_SLUG } from './tripAccess'

export class MissingEditTokenError extends Error {
  constructor() {
    super('Geen edit-token gevonden. Open de app opnieuw via de geheime link.')
  }
}

/**
 * Enige schrijfpad van de app: stuurt een patch naar de save-edit Edge Function,
 * die de edit-token valideert en de update met de service-role key uitvoert.
 */
export async function saveEdit<T extends Record<string, unknown>>(
  table: string,
  id: string,
  patch: T,
): Promise<Record<string, unknown>> {
  const token = getEditToken()
  if (!token) throw new MissingEditTokenError()

  const { data, error } = await supabase.functions.invoke('save-edit', {
    body: { slug: TRIP_SLUG, token, table, id, patch },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.data
}
