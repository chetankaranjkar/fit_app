import { expect, test } from '@playwright/test'
import { helpGuides } from '../../src/modules/help/data/helpGuides'
import { pathnameToModuleKey } from '../../src/modules/help/routeModuleMap'

test.beforeEach(async ({ page }) => {
  const token = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: '101', role: ['ADMIN'], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`
  await page.addInitScript(({ token }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ token, userId: 101, email: 'help@test.local', username: 'help@test.local', appRoles: ['ADMIN'], permissions: [{ code: 'UsersAccess' }, { code: 'Config' }] }))
  }, { token })
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.toLowerCase()
    if (path.includes('/auth/preferences')) return route.fulfill({ json: { theme: 'dark' } })
    if (path.endsWith('/help/categories') || path.endsWith('/help/articles')) return route.fulfill({ json: [] })
    return route.fulfill({ status: 404, json: {} })
  })
})

test('help search spans all topics and reads complete guides @regression', async ({ page }) => {
  await page.goto('/help?category=training')
  await expect(page.getByRole('heading', { name: 'Training & nutrition', exact: true })).toBeVisible()
  await page.getByLabel('Search all help guides').fill('receipt')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).toHaveURL(/q=receipt/)
  await expect(page).not.toHaveURL(/category=/)
  await page.getByRole('button', { name: /Collect payments and issue receipts/ }).click()
  await expect(page.getByRole('heading', { name: 'Collect payments and issue receipts', exact: true })).toBeVisible()
  await expect(page.getByText('An invoice is the bill', { exact: false })).toBeVisible()
  await expect(page.locator('.help-prose ol li')).toHaveCount(4)
  await page.getByRole('button', { name: 'Back to guides' }).click()
  await expect(page.getByLabel('Search all help guides')).toHaveValue('receipt')
  await page.getByLabel('Clear search').click()
  await page.getByLabel('Search all help guides').fill('zz-no-such-guide')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No guides found' })).toBeVisible()
})

test('contextual help traps focus, restores it and links to its guide @regression', async ({ page }) => {
  await page.goto('/help')
  const trigger = page.getByRole('button', { name: 'Open help for this page' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Find the right help' })).toBeVisible()
  await expect(dialog.getByText('Good to know')).toBeVisible()
  await dialog.getByRole('link', { name: 'Read the full guide' }).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await page.keyboard.press('?')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('link', { name: 'Read the full guide' }).click()
  await expect(page).toHaveURL(/article=guide-help_center/)
  await expect(dialog).toHaveCount(0)
})

test('mobile and desktop layouts and legacy article links @regression', async ({ page }) => {
  await page.goto('/help')
  await expect(page.getByRole('heading', { name: 'How can we help you?' })).toBeVisible()
  await page.screenshot({ path: 'test-results/help-center-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390)
  await page.screenshot({ path: 'test-results/help-center-mobile.png' })
  await page.getByRole('button', { name: 'Open help for this page' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390)
  await page.keyboard.press('Escape')
  await page.goto('/help/article/payments-overview')
  await expect(page.getByRole('heading', { name: 'Collect payments and issue receipts', exact: true })).toBeVisible()
  await page.goto('/help?article=missing-guide')
  await expect(page.getByRole('heading', { name: 'This guide couldn’t be found' })).toBeVisible()
})

test('light theme and API extensions remain available @regression', async ({ page }) => {
  await page.route('**/api/Auth/preferences', (route) => route.fulfill({ json: { theme: 'light' } }))
  await page.route(/\/api\/help\/articles(?:\?|$)/, (route) => route.fulfill({
    json: [
      { id: 'custom-policy', categoryId: 'settings', title: 'Gym-specific guidance', summary: 'An additional guide from the help API.' },
      { id: 'welcome', categoryId: 'getting-started', title: 'Old welcome', summary: 'Replaced built-in guide.' },
    ]
  }))
  await page.goto('/help?category=settings')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: /Gym-specific guidance/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Old welcome/ })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/help-center-light.png' })
})

test('bundled guides stay useful when the help API is unavailable @regression', async ({ page }) => {
  await page.route('**/api/help/**', (route) => route.abort('failed'))
  await page.goto('/help?article=guide-members')
  await expect(page.getByRole('heading', { name: 'Add and manage members', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open help for this page' }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Find the right help' })).toBeVisible()
})

test('every documented module resolves its own guide', () => {
  for (const guide of helpGuides) expect(pathnameToModuleKey(guide.path), guide.path).toBe(guide.moduleKey)
  expect(pathnameToModuleKey('/dashboard/users/42/health-profile')).toBe('health_profile')
  expect(pathnameToModuleKey('/dashboard/training/workout-plan-builder')).toBe('workout_plans')
})
