import { useState } from 'react'

interface EditSheetProps {
  label: string
  value: string
  onCancel: () => void
  onSave: (value: string) => Promise<void>
}

export function EditSheet({ label, value, onCancel, onSave }: EditSheetProps) {
  const [draft, setDraft] = useState(value)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan is mislukt')
      setSaving(false)
      setConfirming(false)
    }
  }

  return (
    <div className="overlay">
      <div className="sheet">
        <h2>{label} bewerken</h2>
        <textarea
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={confirming || saving}
        />
        {error && <div className="notice">{error}</div>}
        {confirming ? (
          <>
            <div className="notice">Deze wijziging opslaan?</div>
            <div className="actions">
              <button onClick={() => setConfirming(false)} disabled={saving}>
                Terug
              </button>
              <button className="primary" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Bezig…' : 'Bevestigen'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="notice">Na opslaan vervangt dit de huidige informatie.</div>
            <div className="actions">
              <button onClick={onCancel}>Annuleren</button>
              <button className="primary" onClick={() => setConfirming(true)}>
                Opslaan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
