import { useEffect, useState } from 'react'
import { isBirthdaySurpriseUnlocked } from '../utils/dates'

// Guus Meeuwis & Vagant - Het Is Een Nacht... (Levensecht), officiële clip.
const YOUTUBE_VIDEO_ID = 'eIX2SZW4Ih8'
const REVEAL_DELAY_MS = 10_000

const STARS = [
  { x: 24, y: 30, r: 1.4 },
  { x: 60, y: 80, r: 1 },
  { x: 100, y: 40, r: 1.6 },
  { x: 140, y: 20, r: 1 },
  { x: 180, y: 60, r: 1.3 },
  { x: 20, y: 120, r: 1 },
  { x: 340, y: 140, r: 1.2 },
  { x: 370, y: 40, r: 1 },
  { x: 250, y: 30, r: 1.4 },
  { x: 60, y: 160, r: 1 },
  { x: 320, y: 180, r: 1.1 },
  { x: 150, y: 100, r: 1 },
]

type Phase = 'closed' | 'playing' | 'revealed'

function MoonScene() {
  return (
    <svg viewBox="0 0 400 300" className="moon-scene-art" role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9e6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff9e6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="moon-glow" cx="300" cy="70" r="70" fill="url(#moonGlow)" />
      <circle className="moon" cx="300" cy="70" r="30" fill="#fdf6e3" />
      {STARS.map((star, i) => (
        <circle
          key={`${star.x}-${star.y}`}
          className="star"
          style={{ animationDelay: `${(i % 6) * 0.4}s` }}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="#fff"
        />
      ))}
      <ellipse className="cloud cloud-1" cx="80" cy="60" rx="55" ry="14" fill="#fff" opacity="0.12" />
      <ellipse className="cloud cloud-2" cx="220" cy="110" rx="40" ry="10" fill="#fff" opacity="0.08" />
      <g className="bench-couple">
        <rect x="110" y="230" width="140" height="6" rx="3" fill="#1a1330" />
        <rect x="120" y="236" width="8" height="30" fill="#1a1330" />
        <rect x="232" y="236" width="8" height="30" fill="#1a1330" />
        <g className="silhouette silhouette-1">
          <circle cx="165" cy="205" r="14" fill="#0f0b1e" />
          <path d="M148 232 Q150 205 165 205 Q180 205 182 232 Z" fill="#0f0b1e" />
        </g>
        <g className="silhouette silhouette-2">
          <circle cx="195" cy="203" r="14" fill="#0f0b1e" />
          <path d="M178 232 Q180 203 195 203 Q210 203 212 232 Z" fill="#0f0b1e" />
        </g>
      </g>
    </svg>
  )
}

export function BirthdayEgg() {
  const [unlocked] = useState(() => isBirthdaySurpriseUnlocked())
  const [phase, setPhase] = useState<Phase>('closed')

  useEffect(() => {
    if (phase !== 'playing') return
    const timer = setTimeout(() => setPhase('revealed'), REVEAL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase])

  if (!unlocked) return null

  return (
    <>
      <button
        className="birthday-egg-trigger"
        onClick={() => setPhase('playing')}
        aria-label="Verrassing"
        data-testid="birthday-egg-trigger"
      >
        🎁
      </button>
      {phase !== 'closed' && (
        <div className="birthday-egg-overlay" data-testid="birthday-egg-overlay">
          <button
            className="birthday-egg-close"
            onClick={() => setPhase('closed')}
            aria-label="Sluiten"
            data-testid="birthday-egg-close"
          >
            ×
          </button>
          <iframe
            className="birthday-egg-audio"
            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&playsinline=1&controls=0&rel=0`}
            title="Het Is Een Nacht... (Levensecht) - Guus Meeuwis & Vagant"
            allow="autoplay; encrypted-media"
          />
          <div className={`birthday-egg-scene${phase === 'revealed' ? ' is-hidden' : ''}`}>
            <MoonScene />
          </div>
          <img
            className={`birthday-egg-poster${phase === 'revealed' ? ' is-visible' : ''}`}
            src="/images/verrassing-elsbeth.png"
            alt="Voor Elsbeth: verrassingsuitje naar Guus Meeuwis in Ahoy"
          />
        </div>
      )}
    </>
  )
}
