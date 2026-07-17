import { useHasEditAccess } from '../lib/editAccessContext'

/** "Bewerk"-knop die alleen verschijnt met een geverifieerde edit-token (zie editAccessContext.tsx). */
export function EditButton({ onClick, testId }: { onClick: () => void; testId: string }) {
  const hasAccess = useHasEditAccess()
  if (!hasAccess) return null

  return (
    <button className="edit" onClick={onClick} data-testid={testId}>
      Bewerk
    </button>
  )
}
