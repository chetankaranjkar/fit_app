import { expect, test, type Page } from '@playwright/test'

const path = '/dashboard/access/owner-qr'
const branches = [{ id: 1, branchName: 'Tiger Fitness · Main Studio', isActive: true }, { id: 2, branchName: 'Riverside Studio', isActive: true }]
const expiry = new Date(Date.now() + 25 * 86400000).toISOString()
const initial = {
  activeQr: { gymQrCodeId: 10, branchId: 1, qrToken: '11111111-1111-4111-8111-111111111111', expiryDateUtc: expiry, createdDateUtc: new Date().toISOString() },
  expiresWithinThreeDays: false, branchIsActive: true, branchGeoConfigured: true, branchDoorUrlConfigured: false,
  branchLatitude: 19.076, branchLongitude: 72.8777, checkInRadiusOffsetMeters: 0, effectiveCheckInRadiusMeters: 100,
  esp32DoorBaseUrl: null as string | null, branchName: branches[0].branchName,
  recentScans: [{ attendanceLogId: 11, userId: 10011, memberName: 'Ayush Gire', checkInTimeUtc: '2026-10-18T08:15:00Z', notes: 'QR check-in' }],
}

async function setup(page: Page, opts: { empty?: boolean; dashboardError?: boolean; unconfigured?: boolean; inactive?: boolean } = {}) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: '101', role: ['ADMIN'], exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
  await page.addInitScript(({ token }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ token, userId: 101, username: 'staff@test.local', appRoles: ['ADMIN'], permissions: ['UsersAccess', 'Config'].map((code, i) => ({ id: i + 1, code })) }))
  }, { token })
  const saved: { branchId: number; body: Record<string, unknown> }[] = []
  let generated = 0
  let dashboardError = opts.dashboardError ?? false
  const data = { ...initial, ...(opts.unconfigured ? { activeQr: null, branchGeoConfigured: false, branchLatitude: null, branchLongitude: null, recentScans: [] } : {}), branchIsActive: !opts.inactive }
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const pathname = url.pathname.toLowerCase()
    if (pathname === '/api/auth/preferences') return route.fulfill({ json: { theme: 'dark' } })
    if (pathname === '/api/branches') return route.fulfill({ json: opts.empty ? [] : branches })
    if (pathname === '/api/qr/owner-dashboard') {
      if (dashboardError) return route.fulfill({ status: 503, json: { message: 'Branch temporarily unavailable' } })
      const branchId = Number(url.searchParams.get('branchId'))
      return route.fulfill({ json: { ...data, branchName: branches.find((branch) => branch.id === branchId)?.branchName } })
    }
    if (/\/api\/branches\/\d+\/qr-access/.test(pathname)) {
      const body = route.request().postDataJSON() as Record<string, unknown>
      saved.push({ branchId: Number(pathname.split('/')[3]), body })
      Object.assign(data, { branchLatitude: body.latitude, branchLongitude: body.longitude, checkInRadiusOffsetMeters: body.checkInRadiusOffsetMeters, effectiveCheckInRadiusMeters: 100 + Number(body.checkInRadiusOffsetMeters), esp32DoorBaseUrl: body.esp32DoorBaseUrl, branchGeoConfigured: true, branchDoorUrlConfigured: Boolean(body.esp32DoorBaseUrl) })
      return route.fulfill({ json: {} })
    }
    if (pathname === '/api/qr/generate') {
      generated++
      Object.assign(data, { activeQr: { ...initial.activeQr, qrToken: '22222222-2222-4222-8222-222222222222' } })
      return route.fulfill({ json: data.activeQr })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto(path)
  return { saved, generated: () => generated, recover: () => { dashboardError = false } }
}

test('owner QR console presents a scannable QR across desktop/mobile and both themes', async ({ page }, testInfo) => {
  await setup(page)
  const qr = page.getByRole('img', { name: `Venue QR for ${branches[0].branchName}` })
  await expect(qr).toBeVisible()
  await expect(qr).toHaveAttribute('src', /^data:image\/png;base64,/)
  await expect(page.getByRole('heading', { name: 'Branch entry settings' })).toBeVisible()
  await expect(page.getByText('Ayush Gire', { exact: true })).toBeVisible()
  for (const layout of [
    { name: 'desktop-light', width: 1560, height: 1250, theme: 'light' },
    { name: 'desktop-dark', width: 1560, height: 1250, theme: 'dark' },
    { name: 'mobile-light', width: 390, height: 1000, theme: 'light' },
  ]) {
    await page.setViewportSize({ width: layout.width, height: layout.height })
    await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), layout.theme)
    await qr.evaluate((element: HTMLImageElement) => element.decode())
    await page.getByRole('heading', { name: 'Venue QR & entry' }).scrollIntoViewIfNeeded()
    const content = page.locator('.owner-qr-page')
    expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`owner-qr-${layout.name}.png`), animations: 'disabled' })
    await qr.screenshot({ path: testInfo.outputPath(`qr-code-${layout.name}.png`), animations: 'disabled' })
    if (layout.width === 390) {
      await page.getByRole('heading', { name: 'Branch entry settings' }).scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath('owner-qr-mobile-settings.png'), animations: 'disabled' })
    }
    await page.locator('.owner-qr-history-card').scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`owner-qr-history-${layout.name}.png`), animations: 'disabled' })
  }
})

test('settings validate, reset, and save the selected branch and radius', async ({ page }) => {
  const state = await setup(page)
  await expect(page.getByLabel('Latitude (WGS84)')).toHaveValue('19.076')
  await page.getByLabel('Latitude (WGS84)').fill('abc')
  await page.getByRole('button', { name: 'Save branch settings' }).click()
  await expect(page.getByText('Latitude and longitude must be valid numbers (or empty to clear).')).toBeVisible()
  expect(state.saved).toHaveLength(0)
  await expect(page.getByText('Branch access settings saved.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Reset changes' }).click()
  await expect(page.getByLabel('Latitude (WGS84)')).toHaveValue('19.076')
  await page.getByLabel('Branch for QR operations').selectOption('2')
  await expect(page.getByRole('heading', { name: 'Riverside Studio', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '200 m', exact: true }).click()
  await page.getByLabel('ESP32 base URL (optional)').fill('http://192.168.1.50')
  await page.getByRole('button', { name: 'Save branch settings' }).click()
  await expect(page.getByText('Branch access settings saved.')).toBeVisible()
  expect(state.saved).toEqual([{ branchId: 2, body: { latitude: 19.076, longitude: 72.8777, esp32DoorBaseUrl: 'http://192.168.1.50', checkInRadiusOffsetMeters: 100 } }])
  await page.getByRole('button', { name: 'Decrease radius by 10 meters' }).click()
  await expect(page.getByLabel('Offset (meters)')).toHaveValue('90')
  await page.getByRole('button', { name: 'Reset changes' }).click()
  await expect(page.getByLabel('Offset (meters)')).toHaveValue('100')
})

test('QR can be generated and exported without changing branch settings', async ({ page }) => {
  const state = await setup(page)
  await expect(page.getByRole('img', { name: /Venue QR for/ })).toBeVisible()
  await page.getByRole('button', { name: 'Generate new QR' }).click()
  await expect(page.getByText('New venue QR activated.')).toBeVisible()
  expect(state.generated()).toBe(1)
  expect(state.saved).toHaveLength(0)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  expect((await downloaded).suggestedFilename()).toBe('gym-branch-1-qr.png')
})

test('empty branches and inactive branches keep actions disabled', async ({ page }) => {
  await setup(page, { empty: true })
  await expect(page.getByRole('button', { name: 'Generate new QR' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Save branch settings' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Add a branch' })).toBeVisible()
})

test('unconfigured branch explains next actions and inactive branch cannot generate', async ({ page }) => {
  await setup(page, { unconfigured: true, inactive: true })
  await expect(page.getByText('No active QR yet')).toBeVisible()
  await expect(page.getByText('Save both coordinates to configure the distance check.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Reactivate this branch' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate new QR' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
})

test('failed dashboard loads can be retried without enabling stale actions', async ({ page }) => {
  const state = await setup(page, { dashboardError: true })
  await expect(page.getByRole('heading', { name: 'Unable to load QR' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save branch settings' })).toBeDisabled()
  state.recover()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('img', { name: /Venue QR for/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate new QR' })).toBeEnabled()
})
