import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { WorldClock } from './components/WorldClock'
import { TodayPage } from './pages/TodayPage'
import { TripPage } from './pages/TripPage'
import { HotelsPage } from './pages/HotelsPage'
import { TransportPage } from './pages/TransportPage'
import { SearchPage } from './pages/SearchPage'
import { PracticalPage } from './pages/PracticalPage'

function Hero() {
  return (
    <header className="hero">
      <small>Gezinsreis</small>
      <h1>Filipijnen 2026 🇵🇭</h1>
      <p>23 juli – 13 augustus · 22 dagen</p>
      <WorldClock />
      <div className="top-actions">
        <Link className="secondary" to="/search">
          🔎 Zoeken
        </Link>
        <Link className="secondary" to="/practical">
          ☰ Praktisch
        </Link>
        <Link className="secondary" to="/trip?view=calendar">
          📅 Kalender
        </Link>
        <Link className="secondary" to="/trip?view=destinations">
          🧭 Ontdekken
        </Link>
      </div>
      <a
        className="hero-credit"
        href="https://commons.wikimedia.org/wiki/File:Nacpan_Beach.jpg"
        target="_blank"
        rel="noreferrer"
      >
        Foto: glwx, Nacpan Beach (CC BY-SA 3.0)
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
