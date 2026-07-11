import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { WorldClock } from './components/WorldClock'
import { TodayPage } from './pages/TodayPage'
import { TripPage } from './pages/TripPage'
import { HotelsPage } from './pages/HotelsPage'
import { TransportPage } from './pages/TransportPage'
import { SearchPage } from './pages/SearchPage'
import { PracticalPage } from './pages/PracticalPage'
import { hasEditAccess } from './lib/tripAccess'

function Hero() {
  return (
    <header className="hero">
      <small>Gezinsreis{!hasEditAccess() && <span className="readonly-badge">Alleen-lezen</span>}</small>
      <h1>Filipijnen 2026 🇵🇭</h1>
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
        <Link className="secondary" to="/practical">
          ☰ Praktisch
        </Link>
        <Link className="secondary" to="/search">
          🔎 Zoeken
        </Link>
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
  return (
    <HashRouter>
      <Hero />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/trip" element={<TripPage />} />
          <Route path="/hotels" element={<HotelsPage />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/practical" element={<PracticalPage />} />
        </Routes>
      </main>
      <BottomNav />
    </HashRouter>
  )
}

export default App
