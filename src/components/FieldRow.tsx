import { useState } from 'react'
import { EditButton } from './EditButton'
import { EditSheet } from './EditSheet'
import { saveEdit } from '../lib/saveEdit'

interface FieldRowProps {
  icon: string
  label: string
  value: string | null
  table: string
  id: string
  field: string
  placeholder?: string
  /** Als gezet én er een waarde is, wordt de waarde zelf een link (bv. naar Google Maps) i.p.v. platte tekst. */
  href?: string
}

/** Eén bewerkbaar veld: icoon, label, waarde en een "Bewerk"-knop die het bevestigingssheet opent. */
export function FieldRow({ icon, label, value, table, id, field, placeholder = '-', href }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const testId = `field-${table}-${field}-${id}`

  async function handleSave(newValue: string) {
    await saveEdit(table, id, { [field]: newValue || null })
    setEditing(false)
  }

  return (
    <div className="row" data-testid={testId}>
      <div>{icon}</div>
      <div>
        <div className="kicker">{label}</div>
        <div className="value" data-testid={`${testId}-value`}>
          {value && href ? (
            <a target="_blank" rel="noreferrer" href={href}>
              {value}
            </a>
          ) : (
            value || placeholder
          )}
        </div>
      </div>
      <EditButton onClick={() => setEditing(true)} testId={`${testId}-edit`} />
      {editing && (
        <EditSheet
          label={label}
          value={value ?? ''}
          onCancel={() => setEditing(false)}
          onSave={handleSave}
          testId={`${testId}-sheet`}
        />
      )}
    </div>
  )
}
