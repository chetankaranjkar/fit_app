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
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 247, 250)')
    await expect(page.getByRole('heading', { name: 'Riya Sharma' })).toHaveCSS('color', 'rgb(23, 32, 51)')
    await page.getByRole('button', { name: 'Progress', exact: true }).click()
    await expect(root).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'New Member', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Add user' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(dialog.getByRole('heading', { name: 'Add user', exact: true })).toHaveCSS('color', 'rgb(23, 32, 51)')
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 247, 250)')
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

test.describe('Unified member billing @member-billing', () => {
  test('legacy history links open one tab with membership periods and transaction receipts', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await openProfile(page, { ...ADMIN, summary: {} })
    await page.route('**/api/UserMemberships/by-user/501', (route) => route.fulfill({ json: [{
      id: 77, userId: 501, planId: 1, planName: 'Monthly',
      startDate: '2026-08-01T00:00:00', endDate: '2026-09-01T00:00:00',
      status: 'Expired', paymentStatus: 'Paid', pendingAmount: 0, isFullyPaid: true,
    }] }))
    await page.route('**/api/membership-payments/by-user/501', (route) => route.fulfill({ json: [{
      id: 91, membershipId: 77, userId: 501, planName: 'Monthly', paymentNumber: 'PAY-91',
      totalAmount: 2000, originalAmount: 2000, netPayableAmount: 2000,
      discountAmount: 0, waiverAmount: 0, couponDiscountAmount: 0,
      paidAmount: 2000, pendingAmount: 0, paymentStatus: 'Paid',
      transactions: [{ id: 92, transactionDate: '2026-08-01T12:00:00Z',
        transactionAmount: 2000, transactionMethod: 'Cash', receiptNumber: 'REC-92', status: 'Completed' }],
    }] }))
    await page.route('**/api/membership-payments/member-ledger/501', (route) => route.fulfill({ json: { periods: [] } }))
    await page.route('**/api/membership-payments/financial-summary/by-membership/77', (route) => route.fulfill({ json: {
      membershipFee: 2000, couponDiscount: 0, approvedWaiveOff: 0,
      netPayableAmount: 2000, totalPaid: 2000, outstandingBalance: 0, isOverdue: false,
    } }))
    await page.route('**/api/membership-audit?*', (route) => route.fulfill({ json: [] }))
    for (const alias of ['payment-history', 'membership-history', 'membership', 'payments', 'billing']) {
      await page.goto(`/dashboard/users/501?mode=view&tab=${alias}`)
      const billingTab = page.getByRole('button', { name: 'Membership & Payments', exact: true })
      await expect(billingTab).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('button', { name: /^(Payment History|Membership History)$/ })).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Memberships & access' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Payments & receipts' })).toBeVisible()
    }
    const billing = page.getByTestId('member-billing-history')
    await expect(billing.locator('[data-membership-row="77"]')).toContainText('Expired')
    await expect(billing.getByRole('row').filter({ hasText: 'PAY-91' })).toContainText('Paid')
    await billing.getByRole('button', { name: 'Show timeline', exact: true }).click()
    await expect(billing.getByText(/REC-92/)).toBeVisible()
    await page.getByRole('button', { name: 'Details', exact: true }).click()
    await page.getByRole('button', { name: 'Membership & Payments', exact: true }).click()
    await expect(page).toHaveURL(/mode=view&tab=billing$/)
    await billing.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('unified-billing.png'), animations: 'disabled' })
  })

  test('accounts without Payments do not fetch transaction data', async ({ page }) => {
    const billingRequests: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.toLowerCase().startsWith('/api/membership-payments/')) billingRequests.push(request.url())
    })
    await openProfile(page, { appRoles: ['RECEPTIONIST'], permissions: ['UsersAccess'], summary: {} })
    await page.goto('/dashboard/users/501?mode=view&tab=payment-history')
    await expect(page.getByRole('heading', { name: 'Memberships & access' })).toBeVisible()
    await expect(page.getByText('You need Payments permission to view membership billing history.')).toBeVisible()
    expect(billingRequests).toEqual([])
  })
})

test.describe('Neutral light profile @light-profile', () => {
  test('separates white content from the canvas and keeps dark styling available', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 })
    await openProfile(page, {
      ...ADMIN, theme: 'light',
      summary: { currentMembershipId: 77, currentMembershipStatus: 'ActivePendingPayment',
        currentMembershipPlanName: 'Monthly', hasOpenBalance: true, openMembershipId: 77 },
    })
    await page.route('**/api/membership-payments/by-user/501', (route) => route.fulfill({ json: [{
      id: 91, membershipId: 77, pendingAmount: 6899, transactions: [],
    }] }))
    await page.route('**/api/workout/users/501/history?*', (route) => route.fulfill({ json: {
      items: [], page: 1, pageSize: 20, totalCount: 0,
    } }))
    await page.goto('/dashboard/users/501?mode=view&tab=workout-history')
    const panel = page.getByTestId('member-workout-history')
    const tabs = page.locator('[data-member-tabs]')
    const activeTab = tabs.getByRole('button', { name: 'Workout History', exact: true })
    await expect(panel.getByText('No workouts recorded in this date range.')).toBeVisible()
    await expect(page.locator('.dashboard-shell')).toHaveCSS('background-color', 'rgb(245, 247, 250)')
    await expect(page.locator('[data-dashboard-decoration]')).toHaveCSS('display', 'none')
    await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.getByTestId('member-onboarding')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(activeTab).toHaveCSS('background-image', 'none')
    await expect(activeTab).toHaveCSS('border-bottom-color', 'rgb(37, 99, 235)')
    await expect(activeTab).toHaveCSS('color', 'rgb(29, 78, 216)')
    await expect(activeTab.locator('span').first()).toHaveCSS('color', 'rgb(29, 78, 216)')
    await expect(panel.getByLabel('From', { exact: true })).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(panel.getByLabel('From', { exact: true })).toHaveCSS('border-color', 'rgb(197, 206, 220)')
    await panel.getByLabel('About workout syncing').click()
    await expect(panel.getByText(/Offline logs stay on the phone until uploaded/)).toBeVisible()
    await panel.getByLabel('About workout syncing').click()
    await page.getByTestId('member-onboarding').scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('light-profile-desktop.png'), animations: 'disabled' })
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      await panel.getByRole('heading', { name: 'Workout history' }).scrollIntoViewIfNeeded()
      expect(await page.locator('#dashboard-main').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await expect(panel.getByLabel('Status')).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`light-profile-${width}.png`), animations: 'disabled' })
    }
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('[data-dashboard-decoration]')).not.toHaveCSS('display', 'none')
    await expect(activeTab).not.toHaveCSS('background-image', 'none')
  })
})
