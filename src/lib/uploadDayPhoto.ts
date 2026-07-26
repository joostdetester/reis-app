import { supabase } from './supabaseClient'
import { getEditToken, TRIP_SLUG } from './tripAccess'
import { MissingEditTokenError } from './saveEdit'

type UploadResult = { id: string; storage_path: string; public_url: string }
type UploadSource = { media_base_url: string; google_access_token: string } | { data: string; content_type: string }

async function invokeUpload(tripDayId: string, filename: string, source: UploadSource): Promise<UploadResult> {
  const token = getEditToken()
  if (!token) throw new MissingEditTokenError()

  const { data: result, error } = await supabase.functions.invoke('upload-day-photo', {
    body: { slug: TRIP_SLUG, token, trip_day_id: tripDayId, filename, ...source },
  })

  if (error) throw error
  if (result?.error) throw new Error(result.error)
  return result.data
}

/**
 * Stuurt een gekozen Google Photos-item naar de upload-day-photo Edge Function (zelfde
 * edit-token-patroon als saveEdit). De functie downloadt de foto zelf bij Google — een
 * download vanuit de browser liep voor sommige foto's (bv. HEIC vanaf een iPhone) vast op
 * een CORS-fout ("Failed to fetch"), server-naar-server heeft daar geen last van.
 */
export function uploadDayPhoto(
  tripDayId: string,
  filename: string,
  mediaBaseUrl: string,
  googleAccessToken: string,
): Promise<UploadResult> {
  return invokeUpload(tripDayId, filename, { media_base_url: mediaBaseUrl, google_access_token: googleAccessToken })
}

/** Stuurt een rechtstreeks van dit toestel gekozen foto (bv. via de Foto's-app/galerij) naar de Edge Function. */
export function uploadDayPhotoFile(
  tripDayId: string,
  filename: string,
  base64Data: string,
  contentType: string,
): Promise<UploadResult> {
  return invokeUpload(tripDayId, filename, { data: base64Data, content_type: contentType })
}
