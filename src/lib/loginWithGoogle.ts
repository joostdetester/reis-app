import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

/**
 * Stuurt een Google-toegangstoken naar de login-with-google Edge Function, die het
 * e-mailadres server-side bij Google verifieert en tegen de toegestane lijst checkt.
 * Geeft bij een geldig, toegestaan account de echte edit-token terug.
 */
export async function loginWithGoogle(googleAccessToken: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('login-with-google', {
    body: { googleAccessToken },
  })

  if (error) {
    // FunctionsHttpError laat alleen een generieke "non-2xx"-melding zien via .message;
    // de eigenlijke Nederlandse foutmelding staat in de (nog ongelezen) response-body.
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      throw new Error(body?.error || error.message)
    }
    throw error
  }
  if (data?.error) throw new Error(data.error)
  return data.data.token as string
}
