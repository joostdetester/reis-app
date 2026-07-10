import { test, expect } from '@playwright/test'

test.describe('hoofdnavigatie', () => {
  test('bottom-nav opent alle vier hoofdpagina\'s', async ({ page }) => {
    await page.goto('/#/today')
    await expect(page.locator('.day-card').first()).toBeVisible()

    await page.getByRole('link', { name: /Reis/ }).click()
    await expect(page).toHaveURL(/#\/trip/)
    await expect(page.locator('.toolbar')).toBeVisible()

    await page.getByRole('link', { name: /Hotels/ }).click()
    await expect(page).toHaveURL(/#\/hotels/)
    await expect(page.getByText('Overnachtingen')).toBeVisible()

    await page.getByRole('link', { name: /Vervoer/ }).click()
    await expect(page).toHaveURL(/#\/transport/)
    await expect(page.getByText('Vervoer', { exact: true }).first()).toBeVisible()

    await page.getByRole('link', { name: /Vandaag/ }).click()
    await expect(page).toHaveURL(/#\/today/)
    await expect(page.locator('.day-card').first()).toBeVisible()
  })

  test('extra menu opent zoeken en praktische informatie', async ({ page }) => {
    await page.goto('/#/today')

    await page.getByRole('link', { name: /Zoeken/ }).click()
    await expect(page).toHaveURL(/#\/search/)
    await expect(page.getByPlaceholder('Zoek hotel, vlucht, activiteit…')).toBeVisible()

    await page.getByRole('link', { name: /Praktisch/ }).click()
    await expect(page).toHaveURL(/#\/practical/)
    await expect(page.getByText('Praktische informatie')).toBeVisible()
  })

  test('geen console errors tijdens navigeren', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))

    for (const route of ['/today', '/trip', '/hotels', '/transport', '/search', '/practical']) {
      await page.goto(`/#${route}`)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toEqual([])
  })
})
