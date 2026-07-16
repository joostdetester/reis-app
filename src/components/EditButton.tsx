import { hasEditAccess } from '../lib/tripAccess'

/** "Bewerk"-knop die alleen verschijnt met geldige edit-token (zie tripAccess.ts). */
export function EditButton({ onClick, testId }: { onClick: () => void; testId: string }) {
  if (!hasEditAccess()) return null

  return (
    <button className="edit" onClick={onClick} data-testid={testId}>
      Bewerk
    </button>
  )
}
