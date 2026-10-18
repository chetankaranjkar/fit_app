import { expect, test, type Page } from '@playwright/test'

const profile = '/dashboard/users/10011?mode=view'
const dietAssignment = { id: 1, userId: 10011, dietPlanId: 7, dietPlanName: 'Lean Fat Loss', startDate: '2026-10-16', isActive: true, notes: 'Avoid peanuts' }
const schedule = { id: 2, userId: 10011, workoutPlanId: 8, workoutPlanName: 'Strength foundation', isActive: true, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', scheduleType: 'FullBody', trainerName: 'Coach Riya', assignedAt: '2026-10-16' }
const exercise = { id: 10, exerciseName: 'Goblet squat', sets: 3, reps: 12, restBetweenSets: 60, order: 1, weight: 16, tempo: '3-1-1', intensity: 'Moderate', notes: 'Keep chest up', videoUrl: 'https://example.com/squat' }
const mobility = { id: 20, name: 'Arm circles', durationSeconds: 45, displayOrder: 1, description: 'Slow controlled circles', bodyPart: 'Shoulders' }
const sessionPlanName = 'The Barokar System — 20 Week Recomposition'
const reviewDetail = {
  session: {
    sessionId: 91, memberId: 1, planName: sessionPlanName, status: 'Completed',
    startTimeUtc: '2026-10-18T03:30:00Z', completionPercent: 100, completedSets: 3, totalSets: 3,
    exercises: [{ exerciseId: 1, exerciseName: 'Squats', sets: [5, 7, 10].map((weight, i) => ({
      id: i + 1, exerciseId: 1, exerciseName: 'Squats', setNumber: i + 1, targetReps: 12,
      actualReps: 12, actualWeight: weight, isCompleted: true, notes: i === 2 ? 'Controlled depth' : null,
    })) }],
  }, durationMinutes: 37, totalVolume: 5682, notes: 'Strong session with consistent technique',
}

async function setup(page: Page) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: '101', role: ['ADMIN'], exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
  await page.addInitScript(({ token }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({ token, userId: 101, username: 'staff@test.local', appRoles: ['ADMIN'], permissions: ['UsersAccess', 'TrainerAccess'].map((code, i) => ({ id: i + 1, code })) }))
  }, { token })
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.toLowerCase()
    if (path === '/api/auth/preferences') return route.fulfill({ json: { theme: 'dark' } })
    if (path === '/api/users/10011') return route.fulfill({ json: { id: 10011, firstName: 'Ayush', lastName: 'Gire', email: 'ayush@test.local', isActive: true } })
    if (path === '/api/users/10011/profile-summary') return route.fulfill({ json: { hasActiveMembership: true, hasDietAssignment: true, hasWorkoutAssignment: true } })
    if (path === '/api/userdietplans') return route.fulfill({ json: [dietAssignment] })
    if (path === '/api/userschedules/user/10011') return route.fulfill({ json: [schedule] })
    if (path === '/api/workout/users/10011/history') return route.fulfill({ json: {
      items: [{ sessionId: 91, planName: sessionPlanName, occurredAtUtc: '2026-10-18T03:30:00Z', status: 'Completed', durationMinutes: 37, completedSets: 3, totalSets: 3, totalVolume: 5682, volumeComplete: true }], totalCount: 1, page: 1, pageSize: 20,
    } })
    if (path === '/api/workout/session/91/detail') return route.fulfill({ json: reviewDetail })
    if (path === '/api/dietplans/7') return route.fulfill({ json: {
      id: 7, planName: 'Lean Fat Loss', goalType: 'Fat Loss', calories: 1800, proteinGrams: 140, carbsGrams: 160, fatsGrams: 60,
      description: 'Balanced nutrition for steady progress', isActive: true,
      dietMeals: [{ id: 1, mealName: 'Breakfast', mealOrder: 1, dietMealItems: [{ id: 1, foodName: 'Oats', quantity: '50 g', calories: 190, proteinGrams: 6, carbsGrams: 32, fatsGrams: 4 }] }],
    } })
    if (path === '/api/programs/8') return route.fulfill({ json: {
      id: 8, name: 'Strength foundation', description: 'Build strength safely', workoutType: 'Strength', duration: 60, difficultyLevel: 'Beginner',
      warmups: [mobility], stretches: [{ ...mobility, id: 21, name: 'Quad stretch' }], exercises: [],
      weeks: [{ id: 1, weekNumber: 1, name: 'Foundation', days: [
        { id: 1, dayNumber: 1, dayName: 'Full body', orderIndex: 1, exercises: [exercise], notes: 'Focus on technique' },
        { id: 2, dayNumber: 2, dayName: 'Recovery', orderIndex: 2, isRestDay: true, exercises: [] },
      ] }],
    } })
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto(profile)
}

test.describe('Profile assigned plan details @regression', () => {
  test.beforeEach(async ({ page }) => setup(page))

  test('workout history session review is polished, read-only, and returns in place', async ({ page }, testInfo) => {
    const historyPath = `${profile}&tab=workout-history`
    const writes: string[] = []
    page.on('request', (request) => { if (request.url().includes('/api/workout/') && request.method() !== 'GET') writes.push(request.url()) })
    await page.goto(historyPath)
    await page.getByRole('button', { name: 'View session' }).click()
    const dialog = page.getByRole('dialog', { name: 'Workout session review' })
    await expect(dialog.getByRole('heading', { name: sessionPlanName })).toBeVisible()
    await expect(dialog.getByText('5,682', { exact: true })).toBeVisible()
    await expect(dialog.getByText('37', { exact: true })).toBeVisible()
    await expect(dialog.getByText('12 reps @ 5 kg', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Controlled depth')).toBeAttached()
    await expect(dialog.locator('input, select, textarea, [contenteditable="true"]')).toHaveCount(0)
    for (const layout of [
      { name: 'desktop-dark', width: 1440, height: 1100, theme: 'dark' },
      { name: 'desktop-light', width: 1440, height: 1100, theme: 'light' },
      { name: 'mobile-dark', width: 390, height: 1000, theme: 'dark' },
    ]) {
      await page.setViewportSize({ width: layout.width, height: layout.height })
      await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), layout.theme)
      await dialog.locator('.session-review-hero').scrollIntoViewIfNeeded()
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await dialog.screenshot({ path: testInfo.outputPath(`session-${layout.name}.png`), animations: 'disabled' })
      await dialog.locator('.session-review-exercise').scrollIntoViewIfNeeded()
      await dialog.screenshot({ path: testInfo.outputPath(`session-sets-${layout.name}.png`), animations: 'disabled' })
    }
    await dialog.getByRole('button', { name: 'Back to history' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(historyPath)
    await expect(page.getByRole('button', { name: 'View session' })).toBeFocused()
    expect(writes).toEqual([])
  })

  test('session review retries errors and preserves pending and unavailable values', async ({ page }) => {
    let fail = true
    await page.route('**/api/workout/session/91/detail', (route) => fail
      ? route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } })
      : route.fulfill({ json: {
        ...reviewDetail, durationMinutes: null, totalVolume: null,
        session: { ...reviewDetail.session, status: 'Skipped', completionPercent: 0, completedSets: 0,
          exercises: [{ exerciseId: 1, exerciseName: 'Squats', sets: [{ id: 1, setNumber: 1, targetReps: 12, targetWeight: 0, actualReps: null, actualWeight: null, isCompleted: false }] }],
        },
      } }))
    await page.goto(`${profile}&tab=workout-history`)
    await page.getByRole('button', { name: 'View session' }).click()
    const dialog = page.getByRole('dialog', { name: 'Workout session review' })
    await expect(dialog.getByRole('alert')).toBeVisible()
    fail = false
    await dialog.getByRole('button', { name: 'Retry' }).click()
    await expect(dialog.getByText('Pending', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Unavailable', { exact: true })).toBeVisible()
    await expect(dialog.getByText('12 reps @ 0 kg', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(`${profile}&tab=workout-history`)
  })

  test('diet name opens complete read-only details and closes on the same profile', async ({ page }, testInfo) => {
    const writes: string[] = []
    page.on('request', (r) => { if (r.method() !== 'GET' && /\/api\/(Diet|UserDiet)/i.test(r.url())) writes.push(r.url()) })
    await page.getByRole('button', { name: 'Lean Fat Loss', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Diet plan details' })
    await expect(dialog.getByText('Balanced nutrition for steady progress')).toBeVisible()
    for (const text of ['Avoid peanuts', 'Daily nutrition targets', '1,800', 'Breakfast', 'Oats', '50 g', '190', '140']) await expect(dialog.getByText(text, { exact: true })).toBeVisible()
    await expect(dialog.locator('input, select, textarea, [contenteditable="true"]')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /save|edit|remove|assign/i })).toHaveCount(0)
    for (const layout of [
      { name: 'desktop-dark', width: 1440, height: 1100, theme: 'dark' },
      { name: 'desktop-light', width: 1440, height: 1100, theme: 'light' },
      { name: 'mobile-dark', width: 390, height: 1000, theme: 'dark' },
    ]) {
      await page.setViewportSize({ width: layout.width, height: layout.height })
      await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), layout.theme)
      await dialog.locator('.diet-detail').evaluate((element) => { element.parentElement!.parentElement!.scrollTop = 0 })
      await expect(dialog.locator('.diet-detail')).toBeVisible()
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await dialog.screenshot({ path: testInfo.outputPath(`diet-${layout.name}.png`), animations: 'disabled' })
      await dialog.locator('.diet-meal').scrollIntoViewIfNeeded()
      await dialog.screenshot({ path: testInfo.outputPath(`diet-menu-${layout.name}.png`), animations: 'disabled' })
    }
    await dialog.getByRole('button', { name: 'Back to profile' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(profile)
    await expect(page.getByRole('button', { name: 'Lean Fat Loss', exact: true })).toBeFocused()
    expect(writes).toEqual([])
  })

  test('workout name opens weeks, exercises and mobility without editing', async ({ page }, testInfo) => {
    await page.getByRole('button', { name: 'Strength foundation', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Workout plan details' })
    for (const text of ['Build strength safely', 'Coach Riya', 'Arm circles', 'Quad stretch', 'Week 1 · Foundation', 'Day 1 · Full body', 'Day 2 · Recovery · Rest day', 'Goblet squat', 'Keep chest up', '3-1-1', '16']) {
      await expect(dialog.getByText(text, { exact: true })).toBeAttached()
    }
    await expect(dialog.getByRole('link', { name: 'Watch demonstration' })).toHaveAttribute('href', 'https://example.com/squat')
    await expect(dialog.locator('input, select, textarea, [contenteditable="true"]')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /save|edit|remove|assign/i })).toHaveCount(0)
    for (const layout of [
      { name: 'desktop-dark', width: 1440, height: 1100, theme: 'dark' },
      { name: 'desktop-light', width: 1440, height: 1100, theme: 'light' },
      { name: 'mobile-dark', width: 390, height: 1000, theme: 'dark' },
    ]) {
      await page.setViewportSize({ width: layout.width, height: layout.height })
      await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), layout.theme)
      await dialog.locator('.workout-detail').evaluate((element) => { element.parentElement!.parentElement!.scrollTop = 0 })
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await dialog.screenshot({ path: testInfo.outputPath(`workout-${layout.name}.png`), animations: 'disabled' })
      await dialog.getByRole('heading', { name: 'Goblet squat', exact: true }).scrollIntoViewIfNeeded()
      await dialog.screenshot({ path: testInfo.outputPath(`workout-routine-${layout.name}.png`), animations: 'disabled' })
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(profile)
  })

  test('failed plan load offers retry and preserves profile context', async ({ page }) => {
    let fail = true
    await page.route('**/api/DietPlans/7', (route) => fail
      ? route.fulfill({ status: 403, json: { message: 'Access denied' } })
      : route.fulfill({ json: { id: 7, planName: 'Recovered plan', isActive: true, dietMeals: [] } }))
    await page.getByRole('button', { name: 'Lean Fat Loss', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Diet plan details' })
    await expect(dialog.getByRole('alert')).toBeVisible()
    fail = false
    await dialog.getByRole('button', { name: 'Retry' }).click()
    await expect(dialog.getByRole('heading', { name: 'Recovered plan' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page).toHaveURL(profile)
  })
})
