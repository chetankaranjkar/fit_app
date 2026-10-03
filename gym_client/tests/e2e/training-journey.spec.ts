import { expect, test, type Page } from '@playwright/test'

/**
 * Plan → Assign → Monitor → Review nav, catalog secondary placement, empty-state next
 * actions, and exercise-library recovery. Session is seeded; /api is stubbed.
 */

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

const ADMIN_PERMISSIONS = [
  'Reports',
  'Config',
  'Payments',
  'UsersAccess',
  'TrainerAccess',
  'VIEW_ATTENDANCE',
  'MANAGE_PT_PACKAGES',
  'LEADS_CRM',
  'VIEW_WORKOUT_PLAN_AUDIT',
]

async function signInAs(
  page: Page,
  session: { appRoles: string[]; permissions: string[] },
  fulfillApi?: (pathname: string) => { status: number; body: string; contentType?: string } | null,
) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => {
      const pathname = new URL(route.request().url()).pathname
      const custom = fulfillApi?.(pathname)
      if (custom) {
        return route.fulfill({
          status: custom.status,
          contentType: custom.contentType ?? 'application/json',
          body: custom.body,
        })
      }
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
}

test.describe('Training journey @training-journey', () => {
  test('admin training nav is Plan → Assign → Monitor → Review then catalog', async ({ page }) => {
    await signInAs(page, { appRoles: ['ADMIN'], permissions: ADMIN_PERMISSIONS })
    await page.goto('/dashboard/profile', { waitUntil: 'domcontentloaded' })
    const nav = page.locator('aside nav')
    await expect(nav).toBeVisible({ timeout: 20_000 })
    await nav.getByRole('button', { name: 'Training', exact: true }).click()

    const labels = await nav.evaluate((el) => {
      const trainingBtn = [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Training')
      const group = trainingBtn?.parentElement
      if (!group) return []
      return [...group.querySelectorAll('a, p')]
        .map((n) => n.textContent?.trim() ?? '')
        .filter(Boolean)
    })
    expect(labels.slice(0, 5)).toEqual(['Plans', 'Assign', 'Monitor', 'Review', 'Catalog & audit'])
    expect(labels).toContain('Exercises')
    expect(labels).toContain('Workout Plan Audit')
  })

  test('trainer training nav has journey then catalog, without gym-wide Monitor', async ({ page }) => {
    await signInAs(page, { appRoles: ['TRAINER'], permissions: ['TrainerAccess'] })
    await page.goto('/dashboard/profile', { waitUntil: 'domcontentloaded' })
    const nav = page.locator('aside nav')
    await expect(nav).toBeVisible({ timeout: 20_000 })
    await nav.getByRole('button', { name: 'Training', exact: true }).click()
    await expect(nav.getByRole('link', { name: 'Plans', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/training/programs',
    )
    await expect(nav.getByRole('link', { name: 'Assign', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Review', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/training/workouts-to-review',
    )
    await expect(nav.getByRole('link', { name: 'Monitor', exact: true })).toHaveCount(0)
    await expect(nav.getByText('Catalog & audit')).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Exercises' })).toBeVisible()
  })

  test('plans empty state offers create a plan', async ({ page }) => {
    await signInAs(page, { appRoles: ['ADMIN'], permissions: ADMIN_PERMISSIONS }, (pathname) => {
      if (pathname.endsWith('/Programs') || pathname.endsWith('/WorkoutPlans')) {
        return { status: 200, body: '[]' }
      }
      return null
    })
    await page.goto('/dashboard/training/programs', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('training-journey-nav')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('training-empty-state')).toContainText('No workout plans yet')
    await expect(page.getByRole('link', { name: 'Create a plan' })).toHaveAttribute(
      'href',
      '/dashboard/training/programs/new',
    )
  })

  test('assign empty state offers create a plan when the library is empty', async ({ page }) => {
    await signInAs(page, { appRoles: ['ADMIN'], permissions: ADMIN_PERMISSIONS }, (pathname) => {
      if (pathname.includes('/UserSchedules')) return { status: 200, body: '[]' }
      if (pathname.endsWith('/Programs') || pathname.endsWith('/WorkoutPlans')) {
        return { status: 200, body: '[]' }
      }
      if (pathname.endsWith('/Users') || pathname.endsWith('/Trainers')) {
        return { status: 200, body: '[]' }
      }
      return null
    })
    await page.goto('/dashboard/training/workout-assignments', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('training-empty-state')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Create a plan' })).toHaveAttribute(
      'href',
      '/dashboard/training/programs/new',
    )
  })

  test('wizard keeps plan name when the exercise library is unavailable and retry restores it', async ({
    page,
  }) => {
    let exercisesDown = true
    await signInAs(page, { appRoles: ['ADMIN'], permissions: ADMIN_PERMISSIONS }, (pathname) => {
      if (pathname.toLowerCase().includes('workout-categories') || pathname.includes('/WorkoutCategories')) {
        return { status: 200, body: JSON.stringify([{ id: 1, name: 'Strength', isActive: true }]) }
      }
      if (pathname.includes('/Exercises/paged')) {
        if (exercisesDown) {
          return { status: 503, body: JSON.stringify({ title: 'Exercise service unavailable' }) }
        }
        return {
          status: 200,
          body: JSON.stringify({
            items: [{ id: 9, name: 'Barbell squat', bodyPartName: 'Legs' }],
            totalCount: 1,
            page: 1,
            pageSize: 200,
          }),
        }
      }
      if (pathname.toLowerCase().includes('/warmups') || pathname.toLowerCase().includes('/stretches')) {
        return { status: 200, body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 100 }) }
      }
      return null
    })

    await page.goto('/dashboard/training/programs/new', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('training-journey-nav')).toBeVisible({ timeout: 20_000 })
    await page.getByPlaceholder('e.g. 90 Day Muscle Builder').fill('Keep this name')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('exercise-library-unavailable')).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByPlaceholder('e.g. 90 Day Muscle Builder')).toHaveValue('Keep this name')
    await page.getByRole('button', { name: 'Continue' }).click()
    exercisesDown = false
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByTestId('exercise-library-unavailable')).toHaveCount(0)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByPlaceholder('e.g. 90 Day Muscle Builder')).toHaveValue('Keep this name')
  })
})
