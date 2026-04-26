import { expect, request, test } from '@playwright/test'

type LoginPayload = { token: string }
type UserPayload = { id: number; firstName?: string; lastName?: string }
type BodyPartPayload = { id: number; name: string }
type ExercisePayload = { id: number; name: string }

const adminUsername = process.env.E2E_ADMIN_USERNAME ?? 'admin@gym.com'
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'admin123'
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:5104/api'
const authRetryTimeoutMs = 45_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, timeoutMs: number, stepMs = 1500): Promise<T> {
  const start = Date.now()
  let lastError: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      await sleep(stepMs)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Retry timed out')
}

function loginIdentifiers() {
  const ids = [adminUsername, 'admin', 'admin@gym.com'].filter(Boolean)
  return Array.from(new Set(ids))
}

async function loginViaUi(page: import('@playwright/test').Page) {
  await withRetry(async () => {
    await page.goto('/login')
    let loggedIn = false
    for (const loginId of loginIdentifiers()) {
      await page.getByLabel('Username or email').fill(loginId)
      await page.getByLabel('Password').fill(adminPassword)
      await page.getByRole('button', { name: 'Sign in' }).click()
      try {
        await expect(page).toHaveURL(/\/dashboard$/, { timeout: 8000 })
        loggedIn = true
        break
      } catch {
        await page.goto('/login')
      }
    }
    if (!loggedIn) {
      throw new Error('Unable to login with configured and seeded admin credentials')
    }
  }, authRetryTimeoutMs)
}

async function getAuthToken() {
  return withRetry(async () => {
    const api = await request.newContext({ baseURL: apiBaseUrl })
    try {
      for (const loginId of loginIdentifiers()) {
        const login = await api.post('/Auth/login', {
          data: { username: loginId, password: adminPassword },
        })
        if (!login.ok()) continue
        const payload = (await login.json()) as LoginPayload
        if (payload?.token) return payload.token
      }
      throw new Error('Unable to fetch auth token for seeded admin user')
    } finally {
      await api.dispose()
    }
  }, authRetryTimeoutMs)
}

async function createMemberFixture(token: string, seed: string) {
  const api = await request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  })
  const firstName = `E2E${seed}`
  const lastName = 'Member'
  const userRes = await api.post('/Users', {
    data: {
      firstName,
      lastName,
      email: `e2e-member-${seed}@example.com`,
      phone: `998${seed.slice(-7)}`,
      dateOfBirth: '1995-01-01',
      gender: 'Male',
      isActive: true,
      address: 'Regression suite street',
    },
  })
  expect(userRes.ok()).toBeTruthy()
  const user = (await userRes.json()) as UserPayload
  await api.dispose()
  return { userId: user.id, fullName: `${firstName} ${lastName}` }
}

async function ensureBodyPart(token: string, seed: string) {
  const api = await request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  })

  const listRes = await api.get('/BodyParts')
  expect(listRes.ok()).toBeTruthy()
  const bodyParts = (await listRes.json()) as BodyPartPayload[]
  if (bodyParts.length > 0) {
    await api.dispose()
    return bodyParts[0]
  }

  const createRes = await api.post('/BodyParts', {
    data: {
      name: `E2E Body Part ${seed}`,
      description: 'Regression test body part',
    },
  })
  expect(createRes.ok()).toBeTruthy()
  const created = (await createRes.json()) as BodyPartPayload
  await api.dispose()
  return created
}

async function createExerciseFixture(token: string, seed: string, bodyPartId: number) {
  const api = await request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  })
  const exerciseName = `E2E API Exercise ${seed}`
  const createRes = await api.post('/Exercises', {
    data: {
      name: exerciseName,
      description: 'Regression fixture exercise',
      steps: '1. Start\n2. Finish',
      videoUrl: null,
      difficultyLevel: 'Beginner',
      equipmentRequired: 'Dumbbell',
      bodyPartId,
      exerciseSteps: [
        { stepNumber: 1, description: 'Start position', imageUrl: null },
        { stepNumber: 2, description: 'Return slowly', imageUrl: null },
      ],
    },
  })
  expect(createRes.ok()).toBeTruthy()
  const exercise = (await createRes.json()) as ExercisePayload
  await api.dispose()
  return exercise
}

test.describe('Training and attendance regression', () => {
  test('exercises CRUD works @regression', async ({ page }) => {
    const seed = Date.now().toString()
    const exerciseName = `E2E Exercise ${seed}`
    const updatedEquipment = `Cable ${seed}`

    await loginViaUi(page)
    await page.goto('/dashboard/training/exercises')

    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByLabel('Exercise name').fill(exerciseName)
    await page.locator('select').filter({ hasText: 'Select body part' }).first().selectOption({ index: 1 })
    await page.getByLabel('Equipment').fill('Dumbbells')
    await page.getByRole('button', { name: 'Create exercise' }).click()

    const row = page.locator('tr', { hasText: exerciseName })
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Equipment').fill(updatedEquipment)
    await page.getByRole('button', { name: 'Update exercise' }).click()
    await expect(page.locator('tr', { hasText: `${exerciseName} ${updatedEquipment}` })).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await row.getByRole('button', { name: 'Delete' }).click()
    await expect(page.locator('tr', { hasText: exerciseName })).toHaveCount(0)
  })

  test('workout plans and assignment history flow works @regression', async ({ page }) => {
    const seed = Date.now().toString()
    const token = await getAuthToken()
    const { userId, fullName } = await createMemberFixture(token, seed)
    const bodyPart = await ensureBodyPart(token, seed)
    const exercise = await createExerciseFixture(token, seed, bodyPart.id)
    const planName = `E2E Plan ${seed}`
    const updatedPlanName = `E2E Plan Updated ${seed}`

    await loginViaUi(page)
    await page.goto('/dashboard/training/workout-plans')

    await page.getByRole('button', { name: '+ New plan' }).click()
    await page.getByLabel('Plan name').fill(planName)
    await page.getByLabel('Duration (minutes)').fill('40')
    await page.locator('label:has-text("Exercise") + select').first().selectOption(String(exercise.id))
    await page.getByRole('button', { name: 'Create plan' }).click()
    await expect(page.locator('tr', { hasText: planName })).toBeVisible()

    const planRow = page.locator('tr', { hasText: planName })
    await planRow.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Plan name').fill(updatedPlanName)
    await page.getByRole('button', { name: 'Update plan' }).click()
    await expect(page.locator('tr', { hasText: updatedPlanName })).toBeVisible()

    await page.goto('/dashboard/training/workout-assignments')
    await page.getByRole('button', { name: '+ Assign plan' }).click()
    await page.locator('label:has-text("Member") + select').selectOption(String(userId))
    await page.locator('label:has-text("Workout plan") + select').selectOption({ label: updatedPlanName })
    await page.getByRole('button', { name: 'Assign' }).click()
    await expect(page.locator('tr', { hasText: `${fullName} ${updatedPlanName}` })).toBeVisible()

    // Assign again to create history + active records for same member.
    await page.getByRole('button', { name: '+ Assign plan' }).click()
    await page.locator('label:has-text("Member") + select').selectOption(String(userId))
    await page.locator('label:has-text("Workout plan") + select').selectOption({ label: updatedPlanName })
    await page.locator('label:has-text("Day") + select').selectOption('2')
    await page.getByRole('button', { name: 'Assign' }).click()

    const memberRows = page.locator('tr', { hasText: fullName })
    await expect(memberRows).toHaveCount(2)
    await expect(memberRows.filter({ hasText: 'Active' })).toHaveCount(1)
    await expect(memberRows.filter({ hasText: 'History' })).toHaveCount(1)
  })

  test('attendance check-in and check-out flow works @regression', async ({ page }) => {
    const seed = Date.now().toString()
    const token = await getAuthToken()
    const { fullName } = await createMemberFixture(token, seed)

    await loginViaUi(page)
    await page.goto('/dashboard/attendance')

    await page.getByRole('button', { name: '+ Check in member' }).click()
    await page.locator('label:has-text("Member") + select').selectOption({ label: fullName })
    await page.getByLabel('Method').fill('FrontDesk')
    await page.getByRole('button', { name: 'Check in' }).click()

    const activeRow = page.locator('tr', { hasText: fullName }).first()
    await expect(activeRow).toBeVisible()
    await expect(activeRow.getByText('Checked in')).toBeVisible()

    await activeRow.getByRole('button', { name: 'Check out' }).click()
    await page.getByRole('button', { name: 'Check out' }).last().click()

    await page
      .locator('select')
      .filter({ has: page.locator('option[value="checked-out"]') })
      .first()
      .selectOption('checked-out')
    await expect(page.locator('tr', { hasText: fullName })).toBeVisible()

    // Member name opens attendance history modal.
    await page.getByRole('button', { name: fullName }).first().click()
    await expect(page.getByRole('heading', { name: /Attendance history/i })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })
})
