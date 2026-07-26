import { supabase } from './supabaseClient'
import { getEditToken, TRIP_SLUG } from './tripAccess'
import { MissingEditTokenError } from './saveEdit'

type UploadResult = { id: string; storage_path: string; public_url: string }

/** Stuurt een rechtstreeks van dit toestel gekozen foto (bv. via de Foto's-app/galerij) naar de upload-day-photo Edge Function (zelfde edit-token-patroon als saveEdit). */
export async function uploadDayPhotoFile(
  tripDayId: string,
  filename: string,
  base64Data: string,
  contentType: string,
): Promise<UploadResult> {
  const token = getEditToken()
  if (!token) throw new MissingEditTokenError()

  const { data: result, error } = await supabase.functions.invoke('upload-day-photo', {
    body: { slug: TRIP_SLUG, token, trip_day_id: tripDayId, filename, data: base64Data, content_type: contentType },
  })

  if (error) throw error
  if (result?.error) throw new Error(result.error)
  return result.data
}
