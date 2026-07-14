import { useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { RouteMap } from './components/RouteMap'
import { WorldClock } from './components/WorldClock'
import { TodayPage } from './pages/TodayPage'
import { TripPage } from './pages/TripPage'
import { HotelsPage } from './pages/HotelsPage'
import { TransportPage } from './pages/TransportPage'
import { PhotosPage } from './pages/PhotosPage'
import { PracticalPage } from './pages/PracticalPage'
import { clearEditToken, hasEditAccess, setEditToken } from './lib/tripAccess'
import { GOOGLE_CLIENT_ID, requestGoogleSiteLoginToken } from './lib/googlePhotosAuth'
import { setGoogleAccessToken as cacheGoogleAccessToken } from './lib/googleSession'
import { loginWithGoogle } from './lib/loginWithGoogle'

function Hero({
  onOpenRouteMap,
  onRequestLogout,
  onGoogleLogin,
  loggingIn,
  loginError,
}: {
  onOpenRouteMap: () => void
  onRequestLogout: () => void
  onGoogleLogin: () => void
  loggingIn: boolean
  loginError: string | null
}) {
  return (
    <header className="hero">
      <div className="hero-content">
        <small>
          Gezinsreis
          {!hasEditAccess() && <span className="readonly-badge">Alleen-lezen</span>}
          {!hasEditAccess() && (
            <button className="google-login-link" onClick={onGoogleLogin} disabled={loggingIn}>
              {loggingIn ? 'Bezig…' : '🔐 Inloggen'}
            </button>
          )}
          {hasEditAccess() && (
            <button className="logout-link" onClick={onRequestLogout}>
              Uitloggen
            </button>
          )}
        </small>
        {!hasEditAccess() && loginError && <div className="notice google-login-notice">{loginError}</div>}
        <h1>Filipijnen 2026</h1>
        <p>23 juli – 13 augustus · 22 dagen</p>
        <WorldClock />
        <div className="top-actions">
          <Link className="secondary" to="/trip?view=timeline">
            📜 Tijdlijn
          </Link>
          <Link className="secondary" to="/trip?view=destinations">
            🏝️ Bestemmingen
          </Link>
          <Link className="secondary" to="/trip?view=calendar">
            📅 Kalender
          </Link>
          <button className="secondary" onClick={onOpenRouteMap}>
            🗺️ Reisroute
          </button>
          <Link className="secondary" to="/photos">
            📷 Foto's
          </Link>
          <Link className="secondary" to="/practical">
            ☰ Praktisch
          </Link>
        </div>
      </div>
      <a
        className="hero-credit"
        href="https://commons.wikimedia.org/wiki/File:Beach_in_El_Nido_Bay,_pure_tropical_bliss,_Palawan,_Philippines.jpg"
        target="_blank"
        rel="noreferrer"
      >
        Foto: Vyacheslav Argenberg, El Nido Bay (CC BY 4.0)
      </a>
    </header>
  )
}

function App() {
  const [showRouteMap, setShowRouteMap] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  function handleLogout() {
    clearEditToken()
    window.location.reload()
  }

  async function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID) {
      setLoginError('Inloggen met Google is nog niet geconfigureerd (ontbrekende Google-client-ID).')
      return
    }
    setLoggingIn(true)
    setLoginError(null)
    try {
      const { accessToken, expiresInSeconds } = await requestGoogleSiteLoginToken(GOOGLE_CLIENT_ID)
      const editToken = await loginWithGoogle(accessToken)
      setEditToken(editToken)
      // Meteen ook klaar voor de Foto's-pagina: geen tweede Google-login meer nodig.
      cacheGoogleAccessToken(accessToken, expiresInSeconds)
      window.location.reload()
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Inloggen met Google is mislukt')
      setLoggingIn(false)
    }
  }

  return (
    <HashRouter>
      <Hero
        onOpenRouteMap={() => setShowRouteMap(true)}
        onRequestLogout={() => setConfirmingLogout(true)}
        onGoogleLogin={() => void handleGoogleLogin()}
        loggingIn={loggingIn}
        loginError={loginError}
      />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/trip" element={<TripPage />} />
          <Route path="/hotels" element={<HotelsPage />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/practical" element={<PracticalPage />} />
        </Routes>
      </main>
      <BottomNav />
      {showRouteMap && (
        <div className="overlay" onClick={() => setShowRouteMap(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Reisroute</h2>
            <RouteMap />
            <div className="actions">
              <button className="primary" onClick={() => setShowRouteMap(false)}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmingLogout && (
        <div className="overlay" onClick={() => setConfirmingLogout(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Uitloggen</h2>
            <div className="notice">
              Weet je zeker dat je wilt uitloggen? Je hebt daarna de originele geheime link (met
              ?token=...) weer nodig om opnieuw bewerktoegang te krijgen.
            </div>
            <div className="actions">
              <button onClick={() => setConfirmingLogout(false)}>Annuleren</button>
              <button className="primary" onClick={handleLogout}>
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      )}
    </HashRouter>
  )
}

export default App
