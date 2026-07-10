import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditSheet } from './EditSheet'

describe('EditSheet', () => {
  it('roept onCancel aan en slaat niets op bij annuleren', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    render(<EditSheet label="Notitie" value="oud" onCancel={onCancel} onSave={onSave} />)

    fireEvent.click(screen.getByText('Annuleren'))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('vraagt eerst bevestiging voordat onSave wordt aangeroepen', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<EditSheet label="Notitie" value="oud" onCancel={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nieuw' } })
    fireEvent.click(screen.getByText('Opslaan'))

    // Nog niet opgeslagen: eerst de bevestigingsstap.
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Deze wijziging opslaan?')).toBeInTheDocument()
  })

  it('roept onSave pas aan na bevestigen', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<EditSheet label="Notitie" value="oud" onCancel={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nieuw' } })
    fireEvent.click(screen.getByText('Opslaan'))
    fireEvent.click(screen.getByText('Bevestigen'))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('nieuw'))
  })
})
