// Laadt de Google Identity Services-library lui (pas als er echt bij Google wordt
// ingelogd) en vraagt een tijdelijk OAuth-toegangstoken op, voor de "Inloggen met
// Google"-knop in de header (verificatie van het e-mailadres, zie login-with-google).

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
// "email" geeft alleen het geverifieerde e-mailadres terug.
const SITE_LOGIN_SCOPE = 'email'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken: () => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }) => TokenClient
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Kon het Google-inlogscript niet laden'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export interface GoogleAccessToken {
  accessToken: string
  expiresInSeconds: number
}

async function requestAccessToken(clientId: string, scope: string): Promise<GoogleAccessToken> {
  await loadScript()
  if (!window.google) throw new Error('Google-inlogscript kon niet worden geladen')

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Geen toegangstoken ontvangen van Google'))
          return
        }
        resolve({ accessToken: response.access_token, expiresInSeconds: response.expires_in ?? 3600 })
      },
    })
    client.requestAccessToken()
  })
}

/** Vraagt het Google-toegangstoken op voor de "Inloggen met Google"-knop in de header. */
export function requestGoogleSiteLoginToken(clientId: string): Promise<GoogleAccessToken> {
  return requestAccessToken(clientId, SITE_LOGIN_SCOPE)
}
