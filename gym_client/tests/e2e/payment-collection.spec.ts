import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Collect membership payment page (`/dashboard/payments/collect`). Billing endpoints are stubbed
 * with an in-memory bill so totals change after each recorded installment; every other /api call
 * returns 404.
 */

const MEMBER_ID = 501
const MEMBERSHIP_ID = 77
const PAYMENT_ID = 9001
const FEE = 3000

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

function isoInDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

type Installment = { amount: number; method: string; referenceNumber?: string; nextDueDate?: string }

type StubOptions = {
  /** Status codes to answer POST /installments with, in order; afterwards requests succeed. */
  failures?: { status: number; body: object }[]
  duplicate?: boolean
  postDelayMs?: number
}

async function stubBilling(page: Page, opts: StubOptions = {}) {
  const posts: Installment[] = []
  let duplicateChecks = 0
  const failures = [...(opts.failures ?? [])]
  const transactions: {
    id: number
    receiptNumber: string
    transactionAmount: number
    transactionMethod: string
    status: string
    referenceNumber?: string
    transactionDate: string
  }[] = []

  const paid = () => transactions.reduce((sum, t) => sum + t.transactionAmount, 0)
  const pending = () => Math.max(0, FEE - paid())
  const billingStatus = () => (pending() <= 0.02 ? 'Paid' : paid() > 0 ? 'Partial' : 'Pending')
  const membershipStatus = () => (pending() <= 0.02 ? 'Active' : paid() > 0 ? 'PartialPayment' : 'ActivePendingPayment')

  const detail = () => ({
    id: PAYMENT_ID,
    paymentNumber: 'MP-0001',
    userId: MEMBER_ID,
    membershipId: MEMBERSHIP_ID,
    totalAmount: FEE,
    originalAmount: FEE,
    finalBillAmount: FEE,
    netPayableAmount: FEE,
    paidAmount: paid(),
    pendingAmount: pending(),
    discountAmount: 0,
    waiverAmount: 0,
    couponDiscountAmount: 0,
    couponLocked: false,
    isFullyPaid: billingStatus() === 'Paid',
    isPartiallyPaid: billingStatus() === 'Partial',
    paymentStatus: billingStatus(),
    membershipStatus: membershipStatus(),
    planName: 'Quarterly',
    transactions: [...transactions].reverse(),
    timeline: [],
  })

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => json(route, {}, 404),
  )
  await page.route(
    (url) => url.pathname.toLowerCase().startsWith('/api/membership-payments/') || url.pathname.toLowerCase().startsWith('/api/usermemberships/'),
    async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname.toLowerCase()
      const method = route.request().method()

      if (path === `/api/membership-payments/by-membership/${MEMBERSHIP_ID}`) return json(route, detail())
      if (path === `/api/membership-payments/financial-summary/by-membership/${MEMBERSHIP_ID}`) {
        return json(route, {
          userId: MEMBER_ID,
          memberName: 'Riya Sharma',
          memberCode: 'M-00501',
          planName: 'Quarterly',
          membershipFee: FEE,
          couponDiscount: 0,
          approvedWaiveOff: 0,
          netPayableAmount: FEE,
          totalPaid: paid(),
          outstandingBalance: pending(),
        })
      }
      if (path === `/api/usermemberships/${MEMBERSHIP_ID}`) {
        return json(route, {
          id: MEMBERSHIP_ID,
          userId: MEMBER_ID,
          planId: 3,
          startDate: '2026-10-01',
          endDate: '2026-12-31',
          status: membershipStatus(),
          userName: 'Riya Sharma',
          planName: 'Quarterly',
          memberPhone: '9876543210',
          membershipPaymentId: PAYMENT_ID,
          pendingAmount: pending(),
          paymentStatus: billingStatus(),
        })
      }
      if (path === `/api/membership-payments/${PAYMENT_ID}/check-duplicate`) {
        duplicateChecks += 1
        return json(
          route,
          opts.duplicate
            ? { isDuplicate: true, message: 'Similar payment detected. Please verify before continuing.', existingTransactionId: 1 }
            : { isDuplicate: false },
        )
      }
      if (path === `/api/membership-payments/${PAYMENT_ID}/installments` && method === 'POST') {
        const body = route.request().postDataJSON() as Installment
        posts.push(body)
        if (opts.postDelayMs) await new Promise((r) => setTimeout(r, opts.postDelayMs))
        const failure = failures.shift()
        if (failure) return json(route, failure.body, failure.status)
        const id = 100 + transactions.length
        transactions.push({
          id,
          receiptNumber: `RCP-${id}`,
          transactionAmount: body.amount,
          transactionMethod: body.method,
          status: 'Completed',
          referenceNumber: body.referenceNumber,
          transactionDate: new Date().toISOString(),
        })
        return json(route, detail())
      }
      if (path === '/api/membership-payments/transactions') {
        return json(
          route,
          transactions.map((t) => ({
            ...t,
            paymentId: PAYMENT_ID,
            userId: MEMBER_ID,
            memberName: 'Riya Sharma',
            planName: 'Quarterly',
            pendingAmount: pending(),
            receiveEmailNotifications: true,
            receiveSmsNotifications: false,
          })),
        )
      }
      if (path === '/api/membership-payments/receipt-branding') return json(route, { gymName: 'Test Gym' })
      return json(route, {}, 404)
    },
  )

  return {
    posts,
    duplicateChecks: () => duplicateChecks,
  }
}

async function openCollect(page: Page) {
  const token = fakeJwt(['ADMIN'])
  const user = {
    token,
    username: 'staff@test.local',
    email: 'staff@test.local',
    fullName: 'Staff Test',
    userId: 101,
    appRoles: ['ADMIN'],
    permissions: [
      { id: 1, code: 'UsersAccess' },
      { id: 2, code: 'Payments' },
      { id: 3, code: 'CREATE_MEMBER' },
    ],
  }
  await page.addInitScript(
    ({ token, user }) => {
      if (sessionStorage.getItem('collect-seeded')) return
      sessionStorage.setItem('collect-seeded', '1')
      localStorage.clear()
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user },
  )
  await page.goto(
    `/dashboard/payments/collect?membershipId=${MEMBERSHIP_ID}&userId=${MEMBER_ID}&returnTo=${encodeURIComponent(`/dashboard/users/${MEMBER_ID}`)}`,
  )
  await expect(page.getByRole('heading', { name: 'Record payment' })).toBeVisible({ timeout: 30_000 })
}

const methodSelect = (page: Page) => page.locator('select', { has: page.locator('option[value="BankTransfer"]') })
const review = (page: Page) => page.getByTestId('payment-review')

test.describe('Collect membership payment @payments', () => {
  test('full payment: review shows member, period, balance; receipt opens and totals refresh', async ({ page }) => {
    const api = await stubBilling(page)
    await openCollect(page)

    await page.getByRole('button', { name: 'Full amount' }).click()
    await methodSelect(page).selectOption('Cash')
    await page.getByLabel('Reference / txn id').fill('CASH-1')
    await expect(page.getByTestId('collect-balance-after')).toHaveText('₹0.00')
    await page.getByRole('button', { name: 'Review & pay' }).click()

    const dialog = review(page)
    await expect(dialog.getByTestId('review-member-name')).toHaveText('Riya Sharma')
    await expect(dialog).toContainText('M-00501')
    await expect(dialog).toContainText('9876543210')
    await expect(dialog).toContainText('Plan: Quarterly')
    await expect(dialog.getByTestId('review-period')).toContainText('2026')
    await expect(dialog.getByTestId('review-outstanding')).toHaveText('₹3,000.00')
    await expect(dialog.getByTestId('review-amount')).toHaveText('₹3,000.00')
    await expect(dialog.getByTestId('review-balance-after')).toHaveText('₹0.00')
    await expect(dialog.getByTestId('review-method')).toContainText('Cash')
    await expect(dialog.getByTestId('review-method')).toContainText('Ref: CASH-1')
    await expect(dialog.getByTestId('review-kind')).toContainText('Full payment')
    await expect(dialog.getByTestId('review-next-due')).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Confirm payment' }).click()

    const receipt = page.getByRole('dialog', { name: 'Payment receipt' })
    await expect(receipt).toBeVisible()
    await expect(receipt).toContainText('#RCP-100')
    await expect(receipt).toContainText('₹3,000.00')
    await expect(receipt.getByRole('button', { name: 'Email receipt' })).toBeVisible()
    expect(api.posts).toHaveLength(1)
    expect(api.posts[0]).toMatchObject({ amount: 3000, method: 'Cash', referenceNumber: 'CASH-1' })
    expect(api.posts[0].nextDueDate).toBeUndefined()

    await receipt.getByRole('button', { name: 'Close', exact: true }).last().click()
    const collected = page.getByTestId('payment-collected')
    await expect(collected).toContainText('Full payment recorded')
    await expect(collected.getByTestId('collected-receipt-number')).toHaveText('RCP-100')
    await expect(collected.getByTestId('collected-balance')).toHaveText('₹0.00')
    // Bill reloads after success: nothing left to collect.
    await expect(page.getByTestId('collect-blocked')).toContainText('Nothing outstanding')

    await collected.getByRole('button', { name: 'View receipt' }).click()
    await expect(receipt).toContainText('#RCP-100')
    await receipt.getByRole('button', { name: 'Close', exact: true }).last().click()

    await collected.getByRole('button', { name: 'Done' }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/users/${MEMBER_ID}$`))
  })

  test('partial payment requires a next due date and shows the resulting balance', async ({ page }) => {
    const api = await stubBilling(page)
    await openCollect(page)

    await page.getByLabel('Amount (₹)').fill('1000')
    await expect(page.getByTestId('collect-balance-after')).toHaveText('₹2,000.00')
    await page.getByRole('button', { name: 'Review & pay' }).click()
    await expect(page.getByTestId('collect-form-error')).toHaveText('Next due date is required for partial payments.')
    await expect(review(page)).toHaveCount(0)

    const nextDue = isoInDays(14)
    await page.getByLabel('Next due date (required for partial)').fill(nextDue)
    await page.getByRole('button', { name: 'Review & pay' }).click()

    const dialog = review(page)
    await expect(dialog.getByTestId('review-outstanding')).toHaveText('₹3,000.00')
    await expect(dialog.getByTestId('review-amount')).toHaveText('₹1,000.00')
    await expect(dialog.getByTestId('review-balance-after')).toHaveText('₹2,000.00')
    await expect(dialog.getByTestId('review-kind')).toHaveText('Partial installment')
    await expect(dialog.getByTestId('review-next-due')).not.toHaveText('Required for partial payments')
    await dialog.getByRole('button', { name: 'Confirm payment' }).click()

    const receipt = page.getByRole('dialog', { name: 'Payment receipt' })
    await expect(receipt).toContainText('₹2,000.00')
    expect(api.posts).toHaveLength(1)
    expect(api.posts[0].amount).toBe(1000)
    expect(api.posts[0].nextDueDate?.slice(0, 10)).toBe(nextDue)
    await receipt.getByRole('button', { name: 'Close', exact: true }).last().click()

    await expect(page.getByTestId('payment-collected')).toContainText('Partial payment recorded')
    await expect(page.getByTestId('collected-balance')).toHaveText('₹2,000.00')
    // The form stays for the next installment and is reset, with the refreshed outstanding balance.
    await expect(page.getByLabel('Amount (₹)')).toHaveValue('')
    await page.getByRole('button', { name: 'Full amount' }).click()
    await expect(page.getByLabel('Amount (₹)')).toHaveValue('2000')
  })

  test('confirming twice in quick succession records a single payment', async ({ page }) => {
    const api = await stubBilling(page, { postDelayMs: 800 })
    await openCollect(page)

    await page.getByRole('button', { name: 'Full amount' }).click()
    await page.getByRole('button', { name: 'Review & pay' }).click()
    const confirm = review(page).getByRole('button', { name: 'Confirm payment' })
    await confirm.evaluate((el: HTMLButtonElement) => {
      el.click()
      el.click()
    })
    await expect(review(page).getByRole('button', { name: 'Processing…' })).toBeDisabled()
    await expect(page.getByRole('dialog', { name: 'Payment receipt' })).toBeVisible()
    expect(api.posts).toHaveLength(1)
  })

  test('duplicate warning must be acknowledged before confirming', async ({ page }) => {
    const api = await stubBilling(page, { duplicate: true })
    await openCollect(page)

    await page.getByRole('button', { name: 'Full amount' }).click()
    await page.getByRole('button', { name: 'Review & pay' }).click()

    const dialog = review(page)
    await expect(dialog.getByTestId('review-duplicate-warning')).toContainText('Similar payment detected')
    const confirm = dialog.getByRole('button', { name: 'Confirm payment' })
    await expect(confirm).toBeDisabled()
    await dialog.getByTestId('duplicate-ack').check()
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(page.getByRole('dialog', { name: 'Payment receipt' })).toBeVisible()
    expect(api.posts).toHaveLength(1)
  })

  test('API failure keeps the review open and the entered values, then retry succeeds', async ({ page }) => {
    const api = await stubBilling(page, {
      failures: [{ status: 400, body: { message: 'Payment amount cannot exceed outstanding balance.' } }],
    })
    await openCollect(page)

    const nextDue = isoInDays(10)
    await page.getByLabel('Amount (₹)').fill('1000')
    await methodSelect(page).selectOption('BankTransfer')
    await page.getByLabel('Reference / txn id').fill('NEFT-42')
    await page.getByLabel('Next due date (required for partial)').fill(nextDue)
    await page.getByRole('button', { name: 'Review & pay' }).click()
    const checksBefore = api.duplicateChecks()

    const dialog = review(page)
    await dialog.getByRole('button', { name: 'Confirm payment' }).click()
    await expect(dialog.getByTestId('payment-submit-error')).toHaveText('Payment amount cannot exceed outstanding balance.')
    await expect(dialog.getByTestId('review-amount')).toHaveText('₹1,000.00')
    await expect(dialog.getByTestId('review-method')).toContainText('Bank transfer')
    await expect(dialog.getByTestId('review-method')).toContainText('Ref: NEFT-42')
    await expect.poll(() => api.duplicateChecks()).toBeGreaterThan(checksBefore)

    await dialog.getByRole('button', { name: 'Back to edit' }).click()
    await expect(review(page)).toHaveCount(0)
    await expect(page.getByLabel('Amount (₹)')).toHaveValue('1000')
    await expect(methodSelect(page)).toHaveValue('BankTransfer')
    await expect(page.getByLabel('Reference / txn id')).toHaveValue('NEFT-42')
    await expect(page.getByLabel('Next due date (required for partial)')).toHaveValue(nextDue)

    await page.getByRole('button', { name: 'Review & pay' }).click()
    await review(page).getByRole('button', { name: 'Confirm payment' }).click()
    await expect(page.getByRole('dialog', { name: 'Payment receipt' })).toBeVisible()
    expect(api.posts).toHaveLength(2)
    expect(api.posts[1]).toMatchObject({ amount: 1000, method: 'BankTransfer', referenceNumber: 'NEFT-42' })
  })
})

test.describe('Payment handoff @payment-handoff', () => {
  test('finishes directly from the saved receipt', async ({ page }, testInfo) => {
    const api = await stubBilling(page)
    await openCollect(page)
    await page.getByRole('button', { name: 'Full amount' }).click()
    await page.getByRole('button', { name: 'Review & pay' }).click()
    await review(page).getByRole('button', { name: 'Confirm payment' }).click()
    const receipt = page.getByRole('dialog', { name: 'Payment receipt' })
    await expect(receipt).toContainText('RCP-100')
    await page.screenshot({ path: testInfo.outputPath('receipt-finish.png'), animations: 'disabled' })
    await receipt.getByRole('button', { name: 'Finish & open member' }).click()
    await expect(page).toHaveURL(/\/dashboard\/users\/501$/)
    expect(api.posts).toHaveLength(1)
  })

  test('missing billing selection has a way back instead of a loading screen', async ({ page }) => {
    await stubBilling(page)
    await openCollect(page)
    await page.goto('/dashboard/payments/collect')
    await expect(page.getByRole('heading', { name: 'Could not open membership billing' })).toBeVisible()
    await page.getByRole('button', { name: 'Back to memberships' }).click()
    await expect(page).toHaveURL(/\/dashboard\/user-memberships$/)
  })

  test('billing load failure provides retry and recovery', async ({ page }) => {
    await stubBilling(page)
    await openCollect(page)
    let unavailable = true
    await page.route(`**/api/membership-payments/by-membership/${MEMBERSHIP_ID}`, async (route) => {
      if (unavailable) return route.fulfill({ status: 503, json: { message: 'Billing unavailable' } })
      return route.fallback()
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Could not open membership billing' })).toBeVisible({ timeout: 20_000 })
    unavailable = false
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Record payment' })).toBeVisible()
  })

  test('payments hub opens the same installment receipt after collection', async ({ page }) => {
    const api = await stubBilling(page)
    await openCollect(page)
    await page.route('**/api/UserMemberships/paged?*', (route) => route.fulfill({ json: {
      items: [{ id: MEMBERSHIP_ID, userId: MEMBER_ID, planId: 3, userName: 'Riya Sharma', planName: 'Quarterly',
        startDate: '2026-10-01', endDate: '2026-12-31', status: 'ActivePendingPayment',
        pendingAmount: FEE, paymentStatus: 'Pending', membershipPaymentId: PAYMENT_ID }], totalCount: 1, page: 1, pageSize: 200,
    } }))
    await page.goto('/dashboard/payments')
    await page.getByRole('button', { name: '+ Add payment' }).click()
    const dialog = page.getByRole('dialog', { name: 'Record Payment', exact: true })
    await dialog.locator('select').first().selectOption(String(MEMBERSHIP_ID))
    await dialog.getByRole('button', { name: /Review payment/ }).click()
    await review(page).getByRole('button', { name: 'Confirm payment' }).click()
    const receipt = page.getByRole('dialog', { name: 'Payment receipt' })
    await expect(receipt).toContainText('RCP-100')
    await expect(receipt.getByRole('button', { name: 'Email receipt' })).toBeVisible()
    await receipt.getByRole('button', { name: 'Finish & open member' }).click()
    await expect(page).toHaveURL(/mode=view&tab=billing$/)
    expect(api.posts).toHaveLength(1)
  })
})

test.describe('New member billing @new-member-billing', () => {
  for (const collectNow of [true, false]) {
    test(`creates a member and ${collectNow ? 'continues to collection' : 'defers collection'}`, async ({ page }, testInfo) => {
      const api = await stubBilling(page)
      await openCollect(page)
      await page.route('**/api/MembershipPlans', (route) => route.fulfill({ json: [{ id: 3, planName: 'Quarterly', price: FEE, durationDays: 90 }] }))
      await page.route('**/api/Users/check-mobile?*', (route) => route.fulfill({ json: { isAvailable: true } }))
      await page.route('**/api/Users/check-username?*', (route) => route.fulfill({ json: { isAvailable: true } }))
      const membersCreated: unknown[] = []
      await page.route('**/api/Users', (route) => {
        membersCreated.push(route.request().postDataJSON())
        return route.fulfill({ json: { id: MEMBER_ID, pendingPaymentCollection: {
          userId: MEMBER_ID, membershipId: MEMBERSHIP_ID, membershipPaymentId: PAYMENT_ID,
        } } })
      })
      await page.getByRole('button', { name: 'New Member', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Add user' })
      await dialog.getByLabel('First name', { exact: true }).fill('Riya')
      await dialog.getByLabel('Last name', { exact: true }).fill('Sharma')
      await dialog.getByLabel('Email (login)', { exact: true }).fill('newmember@test.local')
      await dialog.getByLabel('Phone', { exact: true }).fill('9876543210')
      await dialog.getByLabel('Password', { exact: true }).fill('Test-member-123')
      await dialog.getByLabel('Preferred gym shift').selectOption('Morning')
      await dialog.getByLabel('Membership plan', { exact: true }).selectOption('3')
      await dialog.getByLabel('Membership start date', { exact: true }).fill(isoInDays(0))
      await expect(dialog.getByText('✓ Mobile number available')).toBeVisible()
      await expect(dialog.getByText('✓ Email available for login')).toBeVisible()
      await dialog.getByLabel('Continue to payment after creating this member').setChecked(collectNow)
      const createButton = dialog.getByRole('button', { name: collectNow ? 'Create member & continue to payment' : 'Create member', exact: true })
      await createButton.scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath('member-payment-choice.png'), animations: 'disabled' })
      await createButton.click()
      if (collectNow) await expect(page).toHaveURL(/\/payments\/collect\?membershipId=77&userId=501&returnTo=/)
      else await expect(page).toHaveURL(/\/dashboard\/users\/501$/)
      expect(membersCreated).toHaveLength(1)
      expect(api.posts).toEqual([])
    })
  }
})
