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

    await page.getByRole('link', { name: /Vluchten/ }).click()
    await expect(page).toHaveURL(/#\/transport/)
    await expect(page.getByText('Vluchten', { exact: true }).first()).toBeVisible()

    await page.getByRole('link', { name: /Vandaag/ }).click()
    await expect(page).toHaveURL(/#\/today/)
    await expect(page.locator('.day-card').first()).toBeVisible()
  })

  test('extra menu opent fotos en praktische informatie', async ({ page }) => {
    await page.goto('/#/today')

    await page.getByRole('link', { name: /Foto's/ }).click()
    await expect(page).toHaveURL(/#\/photos/)
    await expect(page.getByText("Foto's", { exact: true }).first()).toBeVisible()

    await page.getByRole('link', { name: /Praktisch/ }).click()
    await expect(page).toHaveURL(/#\/practical/)
    await expect(page.getByText('Praktische informatie')).toBeVisible()
  })

  test('geen console errors tijdens navigeren', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))

    for (const route of ['/today', '/trip', '/hotels', '/transport', '/photos', '/practical']) {
      await page.goto(`/#${route}`)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toEqual([])
  })
})
