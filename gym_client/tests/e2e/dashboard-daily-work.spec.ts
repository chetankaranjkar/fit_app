import { expect, test, type Page } from '@playwright/test'

/**
 * Dashboard "Today's work" list per persona. Sessions are seeded in localStorage and every /api call is
 * stubbed, so this runs against the web client alone. Dates are relative to the machine's local day.
 */

type PersonaSession = {
  appRoles: string[]
  permissions: string[]
}

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

function localDay(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function localNoonIso(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

const expiringQueue = {
  items: [
    {
      id: 11,
      userId: 201,
      planId: 1,
      startDate: `${localDay(-33)}T00:00:00`,
      endDate: `${localDay(-3)}T00:00:00`,
      status: 'Expired',
      userName: 'Asha Expired',
      planName: 'Monthly',
      daysRemaining: -3,
      isExpired: true,
      membershipPaymentId: 901,
      pendingAmount: 0,
      paymentStatus: 'Paid',
      isFullyPaid: true,
    },
    {
      id: 12,
      userId: 202,
      planId: 1,
      startDate: `${localDay(-28)}T00:00:00`,
      endDate: `${localDay(2)}T00:00:00`,
      status: 'PartialPayment',
      userName: 'Ben Ending',
      planName: 'Monthly',
      daysRemaining: 2,
      isExpired: false,
      membershipPaymentId: 902,
      pendingAmount: 500,
      paymentStatus: 'Partial',
      isFullyPaid: false,
    },
  ],
  totalCount: 2,
  page: 1,
  pageSize: 12,
}

const needsPayment = {
  items: [
    {
      id: 21,
      userId: 203,
      planId: 2,
      startDate: `${localDay(-40)}T00:00:00`,
      endDate: `${localDay(50)}T00:00:00`,
      status: 'PartialPayment',
      userName: 'Chen Overdue',
      planName: 'Quarterly',
      pendingAmount: 1500,
      paymentStatus: 'Overdue',
      isFullyPaid: false,
      nextDueDate: `${localDay(-5)}T00:00:00`,
    },
    {
      id: 22,
      userId: 204,
      planId: 2,
      startDate: `${localDay(-10)}T00:00:00`,
      endDate: `${localDay(80)}T00:00:00`,
      status: 'ActivePendingPayment',
      userName: 'Dia DueSoon',
      planName: 'Quarterly',
      pendingAmount: 800,
      paymentStatus: 'Pending',
      isFullyPaid: false,
      nextDueDate: `${localDay(3)}T00:00:00`,
    },
    {
      id: 23,
      userId: 205,
      planId: 2,
      startDate: `${localDay(-5)}T00:00:00`,
      endDate: `${localDay(85)}T00:00:00`,
      status: 'ActivePendingPayment',
      userName: 'Far Future',
      planName: 'Quarterly',
      pendingAmount: 900,
      paymentStatus: 'Pending',
      isFullyPaid: false,
      nextDueDate: `${localDay(30)}T00:00:00`,
    },
    {
      id: 12,
      userId: 202,
      planId: 1,
      startDate: `${localDay(-28)}T00:00:00`,
      endDate: `${localDay(2)}T00:00:00`,
      status: 'PartialPayment',
      userName: 'Ben Ending',
      planName: 'Monthly',
      pendingAmount: 500,
      paymentStatus: 'Partial',
      isFullyPaid: false,
      nextDueDate: `${localDay(1)}T00:00:00`,
    },
  ],
  totalCount: 4,
  page: 1,
  pageSize: 100,
}

const leads = [
  { id: 31, fullName: 'Lead Late', status: 'FOLLOWUP', nextFollowUpAt: localNoonIso(-2), createdDate: localNoonIso(-9) },
  { id: 32, fullName: 'Lead Today', status: 'NEW', nextFollowUpAt: localNoonIso(0), createdDate: localNoonIso(-1) },
  { id: 33, fullName: 'Lead Converted', status: 'CONVERTED', nextFollowUpAt: localNoonIso(-1), createdDate: localNoonIso(-20) },
  { id: 34, fullName: 'Lead Later', status: 'CONTACTED', nextFollowUpAt: localNoonIso(20), createdDate: localNoonIso(-3) },
]

const membershipRequests = [
  {
    id: 41,
    membershipId: 77,
    memberId: 206,
    memberName: 'Eve Void',
    requestType: 'Void',
    status: 'Pending',
    reason: 'Duplicate',
    requestedByUserId: 9,
    requestedByName: 'Desk',
    requestedDate: localNoonIso(-1),
  },
]

const waiveOffs = [
  {
    id: 51,
    userId: 207,
    memberName: 'Faye Waive',
    membershipPaymentId: 905,
    membershipFee: 3000,
    couponDiscount: 0,
    approvedWaiveOffTotal: 0,
    requestedAmount: 300,
    reason: 'Loyalty',
    status: 'Pending',
    requestedDate: localNoonIso(0),
  },
]

const SOURCE_PATHS = {
  renewals: '/api/usermemberships/expiring-queue',
  payments: '/api/usermemberships/paged',
  leads: '/api/leads',
  approvals: '/api/membership-requests',
  waiveOffs: '/api/waive-off-requests',
} as const

async function signInAs(page: Page, session: PersonaSession) {
  const requested: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.pathname.startsWith('/api/')) requested.push(url.pathname.toLowerCase())
  })

  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => {
      const path = new URL(route.request().url()).pathname.toLowerCase()
      if (path === SOURCE_PATHS.renewals) return route.fulfill({ json: expiringQueue })
      if (path === SOURCE_PATHS.payments) return route.fulfill({ json: needsPayment })
      if (path === SOURCE_PATHS.leads) return route.fulfill({ json: leads })
      if (path === SOURCE_PATHS.approvals) return route.fulfill({ json: membershipRequests })
      if (path === SOURCE_PATHS.waiveOffs) return route.fulfill({ json: waiveOffs })
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    },
  )

  const token = fakeJwt(session.appRoles)
  const user = {
    token,
    username: 'persona@test.local',
    email: 'persona@test.local',
    fullName: 'Persona Test',
    userId: 101,
    appRoles: session.appRoles,
    permissions: session.permissions.map((code, i) => ({ id: i + 1, code })),
  }
  await page.addInitScript(
    ({ token, user }) => {
      if (sessionStorage.getItem('persona-seeded')) return
      sessionStorage.setItem('persona-seeded', '1')
      localStorage.clear()
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user },
  )
  return requested
}

async function itemKeys(page: Page) {
  const list = page.getByTestId('daily-work-list')
  await expect(list).toBeVisible()
  return list.getByTestId('daily-work-item').evaluateAll((els) => els.map((el) => el.getAttribute('data-key')))
}

function item(page: Page, key: string) {
  return page.locator(`[data-testid="daily-work-item"][data-key="${key}"]`)
}

const FRONT_DESK_ITEM_PREFIXES = ['/dashboard/payments/collect', '/dashboard/users/', '/dashboard/reception']

async function expectFrontDeskSafeLinks(page: Page) {
  const hrefs = await page
    .getByTestId('daily-work-list')
    .locator('a[href]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))
  expect(hrefs.length).toBeGreaterThan(0)
  for (const href of hrefs) {
    expect(FRONT_DESK_ITEM_PREFIXES.some((p) => href.startsWith(p)), href).toBe(true)
  }
}

test.describe('Dashboard daily work list @daily-work', () => {
  test('admin layout switches trends, expands renewals, and fits both themes and mobile', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await signInAs(page, {
      appRoles: ['ADMIN'],
      permissions: ['Reports', 'Config', 'Payments', 'UsersAccess', 'TrainerAccess', 'CreateUsers', 'LEADS_CRM'],
    })
    await page.route('**/api/Dashboard/summary', (route) => route.fulfill({ json: {
      activeMembers: 248, todayAttendance: 64, newMembersToday: 3,
      expiringMembershipsNext14Days: 12, todayRevenue: 18500,
    } }))
    await page.route('**/api/Reports/summary?*', (route) => route.fulfill({ json: {
      totalRevenue: 186000, churnCount: 2, churnRatePercent: 0.8,
      revenueTrend: [1, 2, 3, 4, 5].map((day) => ({ date: localDay(day - 5), amount: day * 3000 })),
      attendanceTrend: [1, 2, 3, 4, 5].map((day) => ({ date: localDay(day - 5), count: day * 12 })),
    } }))
    await page.route('**/api/membership-payments/dashboard-summary', (route) => route.fulfill({ json: {
      totalPendingAmount: 24500, pendingPaymentsCount: 14, overdueMembersCount: 4,
      todayCollections: 18500, upcomingDueCount: 6, partialMembersCount: 3,
    } }))
    await page.route('**/api/Auth/preferences', (route) => route.fulfill({ json: {
      theme: route.request().method() === 'PUT' ? route.request().postDataJSON().theme : 'dark',
    } }))
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Business trends' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Peak hours' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Attendance', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Attendance', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Revenue', exact: true }).click()
    const renewals = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Renewal queue' }) })
    await expect(renewals).not.toHaveAttribute('open')
    await renewals.locator('summary').click()
    await expect(page.getByRole('searchbox', { name: 'Search renewal queue' })).toBeVisible()
    await renewals.locator('summary').click()
    await expect(page.getByRole('searchbox', { name: 'Search renewal queue' })).toHaveCount(0)
    const screenshot = async (name: string) => {
      await page.locator('#dashboard-main').evaluate((element) => { element.scrollTop = 0 })
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' })
    }
    await screenshot('desktop-dark')
    await page.getByRole('button', { name: /Switch to light mode/i }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await screenshot('desktop-light')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('heading', { name: 'Your gym, today' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const memberName = item(page, 'payment-21').getByRole('link', { name: 'Chen Overdue' })
    expect(await memberName.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await screenshot('mobile-light')
  })

  test('admin sees every source, overdue before upcoming, sorted by urgency', async ({ page }) => {
    const requested = await signInAs(page, {
      appRoles: ['ADMIN'],
      permissions: ['Reports', 'Config', 'Payments', 'UsersAccess', 'LEADS_CRM', 'APPROVE_WAIVE_OFF'],
    })
    await page.goto('/dashboard')

    await expect(item(page, 'waive-off-51')).toBeVisible()
    expect(await itemKeys(page)).toEqual([
      'payment-21',
      'renewal-11',
      'lead-31',
      'approval-41',
      'waive-off-51',
      'lead-32',
      'renewal-12',
      'payment-22',
    ])

    const overdue = page.getByTestId('daily-work-group-overdue')
    await expect(overdue.getByRole('heading')).toHaveText('Overdue (5)')
    await expect(page.getByTestId('daily-work-group-upcoming').getByRole('heading')).toHaveText('Upcoming (3)')
    await expect(overdue.locator('[data-bucket="upcoming"]')).toHaveCount(0)

    await expect(item(page, 'payment-21').getByTestId('daily-work-badge')).toHaveText('5 days overdue')
    await expect(item(page, 'renewal-11').getByTestId('daily-work-badge')).toHaveText('Expired 3 days ago')
    await expect(item(page, 'lead-31').getByTestId('daily-work-badge')).toHaveText('2 days overdue')
    await expect(item(page, 'approval-41').getByTestId('daily-work-badge')).toHaveText('Waiting 1 day')
    await expect(item(page, 'lead-32').getByTestId('daily-work-badge')).toHaveText('Due today')
    await expect(item(page, 'renewal-12').getByTestId('daily-work-badge')).toHaveText('Ends in 2 days')
    await expect(item(page, 'payment-22').getByTestId('daily-work-badge')).toHaveText('Due in 3 days')

    await expect(item(page, 'payment-21').getByRole('link', { name: 'Collect outstanding payment' })).toHaveAttribute(
      'href',
      /^\/dashboard\/payments\/collect\?membershipId=21&userId=203&returnTo=%2Fdashboard$/,
    )
    await expect(item(page, 'renewal-11').getByRole('button', { name: 'Renew membership' })).toBeVisible()
    await expect(item(page, 'renewal-11').getByRole('link', { name: 'Collect outstanding payment' })).toHaveCount(0)
    await expect(item(page, 'renewal-12').getByRole('link', { name: 'Collect outstanding payment' })).toHaveAttribute(
      'href',
      /membershipId=12&userId=202/,
    )
    await expect(item(page, 'renewal-11').getByRole('link', { name: 'Asha Expired' })).toHaveAttribute(
      'href',
      '/dashboard/users/201',
    )
    await expect(item(page, 'lead-31').getByRole('link', { name: 'Open lead' })).toHaveAttribute(
      'href',
      '/dashboard/reception?lead=31',
    )
    await expect(item(page, 'approval-41').getByRole('link', { name: 'Review request' })).toHaveAttribute(
      'href',
      '/dashboard/payments/membership-approvals',
    )
    await expect(item(page, 'waive-off-51').getByRole('link', { name: 'Review waive-off' })).toHaveAttribute(
      'href',
      '/dashboard/payments/waive-offs',
    )

    await page.getByRole('button', { name: /^Upcoming · 3$/ }).click()
    expect(await itemKeys(page)).toEqual(['lead-32', 'renewal-12', 'payment-22'])

    expect(requested.filter((p) => p === SOURCE_PATHS.renewals).length).toBe(1)
    for (const path of Object.values(SOURCE_PATHS)) expect(requested).toContain(path)
  })

  test('admin without waive-off approval does not query or list waive-offs', async ({ page }) => {
    const requested = await signInAs(page, {
      appRoles: ['ADMIN'],
      permissions: ['Reports', 'Config', 'Payments', 'UsersAccess', 'LEADS_CRM'],
    })
    await page.goto('/dashboard')
    await expect(item(page, 'approval-41')).toBeVisible()
    await expect(item(page, 'waive-off-51')).toHaveCount(0)
    expect(requested).not.toContain(SOURCE_PATHS.waiveOffs)
  })

  test('staff with Payments and LEADS_CRM gets billing and leads, no approvals, front-desk links only', async ({
    page,
  }) => {
    const requested = await signInAs(page, {
      appRoles: ['STAFF'],
      permissions: ['UsersAccess', 'Payments', 'LEADS_CRM'],
    })
    await page.goto('/dashboard')

    await expect(item(page, 'payment-22')).toBeVisible()
    expect(await itemKeys(page)).toEqual(['payment-21', 'renewal-11', 'lead-31', 'lead-32', 'renewal-12', 'payment-22'])
    expect(requested).not.toContain(SOURCE_PATHS.approvals)
    expect(requested).not.toContain(SOURCE_PATHS.waiveOffs)
    await expectFrontDeskSafeLinks(page)

    await item(page, 'lead-31').getByRole('link', { name: 'Open lead' }).click()
    await expect(page).toHaveURL(/\/dashboard\/reception$/)
  })

  test('receptionist without Payments sees only lead follow-ups and never queries billing', async ({ page }) => {
    const requested = await signInAs(page, { appRoles: ['RECEPTIONIST'], permissions: ['UsersAccess', 'LEADS_CRM'] })
    await page.goto('/dashboard')

    await expect(item(page, 'lead-32')).toBeVisible()
    expect(await itemKeys(page)).toEqual(['lead-31', 'lead-32'])
    await expect(page.locator('[data-kind="payment"], [data-kind="renewal"]')).toHaveCount(0)
    for (const path of [SOURCE_PATHS.renewals, SOURCE_PATHS.payments, SOURCE_PATHS.approvals, SOURCE_PATHS.waiveOffs]) {
      expect(requested).not.toContain(path)
    }
    expect(requested.some((p) => p.startsWith('/api/membership-payments'))).toBe(false)
    await expectFrontDeskSafeLinks(page)
  })

  test('receptionist with neither Payments nor leads has no work list and no source queries', async ({ page }) => {
    const requested = await signInAs(page, { appRoles: ['RECEPTIONIST'], permissions: ['UsersAccess'] })
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Front desk' })).toBeVisible()
    await expect(page.getByTestId('daily-work-list')).toHaveCount(0)
    for (const path of Object.values(SOURCE_PATHS)) expect(requested).not.toContain(path)
  })

  test('accountant gets billing items only and no lead queries', async ({ page }) => {
    const requested = await signInAs(page, { appRoles: ['ACCOUNTANT'], permissions: ['Payments'] })
    await page.goto('/dashboard')

    await expect(item(page, 'payment-22')).toBeVisible()
    expect(await itemKeys(page)).toEqual(['payment-21', 'renewal-11', 'renewal-12', 'payment-22'])
    expect(requested).not.toContain(SOURCE_PATHS.leads)
    expect(requested).not.toContain(SOURCE_PATHS.approvals)
    await expectFrontDeskSafeLinks(page)
  })

  test('trainer dashboard does not render the work list', async ({ page }) => {
    const requested = await signInAs(page, { appRoles: ['TRAINER'], permissions: ['TrainerAccess'] })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('daily-work-list')).toHaveCount(0)
    for (const path of Object.values(SOURCE_PATHS)) expect(requested).not.toContain(path)
  })
})
