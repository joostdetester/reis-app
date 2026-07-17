import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  captureEditTokenFromUrl,
  clearEditToken,
  getEditToken,
  hasEditAccess,
  verifyEditToken,
} from './tripAccess'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('./supabaseClient', () => ({
  supabase: { functions: { invoke } },
}))

afterEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  invoke.mockReset()
})

describe('hasEditAccess', () => {
  it('is false zonder edit-token (alleen-lezen)', () => {
    expect(getEditToken()).toBeNull()
    expect(hasEditAccess()).toBe(false)
  })

  it('is true nadat een token uit de URL is gelezen (bewerk-modus)', () => {
    window.history.replaceState(null, '', '/?token=geheim123')
    captureEditTokenFromUrl()

    expect(getEditToken()).toBe('geheim123')
    expect(hasEditAccess()).toBe(true)
  })

  it('haalt de token uit de zichtbare URL na het lezen', () => {
    window.history.replaceState(null, '', '/?token=geheim123&day=2026-07-25')
    captureEditTokenFromUrl()

    expect(window.location.search).toBe('?day=2026-07-25')
  })

  it('valt terug naar alleen-lezen na uitloggen', () => {
    window.history.replaceState(null, '', '/?token=geheim123')
    captureEditTokenFromUrl()
    expect(hasEditAccess()).toBe(true)

    clearEditToken()

    expect(getEditToken()).toBeNull()
    expect(hasEditAccess()).toBe(false)
  })
})

describe('verifyEditToken', () => {
  it('is false zonder opgeslagen token, zonder de backend te bevragen', async () => {
    expect(await verifyEditToken()).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('is true zodra de backend de token als geldig bevestigt', async () => {
    window.history.replaceState(null, '', '/?token=geheim123')
    captureEditTokenFromUrl()
    invoke.mockResolvedValue({ data: { data: { valid: true } }, error: null })

    expect(await verifyEditToken()).toBe(true)
    expect(invoke).toHaveBeenCalledWith('verify-edit-token', {
      body: { slug: expect.any(String), token: 'geheim123' },
    })
  })

  it('is false zodra de backend de token afwijst', async () => {
    window.history.replaceState(null, '', '/?token=fout')
    captureEditTokenFromUrl()
    invoke.mockResolvedValue({ data: { data: { valid: false } }, error: null })

    expect(await verifyEditToken()).toBe(false)
  })

  it('is false bij een netwerk-/serverfout (fail-closed)', async () => {
    window.history.replaceState(null, '', '/?token=geheim123')
    captureEditTokenFromUrl()
    invoke.mockResolvedValue({ data: null, error: new Error('network down') })

    expect(await verifyEditToken()).toBe(false)
  })
})
