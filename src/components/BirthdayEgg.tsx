import { useEffect, useRef, useState } from 'react'
import { isBirthdaySurpriseUnlocked } from '../utils/dates'

const REVEAL_DELAY_MS = 10_000

const STAR_COUNT = 60

type Phase = 'closed' | 'playing' | 'revealed'

interface Star {
  top: number
  left: number
  size: number
  duration: number
  delay: number
}

function generateStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    top: Math.random() * 62,
    left: Math.random() * 100,
    size: Math.random() * 2 + 0.6,
    duration: 1.8 + Math.random() * 2.6,
    delay: Math.random() * 4,
  }))
}

/** Achterdeurtje: ?verrassing=alvast in de URL ontgrendelt het cadeau-icoon ongeacht de datum. */
function hasPreviewOverride(): boolean {
  return new URLSearchParams(window.location.search).get('verrassing') === 'alvast'
}

const PALM_FRONDS = [
  'M52 60 C30 50 15 30 6 10 C30 18 46 34 54 54 Z',
  'M52 60 C34 42 26 22 24 2 C42 16 52 34 56 56 Z',
  'M52 60 C60 38 74 22 94 12 C88 34 74 50 56 58 Z',
  'M52 60 C66 46 84 38 100 38 C90 54 74 62 56 60 Z',
  'M52 60 C46 40 34 26 18 20 C28 38 40 52 54 58 Z',
]

function Palm({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`beach-palm ${side}`}>
      <svg viewBox="0 0 100 160" width="100%">
        <path d="M50 160 C48 120 50 90 52 60" stroke="#050403" strokeWidth="6" fill="none" strokeLinecap="round" />
        <g fill="#050403">
          {PALM_FRONDS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
    </div>
  )
}

function BeachScene() {
  const [stars] = useState(generateStars)

  return (
    <div className="beach-scene">
      <div className="beach-stars">
        {stars.map((star, i) => (
          <div
            key={i}
            className="beach-star"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="beach-shooting-star ss1" />
      <div className="beach-shooting-star ss2" />
      <div className="beach-moon" />
      <div className="beach-sea-wrap">
        <div className="beach-sea-layer beach-sea-layer1" />
        <div className="beach-sea-layer beach-sea-layer2" />
      </div>
      <div className="beach-reflection" />
      <Palm side="left" />
      <Palm side="right" />
      <div className="beach-sand" />
      <div className="beach-figures">
        <svg width="150" height="70" viewBox="0 0 150 70">
          <g className="beach-person p1" fill="#050403">
            <circle cx="52" cy="26" r="9" />
            <path d="M40 66 C36 46 42 34 52 34 C62 34 68 46 66 66 Z" />
            <path d="M42 50 C34 54 30 60 28 66 L34 66 C36 60 40 55 44 52 Z" />
          </g>
          <g className="beach-person p2" fill="#050403">
            <circle cx="95" cy="24" r="9" />
            <path d="M83 66 C79 44 85 32 95 32 C105 32 111 44 109 66 Z" />
            <path d="M105 50 C113 54 117 60 119 66 L113 66 C111 60 107 55 103 52 Z" />
          </g>
        </svg>
      </div>
    </div>
  )
}

export function BirthdayEgg() {
  const [unlocked] = useState(() => isBirthdaySurpriseUnlocked() || hasPreviewOverride())
  const [phase, setPhase] = useState<Phase>('closed')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (phase !== 'playing') return
    const timer = setTimeout(() => setPhase('revealed'), REVEAL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase])

  function playMusic() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  function handleOpen() {
    setPhase('playing')
    playMusic()
  }

  function handleClose() {
    setPhase('closed')
    audioRef.current?.pause()
  }

  if (!unlocked) return null

  return (
    <>
      <button
        className="birthday-egg-trigger"
        onClick={handleOpen}
        aria-label="Verrassing"
        data-testid="birthday-egg-trigger"
      >
        🎁
      </button>
      <audio
        ref={audioRef}
        src="/audio/verrassing.mp3"
        preload="auto"
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      {phase !== 'closed' && (
        <div className="birthday-egg-overlay" data-testid="birthday-egg-overlay">
          <button
            className="birthday-egg-close"
            onClick={handleClose}
            aria-label="Sluiten"
            data-testid="birthday-egg-close"
          >
            ×
          </button>
          <div className={`birthday-egg-scene${phase === 'revealed' ? ' is-hidden' : ''}`}>
            <BeachScene />
          </div>
          <img
            className={`birthday-egg-poster${phase === 'revealed' ? ' is-visible' : ''}`}
            src="/images/verrassing-elsbeth.png"
            alt="Voor Elsbeth: verrassingsuitje naar Guus Meeuwis in Ahoy"
          />
          {!isPlaying && (
            <button className="birthday-egg-music-hint" onClick={playMusic} data-testid="birthday-egg-music-hint">
              🎵 Tik voor muziek
            </button>
          )}
        </div>
      )}
    </>
  )
}
