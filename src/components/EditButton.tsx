import { hasEditAccess } from '../lib/tripAccess'

/** "Bewerk"-knop die alleen verschijnt met geldige edit-token (zie tripAccess.ts). */
export function EditButton({ onClick }: { onClick: () => void }) {
  if (!hasEditAccess()) return null

  return (
    <button className="edit" onClick={onClick}>
      Bewerk
    </button>
  )
}
