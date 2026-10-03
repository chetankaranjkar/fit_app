import { expect, test, type Page } from '@playwright/test'

/**
 * Membership access, dates, payment status, and outstanding balance across the memberships page,
 * member directory, and collect-payment screen, one row per supported status. API responses are
 * stubbed; anything else returns 404.
 */

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

function day(offset: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  return `${d.toISOString().slice(0, 10)}T00:00:00`
}

type Row = {
  id: number
  name: string
  status: string
  start: number
  end: number
  pending: number
  paymentStatus: string | null
}

const ROWS: Row[] = [
  { id: 1, name: 'Asha Active', status: 'Active', start: -20, end: 40, pending: 0, paymentStatus: 'Paid' },
  { id: 2, name: 'Pavan Pending', status: 'ActivePendingPayment', start: -2, end: 88, pending: 3000, paymentStatus: 'Pending' },
  { id: 3, name: 'Priya Partial', status: 'PartialPayment', start: -10, end: 80, pending: 1500, paymentStatus: 'Partial' },
  { id: 4, name: 'Esha Expired', status: 'Expired', start: -95, end: -5, pending: 0, paymentStatus: 'Paid' },
  { id: 5, name: 'Omar Owing', status: 'Expired', start: -100, end: -10, pending: 2000, paymentStatus: 'Overdue' },
  { id: 6, name: 'Farah Frozen', status: 'Frozen', start: -30, end: 60, pending: 0, paymentStatus: 'Paid' },
  { id: 7, name: 'Chetan Cancelled', status: 'Cancelled', start: -40, end: 50, pending: 0, paymentStatus: 'Paid' },
  { id: 8, name: 'Vijay Voided', status: 'Voided', start: -15, end: 75, pending: 1200, paymentStatus: 'Pending' },
]

function membershipJson(r: Row) {
  return {
    id: r.id,
    userId: 500 + r.id,
    planId: 1,
    planName: 'Quarterly',
    userName: r.name,
    startDate: day(r.start),
    endDate: day(r.end),
    status: r.status,
    membershipPaymentId: 900 + r.id,
    pendingAmount: r.pending,
    paymentStatus: r.paymentStatus,
    isFullyPaid: r.pending <= 0.02,
    daysRemaining: r.end,
    isExpired: r.end < 0,
  }
}

function userJson(r: Row) {
  const [firstName, lastName] = r.name.split(' ')
  return {
    id: 500 + r.id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@test.local`,
    phone: '9876543210',
    isActive: true,
    role: 'User',
    membershipId: r.id,
    membershipStatus: r.status,
    membershipPlanName: 'Quarterly',
    membershipStartDate: day(r.start),
    membershipEndDate: day(r.end),
    membershipBillingStatus: r.paymentStatus,
    outstandingBalance: r.pending,
    pendingPaymentAmount: r.pending,
    openMembershipId: r.pending > 0 ? r.id : null,
    isPaymentOverdue: r.paymentStatus === 'Overdue',
  }
}

async function signIn(page: Page) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/usermemberships/paged',
    (route) => route.fulfill({ json: { items: ROWS.map(membershipJson), totalCount: ROWS.length, page: 1, pageSize: 25 } }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/users/paged',
    (route) => route.fulfill({ json: { items: ROWS.map(userJson), totalCount: ROWS.length, page: 1, pageSize: 25 } }),
  )
  await page.route(
    (url) => /^\/api\/usermemberships\/\d+$/i.test(url.pathname),
    (route) => {
      const id = Number(new URL(route.request().url()).pathname.split('/').pop())
      const row = ROWS.find((r) => r.id === id)
      return row ? route.fulfill({ json: membershipJson(row) }) : route.fulfill({ status: 404, json: {} })
    },
  )
  await page.route(
    (url) => /^\/api\/membership-payments\/by-membership\/\d+$/i.test(url.pathname),
    (route) => {
      const id = Number(new URL(route.request().url()).pathname.split('/').pop())
      const row = ROWS.find((r) => r.id === id)!
      return route.fulfill({
        json: {
          id: 900 + row.id,
          paymentNumber: `MP-${row.id}`,
          userId: 500 + row.id,
          membershipId: row.id,
          totalAmount: 6000,
          finalBillAmount: 6000,
          netPayableAmount: 6000,
          paidAmount: 6000 - row.pending,
          pendingAmount: row.pending,
          discountAmount: 0,
          waiverAmount: 0,
          paymentStatus: row.paymentStatus ?? 'Pending',
          membershipStatus: row.status,
          planName: 'Quarterly',
          transactions: [],
        },
      })
    },
  )

  const token = fakeJwt(['ADMIN'])
  const user = {
    token,
    username: 'admin@test.local',
    email: 'admin@test.local',
    fullName: 'Admin Test',
    userId: 101,
    appRoles: ['ADMIN'],
    permissions: ['UsersAccess', 'Payments', 'TrainerAccess', 'MANAGE_MEMBERS'].map((code, i) => ({ id: i + 1, code })),
  }
  await page.addInitScript(
    ({ token, user }) => {
      if (sessionStorage.getItem('standing-seeded')) return
      sessionStorage.setItem('standing-seeded', '1')
      localStorage.clear()
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user },
  )
}

type Expected = { access: string; payment: string; outstanding: RegExp; collect: boolean; renew: boolean }

const EXPECTED: Record<number, Expected> = {
  1: { access: 'Access allowed', payment: 'Paid in full', outstanding: /₹\s?0/, collect: false, renew: true },
  2: { access: 'Access allowed', payment: 'Unpaid', outstanding: /3,000/, collect: true, renew: false },
  3: { access: 'Access allowed', payment: 'Partially paid', outstanding: /1,500/, collect: true, renew: false },
  4: { access: 'No access', payment: 'Paid in full', outstanding: /₹\s?0/, collect: false, renew: true },
  5: { access: 'No access', payment: 'Overdue', outstanding: /2,000/, collect: true, renew: true },
  6: { access: 'No access', payment: 'Paid in full', outstanding: /₹\s?0/, collect: false, renew: true },
  7: { access: 'No access', payment: 'Billing closed', outstanding: /₹\s?0/, collect: false, renew: true },
  8: { access: 'No access', payment: 'Billing closed', outstanding: /1,200/, collect: false, renew: true },
}

test.describe('Membership standing @membership-standing', () => {
  test('memberships grid separates access, dates, payment, and outstanding for every status', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/user-memberships')
    await expect(page.getByRole('row').filter({ hasText: 'Asha Active' })).toBeVisible({ timeout: 30_000 })
    for (const r of ROWS) {
      const exp = EXPECTED[r.id]
      const row = page.getByRole('row').filter({ hasText: r.name })
      await expect(row, r.name).toContainText(exp.access)
      await expect(row, r.name).toContainText(exp.payment)
      await expect(row, r.name).toContainText(exp.outstanding)

      await row.locator('button[aria-haspopup="menu"]').click()
      const menu = page.getByRole('menuitem')
      const collect = menu.filter({ hasText: 'Collect outstanding payment' })
      const renew = menu.filter({ hasText: 'Renew membership' })
      if (exp.collect) await expect(collect, `${r.name} collect`).toBeEnabled()
      else await expect(collect, `${r.name} collect`).toBeDisabled()
      if (exp.renew) await expect(renew, `${r.name} renew`).toBeEnabled()
      else await expect(renew, `${r.name} renew`).toBeDisabled()
      await page.keyboard.press('Escape')
    }

    await page.getByRole('row').filter({ hasText: 'Pavan Pending' }).locator('button[aria-haspopup="menu"]').click()
    await expect(page.getByRole('menuitem').filter({ hasText: 'Renew membership' })).toContainText(
      'Collect the outstanding payment first',
    )
    await page.keyboard.press('Escape')
    await page.getByRole('row').filter({ hasText: 'Vijay Voided' }).locator('button[aria-haspopup="menu"]').click()
    await expect(page.getByRole('menuitem').filter({ hasText: 'Collect outstanding payment' })).toContainText(
      'Billing is closed for voided memberships.',
    )
  })

  test('detail drawer shows the next permitted action and explains blocked ones', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/user-memberships')
    await page.getByRole('button', { name: '#3', exact: true }).click({ timeout: 30_000 })

    const panel = page.getByTestId('membership-standing')
    await expect(panel.getByTestId('standing-access')).toContainText('Access allowed')
    await expect(panel.getByTestId('standing-payment')).toContainText('Partially paid')
    await expect(panel.getByTestId('standing-outstanding')).toContainText('1,500')
    await expect(panel.getByTestId('standing-next')).toHaveAttribute('data-kind', 'collect')
    await expect(panel.getByTestId('standing-collect')).toHaveAttribute('data-allowed', 'true')
    await expect(panel.getByTestId('standing-renew')).toHaveAttribute('data-allowed', 'false')
    await expect(panel.getByTestId('standing-renew')).toContainText('Collect the outstanding payment first')  })

  test('frozen membership points to unfreezing rather than payment', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/user-memberships')
    await page.getByRole('button', { name: '#6', exact: true }).click({ timeout: 30_000 })

    const panel = page.getByTestId('membership-standing')
    await expect(panel.getByTestId('standing-access')).toContainText('Membership is frozen.')
    await expect(panel.getByTestId('standing-next')).toHaveAttribute('data-kind', 'resolve')
    await expect(panel.getByTestId('standing-collect')).toContainText('Nothing is outstanding')
  })

  test('member directory lists membership, access, payment status, and outstanding as separate columns', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/users')
    await expect(page.getByRole('row').filter({ hasText: 'Asha' })).toBeVisible({ timeout: 30_000 })

    for (const r of ROWS) {
      const exp = EXPECTED[r.id]
      const row = page.getByRole('row').filter({ hasText: r.name.split(' ')[0] })
      await expect(row, r.name).toContainText(exp.access)
      await expect(row, r.name).toContainText(exp.payment)
    }
    const omar = page.getByRole('row').filter({ hasText: 'Omar' })
    await expect(omar.getByRole('button', { name: 'Collect outstanding payment' })).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Asha' }).getByRole('button', { name: 'Collect outstanding payment' })).toHaveCount(0)
  })

  test('billing screen blocks payments on a voided membership and offers renewal when nothing is owed', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/payments/collect?membershipId=8&userId=508')
    await expect(page.getByTestId('collect-blocked')).toContainText('Billing is closed for voided memberships.', { timeout: 30_000 })
    await expect(page.getByTestId('standing-payment')).toContainText('Billing closed')

    await page.goto('/dashboard/payments/collect?membershipId=1&userId=501')
    const blocked = page.getByTestId('collect-blocked')
    await expect(blocked).toContainText('Nothing outstanding', { timeout: 30_000 })
    await expect(blocked.getByRole('button', { name: 'Renew membership' })).toBeVisible()
    await expect(page.getByTestId('standing-access')).toContainText('Access allowed')
  })
})
