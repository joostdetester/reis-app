import { useEffect, useState } from 'react'

const FALLBACK_PHP_PER_EUR = 61

interface RateState {
  phpPerEur: number
  isLive: boolean
  date: string | null
}

function parseAmount(value: string): number | null {
  const num = parseFloat(value.replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

export function CurrencyConverter() {
  const [rate, setRate] = useState<RateState>({ phpPerEur: FALLBACK_PHP_PER_EUR, isLive: false, date: null })
  const [lastEdited, setLastEdited] = useState<'php' | 'eur'>('php')
  const [phpRaw, setPhpRaw] = useState('')
  const [eurRaw, setEurRaw] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=PHP')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const phpPerEur = data?.rates?.PHP
        if (typeof phpPerEur === 'number') {
          setRate({ phpPerEur, isLive: true, date: data.date })
        }
      })
      .catch(() => {
        // Blijft op de fallback-koers staan; geen harde fout tonen voor een bijkomstig hulpmiddel.
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Het niet-actief bewerkte veld wordt bij elke render herberekend uit de huidige
  // koers, zodat een inmiddels binnengekomen live koers meteen wordt toegepast —
  // ook als die pas ná het typen door de gebruiker binnenkomt.
  const phpAmount = parseAmount(phpRaw)
  const eurAmount = parseAmount(eurRaw)

  const displayedPhp = lastEdited === 'eur' ? (eurAmount !== null ? (eurAmount * rate.phpPerEur).toFixed(2) : '') : phpRaw
  const displayedEur = lastEdited === 'php' ? (phpAmount !== null ? (phpAmount / rate.phpPerEur).toFixed(2) : '') : eurRaw

  return (
    <div className="list-card" data-testid="currency-converter">
      <h3>Peso ↔ Euro</h3>
      <div className="row">
        <div>₱</div>
        <div>
          <div className="kicker">Peso (PHP)</div>
          <input
            className="search"
            inputMode="decimal"
            placeholder="0"
            value={displayedPhp}
            onChange={(e) => {
              setLastEdited('php')
              setPhpRaw(e.target.value)
            }}
            data-testid="currency-converter-php"
          />
        </div>
      </div>
      <div className="row">
        <div>€</div>
        <div>
          <div className="kicker">Euro (EUR)</div>
          <input
            className="search"
            inputMode="decimal"
            placeholder="0"
            value={displayedEur}
            onChange={(e) => {
              setLastEdited('eur')
              setEurRaw(e.target.value)
            }}
            data-testid="currency-converter-eur"
          />
        </div>
      </div>
      <p className="muted" style={{ marginTop: 8 }} data-testid="currency-converter-rate">
        Koers: 1 EUR ≈ {rate.phpPerEur.toFixed(2)} PHP
        {rate.isLive ? ` (actueel, ${rate.date})` : ' (indicatief, kon actuele koers niet ophalen)'}
      </p>
    </div>
  )
}
