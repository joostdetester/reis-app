// Laadt de Google Identity Services-library lui (pas als de foto-import echt gebruikt
// wordt) en vraagt een tijdelijk OAuth-toegangstoken met alleen de Photos Picker-scope
// (readonly, en alleen voor de foto's die de gebruiker zelf in de picker aanwijst).

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly'

interface TokenResponse {
  access_token?: string
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

/** Vraagt de gebruiker om met Google in te loggen en foto-toegang te verlenen; geeft een kort-geldig toegangstoken terug. */
export async function requestGooglePhotosAccessToken(clientId: string): Promise<string> {
  await loadScript()
  if (!window.google) throw new Error('Google-inlogscript kon niet worden geladen')

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Geen toegangstoken ontvangen van Google'))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}
