import { afterEach, describe, expect, it } from 'vitest'
import { captureEditTokenFromUrl, clearEditToken, getEditToken, hasEditAccess } from './tripAccess'

afterEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
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
