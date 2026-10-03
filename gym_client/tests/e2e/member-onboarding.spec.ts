import { expect, test, type Page } from '@playwright/test'

/**
 * Onboarding checklist on the member profile. The member and profile-summary responses are
 * stubbed; every other /api call returns 404.
 */

const MEMBER_ID = 501

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

const member = {
  id: MEMBER_ID,
  firstName: 'Riya',
  lastName: 'Sharma',
  email: 'riya@test.local',
  phone: '9876543210',
  isActive: true,
  role: 'User',
  assignedTrainerId: null,
  assignedTrainerName: null,
}

const baseSummary = {
  latestWeightKg: null,
  latestHeightCm: null,
  bmi: null,
  streak: 0,
  visitsThisMonth: 0,
  totalVisits: 0,
  hasActiveMembership: false,
  hasWorkoutAssignment: false,
  hasDietAssignment: false,
  hasAnyDietAssignment: false,
  primaryDietPlanName: null,
  currentMembershipId: null,
  currentMembershipStatus: null,
  currentMembershipPlanName: null,
  currentMembershipEndDate: null,
  lapsedMembershipEndDate: null,
  hasOpenBalance: false,
  isPaymentOverdue: false,
  openMembershipId: null,
}

test.describe('Dashboard theme @theme', () => {
  test('loads the account preference without a browser cache', async ({ page }) => {
    await openProfile(page, { ...ADMIN, summary: {}, theme: 'light' })
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeEnabled()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('keeps the local preference and reports a failed account save', async ({ page }) => {
    await openProfile(page, { ...ADMIN, summary: {}, preferencesOffline: true })
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.getByText('Theme changed on this device, but could not be saved to your account. Try again.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeEnabled()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeEnabled()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('defaults to dark and keeps a light preference across navigation and reload', async ({ page }) => {
    await openProfile(page, { appRoles: ['ADMIN'], permissions: ['UsersAccess', 'Payments'], summary: {} })
    const root = page.locator('html')
    await expect(root).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(root).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 245, 250)')
    await expect(page.getByRole('heading', { name: 'Riya Sharma' })).toHaveCSS('color', 'rgb(23, 32, 51)')
    await page.getByRole('button', { name: 'Progress', exact: true }).click()
    await expect(root).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'New Member', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Add user' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(dialog.getByRole('heading', { name: 'Add user', exact: true })).toHaveCSS('color', 'rgb(23, 32, 51)')
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 245, 250)')
    // A fresh browser has no local cache; the persisted API preference wins.
    await page.evaluate(() => localStorage.removeItem('gym-dashboard-theme:staff@test.local'))
    await page.reload()
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible()
    await expect(root).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(root).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })

  test('switch is available on mobile without billing permission and supports keyboard input', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openProfile(page, { appRoles: ['RECEPTIONIST'], permissions: ['UsersAccess'], summary: {} })
    const toggle = page.getByRole('button', { name: 'Switch to light mode' })
    await expect(toggle).toBeVisible()
    await toggle.focus()
    await toggle.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible()
  })
})

async function openProfile(
  page: Page,
  opts: { appRoles: string[]; permissions: string[]; summary: Partial<typeof baseSummary>; user?: Partial<typeof member>; theme?: 'light' | 'dark'; preferencesOffline?: boolean },
) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === `/api/users/${MEMBER_ID}`,
    (route) => route.fulfill({ json: { ...member, ...opts.user } }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === `/api/users/${MEMBER_ID}/profile-summary`,
    (route) => route.fulfill({ json: { ...baseSummary, ...opts.summary } }),
  )
  let savedTheme = opts.theme ?? 'dark'
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/auth/preferences',
    async (route) => {
      if (opts.preferencesOffline) return route.fulfill({ status: 503, json: { message: 'Offline' } })
      if (route.request().method() === 'PUT') {
        const payload = route.request().postDataJSON() as { theme: 'light' | 'dark' }
        expect(Object.keys(payload)).toEqual(['theme'])
        savedTheme = payload.theme
      }
      return route.fulfill({ json: { theme: savedTheme } })
    },
  )
  const token = fakeJwt(opts.appRoles)
  const user = {
    token,
    username: 'staff@test.local',
    email: 'staff@test.local',
    fullName: 'Staff Test',
    userId: 101,
    appRoles: opts.appRoles,
    permissions: opts.permissions.map((code, i) => ({ id: i + 1, code })),
  }
  await page.addInitScript(
    ({ token, user }) => {
      if (sessionStorage.getItem('onboarding-seeded')) return
      sessionStorage.setItem('onboarding-seeded', '1')
      localStorage.clear()
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user },
  )
  await page.goto(`/dashboard/users/${MEMBER_ID}`)
  const checklist = page.getByTestId('member-onboarding')
  await expect(checklist.locator('[data-step="payment"]')).toBeHidden()
  await checklist.getByRole('button', { name: 'Show checklist' }).click()
  await expect(checklist.locator('[data-step="payment"]')).toBeVisible({ timeout: 30_000 })
  await expect(checklist.getByText('Checking setup…')).toHaveCount(0)
  return checklist
}

async function statuses(checklist: ReturnType<Page['getByTestId']>) {
  return checklist.locator('li[data-step]').evaluateAll((items) =>
    Object.fromEntries(items.map((li) => [li.getAttribute('data-step'), li.getAttribute('data-status')])),
  )
}

const ADMIN = { appRoles: ['ADMIN'], permissions: ['UsersAccess', 'Payments', 'TrainerAccess', 'MANAGE_MEMBERS'] }

test.describe('Member onboarding checklist @onboarding', () => {
  test('new member: membership is the next required step, training is locked', async ({ page }) => {
    const checklist = await openProfile(page, { ...ADMIN, summary: {} })

    expect(await statuses(checklist)).toEqual({
      profile: 'done',
      membership: 'todo',
      payment: 'blocked',
      coach: 'todo',
      workout: 'blocked',
      diet: 'blocked',
    })
    await expect(checklist.getByText('Required 1 of 3 · Optional 0 of 3')).toBeVisible()
    const next = page.getByTestId('member-onboarding-next')
    await expect(next).toContainText('Membership')
    await expect(next.getByRole('button', { name: 'Add membership →' })).toBeVisible()
    await expect(checklist.locator('[data-step="workout"]')).toContainText('Needs an active, paid membership.')
    await expect(checklist.locator('[data-step="coach"]')).toContainText('Optional')
  })

  test('unpaid membership: payment is next and links to collect payment', async ({ page }) => {
    const checklist = await openProfile(page, {
      ...ADMIN,
      summary: {
        currentMembershipId: 77,
        currentMembershipStatus: 'ActivePendingPayment',
        currentMembershipPlanName: 'Quarterly',
        currentMembershipEndDate: '2026-12-31T00:00:00',
        hasOpenBalance: true,
        isPaymentOverdue: true,
        openMembershipId: 77,
      },
    })

    expect(await statuses(checklist)).toMatchObject({ membership: 'done', payment: 'attention', workout: 'blocked' })
    const next = page.getByTestId('member-onboarding-next')
    await expect(next).toContainText('Payment is overdue.')
    await expect(next.getByRole('link', { name: 'Collect payment →' })).toHaveAttribute(
      'href',
      new RegExp(`/dashboard/payments/collect.*77`),
    )
    await expect(checklist.locator('[data-step="workout"]')).toContainText('Unlocks once the membership is paid.')
  })

  test('paid member is ready to train and the next optional step is coach', async ({ page }) => {
    const checklist = await openProfile(page, {
      ...ADMIN,
      summary: {
        hasActiveMembership: true,
        currentMembershipId: 77,
        currentMembershipStatus: 'Active',
        currentMembershipPlanName: 'Quarterly',
        currentMembershipEndDate: '2026-12-31T00:00:00',
      },
    })

    expect(await statuses(checklist)).toEqual({
      profile: 'done',
      membership: 'done',
      payment: 'done',
      coach: 'todo',
      workout: 'todo',
      diet: 'todo',
    })
    const next = page.getByTestId('member-onboarding-next')
    await expect(next).toContainText('Ready to train · next optional step')
    await expect(next.getByRole('button', { name: 'Assign coach →' })).toBeVisible()
  })

  test('expired membership needs attention with a renew action', async ({ page }) => {
    const checklist = await openProfile(page, { ...ADMIN, summary: { lapsedMembershipEndDate: '2026-09-01T00:00:00' } })

    expect(await statuses(checklist)).toMatchObject({ membership: 'attention', payment: 'blocked' })
    await expect(page.getByTestId('member-onboarding-next').getByRole('button', { name: 'Renew membership →' })).toBeVisible()
  })

  test('receptionist without Payments sees the step but no billing action', async ({ page }) => {
    const checklist = await openProfile(page, {
      appRoles: ['RECEPTIONIST'],
      permissions: ['UsersAccess', 'MANAGE_MEMBERS'],
      summary: {},
    })

    const next = page.getByTestId('member-onboarding-next')
    await expect(next).toContainText('Staff with billing access can do this.')
    await expect(next.getByRole('button')).toHaveCount(0)
    await expect(checklist.getByRole('button', { name: /membership/i })).toHaveCount(0)
  })
})
