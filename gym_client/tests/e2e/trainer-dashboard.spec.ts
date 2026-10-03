import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Trainer dashboard "Today" section. Session is seeded in localStorage and every /api call is
 * stubbed, so this runs against the web client alone. Browser clock zone is pinned to UTC so
 * check-in times render deterministically.
 */

test.use({ timezoneId: 'UTC' })

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

const TODAY = {
  trainerId: 7,
  localDate: '2026-10-03',
  generatedAtUtc: '2026-10-03T12:00:00Z',
  missedLookbackDays: 7,
  activeClients: 4,
  configuredMaxActiveClients: null,
  effectiveCapacity: 30,
  clientsWithoutSchedule: 1,
  expectedToday: [
    {
      userId: 201,
      memberName: 'Asha Rao',
      scheduleLabel: 'Morning (6 AM – 10 AM)',
      windowStart: '06:00',
      windowEnd: '10:00',
      state: 'CheckedIn',
      checkInTimeUtc: '2026-10-03T07:12:00Z',
      checkInMethod: 'QR',
    },
    { userId: 202, memberName: 'Vikram Shah', windowStart: '07:00', windowEnd: '08:00', state: 'MissedInferred' },
    { userId: 203, memberName: 'Neha Iyer', windowStart: '18:00', windowEnd: '22:00', state: 'AwaitingCheckIn' },
  ],
  ptSessionsToday: [
    {
      sessionId: 502,
      userId: 201,
      memberName: 'Asha Rao',
      scheduledStartUtc: '2026-10-03T06:00:00Z',
      scheduledEndUtc: '2026-10-03T07:00:00Z',
      status: 'Completed',
      attendanceRecorded: true,
      memberPresent: true,
      isNoShow: false,
      isLate: false,
    },
    {
      sessionId: 501,
      userId: 202,
      memberName: 'Vikram Shah',
      scheduledStartUtc: '2026-10-03T09:00:00Z',
      scheduledEndUtc: '2026-10-03T10:00:00Z',
      status: 'Booked',
      attendanceRecorded: false,
    },
  ],
  recentInferredMisses: [
    { userId: 202, memberName: 'Vikram Shah', localDate: '2026-10-02' },
    { userId: 202, memberName: 'Vikram Shah', localDate: '2026-09-30' },
  ],
  recentPtNoShows: [
    {
      sessionId: 480,
      userId: 203,
      memberName: 'Neha Iyer',
      scheduledStartUtc: '2026-10-01T18:00:00Z',
      scheduledEndUtc: '2026-10-01T19:00:00Z',
      status: 'NoShow',
      attendanceRecorded: true,
      memberPresent: false,
      isNoShow: true,
    },
  ],
}

const MEMBER_WORKOUTS = [
  {
    sessionId: 900,
    memberId: 61,
    userId: 201,
    memberName: 'Asha Rao',
    planName: 'Push day',
    sessionDateUtc: '2026-10-02T08:00:00Z',
    status: 'Completed',
    completionPercent: 92,
  },
  {
    sessionId: 901,
    memberId: 62,
    userId: 203,
    memberName: 'Neha Iyer',
    planName: 'Legs',
    sessionDateUtc: '2026-10-03T11:30:00Z',
    status: 'InProgress',
    completionPercent: 40,
  },
]

type Stub = { status: number; body: unknown }

async function signInAsTrainer(page: Page, todayStub: Stub = { status: 200, body: TODAY }) {
  const apiCalls: string[] = []
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route: Route) => {
      const url = new URL(route.request().url())
      apiCalls.push(`${route.request().method()} ${url.pathname}${url.search}`)
      const json = (status: number, body: unknown) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

      if (url.pathname === '/api/trainers/me/today') return json(todayStub.status, todayStub.body)
      if (url.pathname === '/api/workout/trainer/members') return json(200, MEMBER_WORKOUTS)
      if (url.pathname === '/api/Users') return json(200, [])
      if (url.pathname === '/api/UserSchedules') return json(200, [])
      return json(404, {})
    },
  )

  const appRoles = ['TRAINER']
  const token = fakeJwt(appRoles)
  const user = {
    token,
    username: 'coach@test.local',
    email: 'coach@test.local',
    fullName: 'Coach Test',
    userId: 101,
    trainerId: 7,
    appRoles,
    permissions: [{ id: 1, code: 'TrainerAccess' }],
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
  return apiCalls
}

/** First visit can wait on a cold Vite compile. */
async function openDashboard(page: Page) {
  await page.goto('/dashboard')
  await expect(page.getByText('Coach workspace')).toBeVisible({ timeout: 20_000 })
}

test.describe('Trainer dashboard today @trainer', () => {
  test('separates recorded attendance from schedule-inferred states', async ({ page }) => {
    await signInAsTrainer(page)
    await openDashboard(page)

    const expected = page.getByTestId('trainer-expected-today')
    const asha = expected.locator('li', { hasText: 'Asha Rao' })
    await expect(asha.locator('[data-kind="recorded"]')).toHaveText('Checked in 07:12 · recorded')
    await expect(asha.locator('[data-kind="inferred"]')).toHaveCount(0)

    const vikram = expected.locator('li', { hasText: 'Vikram Shah' })
    await expect(vikram.locator('[data-kind="inferred"]')).toHaveText('Missed · inferred from schedule')
    await expect(vikram.locator('[data-kind="recorded"]')).toHaveCount(0)

    const neha = expected.locator('li', { hasText: 'Neha Iyer' })
    await expect(neha.locator('[data-kind="inferred"]')).toHaveText('No check-in yet · inferred from schedule')

    const pt = page.getByTestId('trainer-pt-today')
    await expect(pt.locator('li', { hasText: 'Asha Rao' }).locator('[data-kind="recorded"]')).toHaveText(
      'Attended · recorded',
    )
    await expect(pt.locator('li', { hasText: 'Vikram Shah' })).toContainText('Ended · attendance not marked')

    const inferred = page.getByTestId('trainer-inferred-misses')
    await expect(inferred.locator('[data-kind="inferred"]')).toHaveCount(1)
    await expect(inferred.locator('li', { hasText: 'Vikram Shah' })).toContainText('Missed (inferred)')

    const noShows = page.getByTestId('trainer-pt-noshows')
    await expect(noShows.locator('li', { hasText: 'Neha Iyer' }).locator('[data-kind="recorded"]')).toContainText(
      'No-show · recorded',
    )

    const capacity = page.getByTestId('trainer-capacity')
    await expect(capacity).toContainText('4 / 30')
    await expect(capacity).toContainText('Gym default')
  })

  test('action items and rows link to existing member, workout and PT screens', async ({ page }) => {
    await signInAsTrainer(page)
    await openDashboard(page)

    const actions = page.getByTestId('trainer-actions')
    await expect(actions.getByRole('link', { name: /Mark attendance for 1 ended PT session/ })).toHaveAttribute(
      'href',
      '/dashboard/personal-training/sessions',
    )
    await expect(
      actions.getByRole('link', { name: 'Follow up with Vikram Shah — no check-in by 08:00 (inferred)' }),
    ).toHaveAttribute('href', '/dashboard/users/202')
    await expect(actions.getByRole('link', { name: /Vikram Shah has 2 inferred misses in 7 days/ })).toHaveAttribute(
      'href',
      '/dashboard/users/202',
    )
    await expect(actions.getByRole('link', { name: /Review 1 completed workout/ })).toHaveAttribute(
      'href',
      '/dashboard/training/workouts-to-review?returnTo=%2Fdashboard',
    )

    const expected = page.getByTestId('trainer-expected-today')
    await expect(expected.getByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/dashboard/users/201')
    await expect(
      expected.locator('li', { hasText: 'Asha Rao' }).getByRole('link', { name: 'Workouts' }),
    ).toHaveAttribute('href', '/dashboard/training/member-workouts/201?returnTo=%2Fdashboard')

    const review = page.getByTestId('trainer-review-queue')
    await expect(review.getByRole('link', { name: 'Asha Rao' })).toHaveAttribute(
      'href',
      /^\/dashboard\/training\/member-workouts\/201\?/,
    )
    await expect(review.getByRole('link', { name: 'Neha Iyer' })).toHaveCount(0)

    await expect(
      page.getByTestId('trainer-pt-today').locator('li', { hasText: 'Vikram Shah' }).getByRole('link', { name: 'Session' }),
    ).toHaveAttribute('href', '/dashboard/personal-training/sessions')

    await expected.getByRole('link', { name: 'Vikram Shah' }).click()
    await expect(page).toHaveURL(/\/dashboard\/users\/202$/)
  })

  test('only calls caller-scoped endpoints', async ({ page }) => {
    const apiCalls = await signInAsTrainer(page)
    await openDashboard(page)
    await expect(page.getByTestId('trainer-expected-today')).toContainText('Asha Rao')

    expect(apiCalls).toContainEqual(expect.stringMatching(/^GET \/api\/trainers\/me\/today\?utcOffsetMinutes=0&/))
    expect(apiCalls).toContain('GET /api/Users?assignedToCoachOnly=true')
    const unscoped = apiCalls.filter((call) =>
      /\/api\/(AttendanceLogs|Attendance\/|Trainers\/\d+|UserInstructors|pt\/sessions|pt\/dashboard|workout\/admin)/i.test(
        call,
      ),
    )
    expect(unscoped).toEqual([])
  })

  test('shows the API error when no trainer profile is linked', async ({ page }) => {
    await signInAsTrainer(page, {
      status: 404,
      body: { message: 'No trainer profile is linked to your account.' },
    })
    await openDashboard(page)
    await expect(page.getByRole('alert')).toContainText('No trainer profile is linked to your account')
  })
})
