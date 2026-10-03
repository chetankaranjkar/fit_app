import { expect, test, type Page } from '@playwright/test'

/**
 * Keyboard, landmarks, and narrow-viewport checks for shared shell + collect-payment review.
 * Sessions are seeded in localStorage; /api is stubbed so this runs against Vite alone.
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

async function signInAsAdmin(page: Page, seedKey: string) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  )
  const token = fakeJwt(['ADMIN'])
  const user = {
    token,
    username: 'a11y@test.local',
    email: 'a11y@test.local',
    fullName: 'A11y Test',
    userId: 101,
    appRoles: ['ADMIN'],
    permissions: [
      { id: 1, code: 'UsersAccess' },
      { id: 2, code: 'Payments' },
      { id: 3, code: 'Reports' },
      { id: 4, code: 'Config' },
    ],
  }
  await page.addInitScript(
    ({ token, user, seedKey }) => {
      if (sessionStorage.getItem(seedKey)) return
      sessionStorage.setItem(seedKey, '1')
      localStorage.clear()
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user, seedKey },
  )
}

async function stubCollectBilling(page: Page) {
  const json = (route: { fulfill: (r: { status: number; contentType: string; body: string }) => unknown }, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => json(route, {}, 404),
  )
  await page.route(
    (url) =>
      url.pathname.toLowerCase().startsWith('/api/membership-payments/') ||
      url.pathname.toLowerCase().startsWith('/api/usermemberships/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname.toLowerCase()
      if (path === `/api/membership-payments/by-membership/${MEMBERSHIP_ID}`) {
        return json(route, {
          id: PAYMENT_ID,
          paymentNumber: 'MP-0001',
          userId: MEMBER_ID,
          membershipId: MEMBERSHIP_ID,
          totalAmount: FEE,
          originalAmount: FEE,
          finalBillAmount: FEE,
          netPayableAmount: FEE,
          paidAmount: 0,
          pendingAmount: FEE,
          discountAmount: 0,
          waiverAmount: 0,
          couponDiscountAmount: 0,
          couponLocked: false,
          isFullyPaid: false,
          isPartiallyPaid: false,
          paymentStatus: 'Pending',
          membershipStatus: 'ActivePendingPayment',
          planName: 'Quarterly',
          transactions: [],
          timeline: [],
        })
      }
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
          totalPaid: 0,
          outstandingBalance: FEE,
        })
      }
      if (path === `/api/usermemberships/${MEMBERSHIP_ID}`) {
        return json(route, {
          id: MEMBERSHIP_ID,
          userId: MEMBER_ID,
          planId: 3,
          startDate: '2026-10-01',
          endDate: '2026-12-31',
          status: 'ActivePendingPayment',
          userName: 'Riya Sharma',
          planName: 'Quarterly',
          memberPhone: '9876543210',
        })
      }
      if (path.includes('/check-duplicate')) {
        return json(route, { isDuplicate: false, message: null })
      }
      return json(route, {}, 404)
    },
  )
}

async function openCollect(page: Page) {
  await signInAsAdmin(page, 'a11y-collect-seeded')
  await stubCollectBilling(page)
  await page.goto(
    `/dashboard/payments/collect?membershipId=${MEMBERSHIP_ID}&userId=${MEMBER_ID}&returnTo=${encodeURIComponent(`/dashboard/users/${MEMBER_ID}`)}`,
  )
  await expect(page.getByRole('heading', { name: 'Record payment' })).toBeVisible({ timeout: 30_000 })
}

test.describe('Shared accessibility @a11y @regression', () => {
  test('skip link and main landmark are available on the dashboard', async ({ page }) => {
    await signInAsAdmin(page, 'a11y-nav-seeded')
    await page.goto('/dashboard')
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible({ timeout: 30_000 })

    const skip = page.getByRole('link', { name: 'Skip to main content' })
    await skip.focus()
    await expect(skip).toBeVisible()
    await skip.press('Enter')
    await expect(page.locator('#dashboard-main')).toBeFocused()
  })

  test('collect payment review traps Tab, labels the dialog, and ESC returns focus', async ({ page }) => {
    await openCollect(page)

    await expect(page.getByLabel('Amount (₹)')).toBeVisible()
    await page.getByRole('button', { name: 'Full amount' }).click()
    const reviewPay = page.getByRole('button', { name: 'Review & pay' })
    await reviewPay.click()

    const dialog = page.getByRole('dialog', { name: 'Confirm payment' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('review-member-name')).toHaveText('Riya Sharma')
    await expect(dialog.getByRole('button', { name: 'Confirm payment' })).toBeVisible()

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() => {
        const active = document.activeElement
        return Boolean(active?.closest('[role="dialog"]'))
      })
      expect(inside).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(reviewPay).toBeFocused()
  })

  test('narrow viewport keeps open-nav and collect primary actions visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openCollect(page)

    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Review & pay' })).toBeVisible()
    await expect(page.getByLabel('Amount (₹)')).toBeVisible()

    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).last()).toBeVisible()
    await page.getByRole('button', { name: 'Close sidebar' }).click()
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()

    await page.getByRole('button', { name: 'Full amount' }).click()
    await page.getByRole('button', { name: 'Review & pay' }).click()
    const dialog = page.getByRole('dialog', { name: 'Confirm payment' })
    await expect(dialog.getByRole('button', { name: 'Confirm payment' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })
})
