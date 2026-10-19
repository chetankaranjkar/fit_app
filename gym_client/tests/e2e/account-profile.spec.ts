import { expect, test, type Page } from '@playwright/test'

async function setup(page: Page, options: { authOnly?: boolean; otp?: boolean; preferenceError?: boolean } = {}) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: '101', role: ['ADMIN'], exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
  await page.addInitScript(({ token, authOnly }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ token, userId: authOnly ? undefined : 101, username: 'admin@example.test', email: 'admin@example.test', fullName: 'Admin User', role: 3, appRoles: ['ADMIN'], permissions: [{ code: 'Config' }, { code: 'UsersAccess' }] }))
  }, { token, authOnly: options.authOnly })
  let requiresCurrentPassword = !options.otp
  let preferences = { receiveEmailNotifications: false, receiveSmsNotifications: false }
  const preferenceWrites: object[] = []
  const passwordWrites: Record<string, string>[] = []
  const memberReads: string[] = []
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.toLowerCase()
    if (path === '/api/auth/preferences') return route.fulfill({ json: { theme: 'light' } })
    if (path.startsWith('/api/me/')) memberReads.push(path)
    if (path === '/api/me/profile') return route.fulfill({ json: { userId: 101, fullName: 'Admin User', email: 'admin@example.test', phone: null, registrationDate: '2026-05-06T00:00:00' } })
    if (path === '/api/auth/account') return route.fulfill({ json: { email: 'admin@example.test', requiresCurrentPassword } })
    if (path === '/api/me/notification-preferences') {
      if (options.preferenceError) return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
      if (route.request().method() === 'PUT') {
        preferences = route.request().postDataJSON()
        preferenceWrites.push(preferences)
      }
      return route.fulfill({ json: preferences })
    }
    if (path === '/api/auth/change-password') {
      passwordWrites.push(route.request().postDataJSON())
      requiresCurrentPassword = true
      return route.fulfill({ json: {} })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/dashboard/profile')
  await expect(page.getByRole('heading', { name: 'Profile & settings' })).toBeVisible()
  return { preferenceWrites, passwordWrites, memberReads }
}

test('account settings fit desktop/mobile and both dashboard themes', async ({ page }, testInfo) => {
  await setup(page)
  await expect(page.getByRole('switch', { name: 'Receive email', exact: true })).toBeVisible()
  await expect(page.getByText('Not provided', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/dashboard')
  await expect(page.getByRole('link', { name: /Visit help center/ })).toHaveAttribute('rel', 'noopener noreferrer')
  for (const layout of [
    { name: 'desktop-light', width: 1560, height: 1100, theme: 'light' },
    { name: 'desktop-dark', width: 1560, height: 1100, theme: 'dark' },
    { name: 'mobile-light', width: 390, height: 844, theme: 'light' },
  ]) {
    await page.setViewportSize({ width: layout.width, height: layout.height })
    await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), layout.theme)
    const main = page.locator('#dashboard-main')
    expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`profile-${layout.name}.png`), animations: 'disabled' })
    await page.getByRole('button', { name: 'Update password', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByLabel('Confirm new password', { exact: true })).toBeVisible()
    if (layout.width === 390) await page.screenshot({ path: testInfo.outputPath('profile-mobile-password.png'), animations: 'disabled' })
    await page.getByRole('heading', { name: 'Profile & settings' }).scrollIntoViewIfNeeded()
  }
})

test('notification switches save independently and password confirmation validates before posting', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('switch', { name: 'Receive email', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'Receive email', exact: true })).toBeChecked()
  await page.getByRole('switch', { name: 'Receive SMS / WhatsApp', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'Receive SMS / WhatsApp', exact: true })).toBeChecked()
  expect(state.preferenceWrites).toEqual([
    { receiveEmailNotifications: true, receiveSmsNotifications: false },
    { receiveEmailNotifications: true, receiveSmsNotifications: true },
  ])
  await page.getByLabel('Current password', { exact: true }).fill('old-test-password')
  await page.getByLabel('New password', { exact: true }).fill('new-test-password')
  await page.getByLabel('Confirm new password', { exact: true }).fill('mismatch-password')
  await page.getByRole('button', { name: 'Show new password', exact: true }).click()
  await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute('type', 'text')
  await expect(page.getByLabel('Current password', { exact: true })).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('The new passwords do not match.')
  expect(state.passwordWrites).toHaveLength(0)
  await page.getByLabel('Confirm new password', { exact: true }).fill('new-test-password')
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your password has been updated.' })).toBeVisible()
  expect(state.passwordWrites).toEqual([{ currentPassword: 'old-test-password', newPassword: 'new-test-password', confirmPassword: 'new-test-password' }])
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('')
})

test('auth-only accounts skip member APIs and OTP accounts can set their first password', async ({ page }) => {
  const state = await setup(page, { authOnly: true, otp: true })
  await expect(page.getByRole('heading', { name: 'Set a password' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Notification preferences' })).toHaveCount(0)
  await expect(page.getByLabel('Current password', { exact: true })).toHaveCount(0)
  expect(state.memberReads).toEqual([])
  await page.getByLabel('New password', { exact: true }).fill('first-test-password')
  await page.getByLabel('Confirm new password', { exact: true }).fill('first-test-password')
  await page.getByRole('button', { name: 'Set password', exact: true }).click()
  await expect(page.getByLabel('Current password', { exact: true })).toBeVisible()
  expect(state.passwordWrites).toEqual([{ newPassword: 'first-test-password', confirmPassword: 'first-test-password' }])
})
