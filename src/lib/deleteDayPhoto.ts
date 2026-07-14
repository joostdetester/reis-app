import { supabase } from './supabaseClient'
import { getEditToken, TRIP_SLUG } from './tripAccess'
import { MissingEditTokenError } from './saveEdit'

/** Verwijdert een geüploade dag-foto via de delete-day-photo Edge Function (zelfde edit-token-patroon als saveEdit). */
export async function deleteDayPhoto(photoId: string): Promise<void> {
  const token = getEditToken()
  if (!token) throw new MissingEditTokenError()

  const { data, error } = await supabase.functions.invoke('delete-day-photo', {
    body: { slug: TRIP_SLUG, token, photo_id: photoId },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
