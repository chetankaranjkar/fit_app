import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Member portal home: next action, membership standing labels, assigned vs recorded,
 * empty / denied / retry. Session is seeded; /api is stubbed.
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
  return d.toISOString()
}

const DASHBOARD = {
  profile: { userId: 101, firstName: 'Riya', lastName: 'Sharma', fullName: 'Riya Sharma', email: 'riya@test.local', registrationDate: day(-90) },
  membership: {
    id: 9,
    planId: 1,
    planName: 'Quarterly',
    startDate: day(-20),
    endDate: day(70),
    status: 'ActivePendingPayment',
    daysRemaining: 70,
    isExpiringSoon: false,
  },
  attendance: { totalThisMonth: 1, totalThisWeek: 1, currentStreakDays: 1, last30Days: [{ date: day(0).slice(0, 10), visited: true }] },
  latestBodyMetric: null,
  upcomingSchedule: [],
  recentNotifications: [],
}

const PAY_SUMMARY = {
  onlinePaymentsEnabled: true,
  paymentNeed: 'settle_outstanding',
  message: 'Balance due',
  membershipPaymentId: 44,
  outstandingAmount: 3000,
  nextDueDate: day(3),
  planName: 'Quarterly',
  membershipStatus: 'ActivePendingPayment',
  membershipEndDate: day(70),
  latestAttempt: null,
}

const WORKOUT_PROGRAM = {
  programs: [
    {
      plan: { id: 12, planName: 'Strength block', workoutType: 'Strength', exerciseCount: 2 },
      scheduleSlots: [
        {
          scheduleId: 1,
          scheduleType: 'Personal',
          dayOfWeek: 1,
          startTime: '07:00:00',
          endTime: '08:00:00',
          trainerName: 'Coach Dev',
        },
      ],
      days: [
        { planDayId: 1, dayNumber: 1, name: 'Push', isRestDay: false, exercises: [{ planExerciseId: 1, exerciseId: 1, exerciseName: 'Bench', order: 1, targetSets: 3, targetReps: 8, restSeconds: 60 }] },
      ],
    },
  ],
}

async function signInAsMember(page: Page, fulfill: (pathname: string, route: Route) => boolean | Promise<boolean>) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const pathname = new URL(route.request().url()).pathname
      const handled = await fulfill(pathname, route)
      if (handled) return
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    },
  )

  const token = fakeJwt(['MEMBER'])
  const user = {
    token,
    username: 'riya@test.local',
    email: 'riya@test.local',
    fullName: 'Riya Sharma',
    userId: 101,
    appRoles: ['MEMBER'],
    permissions: [],
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
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

async function defaultMemberApis(pathname: string, route: Route) {
  const path = pathname.toLowerCase()
  if (path.includes('membership-billing/access')) {
    await json(route, { accessBlocked: false })
    return true
  }
  if (path.endsWith('/me/dashboard')) {
    await json(route, DASHBOARD)
    return true
  }
  if (path.includes('/me/payments/razorpay/summary')) {
    await json(route, PAY_SUMMARY)
    return true
  }
  if (path.includes('/me/workout-program')) {
    await json(route, WORKOUT_PROGRAM)
    return true
  }
  if (path.includes('/me/diet-plan')) {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    return true
  }
  if (path.includes('personal-workout-plans')) {
    await json(route, [])
    return true
  }
  if (path.includes('/auth/preferences')) {
    await json(route, { theme: 'dark' })
    return true
  }
  if (path.includes('/public/config')) {
    await json(route, { enableSelfSignup: false, enableOnlinePayments: true, checkoutBusinessName: 'Gym' })
    return true
  }
  return false
}

test.describe('Member portal @member-portal', () => {
  test('home shows pay-outstanding next action and standing labels', async ({ page }) => {
    await signInAsMember(page, async (pathname, route) => defaultMemberApis(pathname, route))
    await page.goto('/dashboard/member/portal', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('member-today-action')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('member-today-action')).toHaveAttribute('data-action-kind', 'pay')
    await expect(page.getByTestId('member-today-action').getByRole('heading')).toHaveText('Pay outstanding balance')
    await expect(page.getByText('Collect outstanding payment')).toHaveCount(0)

    const facts = page.getByTestId('member-standing-facts')
    await expect(facts.getByText('Access allowed')).toBeVisible()
    await expect(facts.getByText('Unpaid')).toBeVisible()
    await expect(facts.getByText(/₹|Rs|INR|3,000|3000/)).toBeVisible()
  })

  test('home labels assigned workouts vs recorded check-ins', async ({ page }) => {
    await signInAsMember(page, async (pathname, route) => defaultMemberApis(pathname, route))
    await page.goto('/dashboard/member/portal', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Assigned workout times' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Assigned · Personal')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recorded check-ins' })).toBeVisible()
    await expect(page.getByText(/not a recorded miss/i)).toBeVisible()
    await expect(page.getByTestId('member-empty-assigned-diet')).toBeVisible()
  })

  test('workouts empty and diet empty use assigned copy', async ({ page }) => {
    await signInAsMember(page, async (pathname, route) => {
      if (pathname.toLowerCase().includes('/me/workout-program')) {
        await json(route, { programs: [] })
        return true
      }
      return defaultMemberApis(pathname, route)
    })
    await page.goto('/dashboard/member/workouts', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('member-empty-state')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('No assigned workout program')).toBeVisible()

    await page.goto('/dashboard/member/diet', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('member-empty-state')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('No diet plan assigned yet')).toBeVisible()
  })

  test('denied workout program shows access denied without leaking data', async ({ page }) => {
    await signInAsMember(page, async (pathname, route) => {
      if (pathname.toLowerCase().includes('/me/workout-program')) {
        await json(route, { message: 'Forbidden', programs: [{ plan: { planName: 'Other member plan' } }] }, 403)
        return true
      }
      return defaultMemberApis(pathname, route)
    })
    await page.goto('/dashboard/member/workouts', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('member-denied-state')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Other member plan')).toHaveCount(0)
    await expect(page.getByTestId('member-retry')).toHaveCount(0)
  })

  test('home dashboard error offers retry', async ({ page }) => {
    let failDashboard = true
    await signInAsMember(page, async (pathname, route) => {
      if (pathname.toLowerCase().endsWith('/me/dashboard')) {
        if (failDashboard) {
          await json(route, { message: 'Unavailable' }, 500)
          return true
        }
        await json(route, DASHBOARD)
        return true
      }
      return defaultMemberApis(pathname, route)
    })
    await page.goto('/dashboard/member/portal', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('member-error-state')).toBeVisible({ timeout: 20_000 })
    failDashboard = false
    await page.getByTestId('member-retry').click()
    await expect(page.getByTestId('member-today-action')).toBeVisible({ timeout: 20_000 })
  })
})
