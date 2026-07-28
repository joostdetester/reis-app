import { useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { BirthdayEgg } from './components/BirthdayEgg'
import { BottomNav } from './components/BottomNav'
import { RouteMap } from './components/RouteMap'
import { WorldClock } from './components/WorldClock'
import { TodayPage } from './pages/TodayPage'
import { TripPage } from './pages/TripPage'
import { HotelsPage } from './pages/HotelsPage'
import { TransportPage } from './pages/TransportPage'
import { PhotosPage } from './pages/PhotosPage'
import { PracticalPage } from './pages/PracticalPage'
import { clearEditToken, setEditToken } from './lib/tripAccess'
import { useHasEditAccess } from './lib/editAccessContext'
import { GOOGLE_CLIENT_ID, requestGoogleSiteLoginToken } from './lib/googleAuth'
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
  const hasAccess = useHasEditAccess()

  return (
    <header className="hero" data-testid="hero">
      <div className="hero-content">
        <small>
          Gezinsreis
          {!hasAccess && (
            <span className="readonly-badge" data-testid="readonly-badge">
              Alleen-lezen
            </span>
          )}
          {!hasAccess && (
            <button
              className="google-login-link"
              onClick={onGoogleLogin}
              disabled={loggingIn}
              data-testid="google-login-button"
            >
              {loggingIn ? 'Bezig…' : '🔐 Inloggen'}
            </button>
          )}
          {hasAccess && (
            <button className="logout-link" onClick={onRequestLogout} data-testid="logout-button">
              Uitloggen
            </button>
          )}
        </small>
        {!hasAccess && loginError && (
          <div className="notice google-login-notice" data-testid="google-login-error">
            {loginError}
          </div>
        )}
        <h1>Filipijnen 2026</h1>
        <p>23 juli – 13 augustus · 22 dagen</p>
        <WorldClock />
        <div className="top-actions">
          <Link className="secondary" to="/trip?view=timeline" data-testid="menu-timeline">
            📜 Tijdlijn
          </Link>
          <Link className="secondary" to="/trip?view=destinations" data-testid="menu-destinations">
            🏝️ Bestemmingen
          </Link>
          <Link className="secondary" to="/trip?view=calendar" data-testid="menu-calendar">
            📅 Kalender
          </Link>
          <button className="secondary" onClick={onOpenRouteMap} data-testid="menu-route-map">
            🗺️ Reisroute
          </button>
          <Link className="secondary" to="/photos" data-testid="menu-photos">
            📷 Foto's
          </Link>
          <Link className="secondary" to="/practical" data-testid="menu-practical">
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
      const { accessToken } = await requestGoogleSiteLoginToken(GOOGLE_CLIENT_ID)
      const editToken = await loginWithGoogle(accessToken)
      setEditToken(editToken)
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
      <main data-testid="main-content">
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
      <BirthdayEgg />
      {showRouteMap && (
        <div className="overlay" onClick={() => setShowRouteMap(false)} data-testid="route-map-overlay">
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Reisroute</h2>
            <RouteMap />
            <div className="actions">
              <button className="primary" onClick={() => setShowRouteMap(false)} data-testid="route-map-close">
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmingLogout && (
        <div className="overlay" onClick={() => setConfirmingLogout(false)} data-testid="logout-confirm-overlay">
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Uitloggen</h2>
            <div className="notice">
              Weet je zeker dat je wilt uitloggen? Je hebt daarna de originele geheime link (met
              ?token=...) weer nodig om opnieuw bewerktoegang te krijgen.
            </div>
            <div className="actions">
              <button onClick={() => setConfirmingLogout(false)} data-testid="logout-confirm-cancel">
                Annuleren
              </button>
              <button className="primary" onClick={handleLogout} data-testid="logout-confirm-confirm">
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
