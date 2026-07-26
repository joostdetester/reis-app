import { supabase } from './supabaseClient'
import { getEditToken, TRIP_SLUG } from './tripAccess'
import { MissingEditTokenError } from './saveEdit'

/**
 * Stuurt een gekozen Google Photos-item naar de upload-day-photo Edge Function (zelfde
 * edit-token-patroon als saveEdit). De functie downloadt de foto zelf bij Google — een
 * download vanuit de browser liep voor sommige foto's (bv. HEIC vanaf een iPhone) vast op
 * een CORS-fout ("Failed to fetch"), server-naar-server heeft daar geen last van.
 */
export async function uploadDayPhoto(
  tripDayId: string,
  filename: string,
  mediaBaseUrl: string,
  googleAccessToken: string,
): Promise<{ id: string; storage_path: string; public_url: string }> {
  const token = getEditToken()
  if (!token) throw new MissingEditTokenError()

  const { data, error } = await supabase.functions.invoke('upload-day-photo', {
    body: {
      slug: TRIP_SLUG,
      token,
      trip_day_id: tripDayId,
      filename,
      media_base_url: mediaBaseUrl,
      google_access_token: googleAccessToken,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.data
}
