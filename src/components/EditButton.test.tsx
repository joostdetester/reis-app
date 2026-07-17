import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditButton } from './EditButton'
import { EditAccessProvider } from '../lib/editAccessContext'
import { captureEditTokenFromUrl } from '../lib/tripAccess'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('../lib/supabaseClient', () => ({
  supabase: { functions: { invoke } },
}))

afterEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  invoke.mockReset()
})

describe('EditButton', () => {
  it('toont niets zonder edit-token (alleen-lezen)', () => {
    render(
      <EditAccessProvider>
        <EditButton onClick={vi.fn()} testId="test-edit" />
      </EditAccessProvider>,
    )
    expect(screen.queryByText('Bewerk')).not.toBeInTheDocument()
  })

  it('blijft verborgen voor een token die de backend afwijst', async () => {
    window.history.replaceState(null, '', '/?token=fout')
    captureEditTokenFromUrl()
    invoke.mockResolvedValue({ data: { data: { valid: false } }, error: null })

    render(
      <EditAccessProvider>
        <EditButton onClick={vi.fn()} testId="test-edit" />
      </EditAccessProvider>,
    )

    await waitFor(() => expect(invoke).toHaveBeenCalled())
    expect(screen.queryByText('Bewerk')).not.toBeInTheDocument()
  })

  it('toont de knop en roept onClick aan zodra de backend de token bevestigt', async () => {
    window.history.replaceState(null, '', '/?token=geheim123')
    captureEditTokenFromUrl()
    invoke.mockResolvedValue({ data: { data: { valid: true } }, error: null })

    const onClick = vi.fn()
    render(
      <EditAccessProvider>
        <EditButton onClick={onClick} testId="test-edit" />
      </EditAccessProvider>,
    )

    const button = await screen.findByTestId('test-edit')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
