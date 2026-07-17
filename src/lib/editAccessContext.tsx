import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { hasEditAccess, verifyEditToken } from './tripAccess'

type EditAccessStatus = 'checking' | 'granted' | 'denied'

// Default (buiten een Provider): fail-closed, alsof er geen token is.
const EditAccessContext = createContext<EditAccessStatus>('denied')

/**
 * Verifieert eenmalig bij het opstarten of de opgeslagen edit-token echt klopt (server-side,
 * via verify-edit-token) en houdt de uitkomst bij voor de rest van de sessie. Start in
 * "checking" zodra er een token aanwezig is (in plaats van meteen "granted"), zodat een
 * geraden/foute token nooit even Bewerk-knoppen laat zien voordat de check terugkomt.
 */
export function EditAccessProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<EditAccessStatus>(() => (hasEditAccess() ? 'checking' : 'denied'))

  useEffect(() => {
    if (!hasEditAccess()) {
      setStatus('denied')
      return
    }

    let cancelled = false
    void verifyEditToken().then((valid) => {
      if (!cancelled) setStatus(valid ? 'granted' : 'denied')
    })
    return () => {
      cancelled = true
    }
  }, [])

  return <EditAccessContext.Provider value={status}>{children}</EditAccessContext.Provider>
}

/** True zodra de edit-token geverifieerd is; blijft false tijdens het checken en bij een echt ongeldige token. */
export function useHasEditAccess(): boolean {
  return useContext(EditAccessContext) === 'granted'
}
