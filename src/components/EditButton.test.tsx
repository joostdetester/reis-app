import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditButton } from './EditButton'
import { captureEditTokenFromUrl } from '../lib/tripAccess'

afterEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('EditButton', () => {
  it('toont niets zonder edit-token (alleen-lezen)', () => {
    render(<EditButton onClick={vi.fn()} />)
    expect(screen.queryByText('Bewerk')).not.toBeInTheDocument()
  })

  it('toont de knop en roept onClick aan met een edit-token', () => {
    window.history.replaceState(null, '', '/?token=geheim123')
    captureEditTokenFromUrl()
    const onClick = vi.fn()
    render(<EditButton onClick={onClick} />)

    const button = screen.getByText('Bewerk')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
