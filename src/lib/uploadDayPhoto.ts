import { supabase } from './supabaseClient'
import { getEditToken, TRIP_SLUG } from './tripAccess'
import { MissingEditTokenError } from './saveEdit'

/** Stuurt een gekozen foto naar de upload-day-photo Edge Function (zelfde edit-token-patroon als saveEdit). */
export async function uploadDayPhoto(
  tripDayId: string,
  filename: string,
  contentType: string,
  base64Data: string,
): Promise<{ id: string; storage_path: string; public_url: string }> {
  const token = getEditToken()
  if (!token) throw new MissingEditTokenError()

  const { data, error } = await supabase.functions.invoke('upload-day-photo', {
    body: { slug: TRIP_SLUG, token, trip_day_id: tripDayId, filename, contentType, data: base64Data },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.data
}
