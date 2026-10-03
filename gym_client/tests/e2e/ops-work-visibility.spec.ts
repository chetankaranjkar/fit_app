import { expect, test, type Page } from '@playwright/test'

/**
 * Operations / retail overdue and low-stock surfaces. Sessions are seeded in localStorage
 * and every /api call is stubbed so this runs against the web client alone.
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

const equipment = [
  {
    id: 1,
    name: 'Treadmill Overdue',
    category: 'Cardio',
    brand: 'Pulse',
    serialNumber: 'TR-1',
    location: 'Cardio Zone',
    purchaseDate: `${localDay(-400)}T00:00:00`,
    purchaseCost: 100000,
    status: 'OPERATIONAL',
    nextServiceDate: `${localDay(-5)}T00:00:00`,
  },
  {
    id: 2,
    name: 'Bike Due Soon',
    category: 'Cardio',
    brand: 'Pulse',
    location: 'Cardio Zone',
    purchaseDate: `${localDay(-200)}T00:00:00`,
    purchaseCost: 40000,
    status: 'OPERATIONAL',
    nextServiceDate: `${localDay(3)}T00:00:00`,
  },
]

const maintenanceLogs = [
  {
    id: 11,
    equipmentId: 1,
    equipmentName: 'Treadmill Overdue',
    type: 'ROUTINE',
    performedAt: `${localDay(-40)}T10:00:00`,
    performedBy: 'Ravi Tech',
    description: 'Belt tension',
    nextServiceDate: `${localDay(-5)}T00:00:00`,
  },
]

const cleaning = [
  {
    id: 21,
    logDate: `${localDay(-2)}T00:00:00`,
    area: 'Locker Rooms',
    shift: 'EVENING',
    performedBy: 'Meena',
    tasks: [
      { id: 211, label: 'Empty bins', isDone: false },
      { id: 212, label: 'Mop floors', isDone: false },
    ],
  },
  {
    id: 22,
    logDate: `${localDay(0)}T00:00:00`,
    area: 'Cardio Zone',
    shift: 'MORNING',
    performedBy: 'Ravi',
    tasks: [
      { id: 221, label: 'Wipe handles', isDone: true },
      { id: 222, label: 'Vacuum mats', isDone: true },
    ],
  },
]

const lockers = [
  { id: 31, lockerNumber: 'A-104', size: 'Large', status: 'MAINTENANCE', location: "Men's Changing Room" },
  { id: 32, lockerNumber: 'B-205', size: 'Medium', status: 'MAINTENANCE', location: "Women's Changing Room" },
]

const lockerTickets = [
  {
    id: 41,
    lockerId: 32,
    lockerNumber: 'B-205',
    issue: 'Key jammed',
    reportedDate: `${localDay(-7)}T00:00:00`,
    status: 'PENDING',
  },
  {
    id: 42,
    lockerId: 31,
    lockerNumber: 'A-104',
    issue: 'Latch sticky',
    reportedDate: `${localDay(-1)}T00:00:00`,
    status: 'PENDING',
  },
  {
    id: 43,
    lockerId: 31,
    lockerNumber: 'A-104',
    issue: 'Cosmetic dent',
    reportedDate: `${localDay(-21)}T00:00:00`,
    status: 'FIXED',
  },
]

const lowStock = [
  {
    productId: 51,
    productName: 'Whey Isolate',
    sku: 'WHY-001',
    stockQuantity: 0,
    lowStockThreshold: 5,
    alertType: 'OutOfStock',
  },
  {
    productId: 52,
    productName: 'Shaker Bottle',
    sku: 'SHK-009',
    stockQuantity: 2,
    lowStockThreshold: 4,
    alertType: 'LowStock',
  },
]

async function signInAs(page: Page, session: PersonaSession) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => {
      const path = new URL(route.request().url()).pathname.toLowerCase()
      if (path === '/api/gym-operations/equipment') return route.fulfill({ json: equipment })
      if (path === '/api/gym-operations/maintenance') return route.fulfill({ json: maintenanceLogs })
      if (path === '/api/gym-operations/cleaning') return route.fulfill({ json: cleaning })
      if (path === '/api/gym-operations/expenses') return route.fulfill({ json: [] })
      if (path === '/api/gym-operations/vendors') return route.fulfill({ json: [] })
      if (path === '/api/locker-management/lockers') return route.fulfill({ json: lockers })
      if (path === '/api/locker-management/maintenance') return route.fulfill({ json: lockerTickets })
      if (path === '/api/locker-management/assignments') return route.fulfill({ json: [] })
      if (path === '/api/retail/inventory/alerts/low-stock') return route.fulfill({ json: lowStock })
      if (path === '/api/retail/inventory/alerts/expiry') return route.fulfill({ json: [] })
      if (path.includes('/gym-operations/cleaning/') && route.request().method() === 'PATCH') {
        return route.fulfill({ json: { id: 211, label: 'Empty bins', isDone: true } })
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

const ADMIN = {
  appRoles: ['ADMIN'],
  permissions: ['Reports', 'Config', 'Payments', 'UsersAccess'],
}

test.describe('Operations and retail work visibility @ops-work', () => {
  test('equipment list shows overdue, due date, last serviced by, and log-service link', async ({ page }) => {
    await signInAs(page, ADMIN)
    await page.goto('/dashboard/gym-operations/equipment')
    const overdue = page.locator('[data-testid="equipment-row"][data-overdue="true"]')
    await expect(overdue).toBeVisible({ timeout: 30_000 })
    await expect(overdue).toContainText('Treadmill Overdue')
    await expect(overdue.getByTestId('service-urgency')).toContainText(/Overdue/i)
    await expect(overdue.getByTestId('equipment-assignee')).toHaveText('Ravi Tech')
    await expect(overdue.getByRole('link', { name: 'Log service' })).toHaveAttribute(
      'href',
      '/dashboard/gym-operations/maintenance?equipmentId=1',
    )

    await page.goto('/dashboard/gym-operations/equipment?service=overdue')
    await expect(page.locator('[data-testid="equipment-row"]')).toHaveCount(1)
    await overdue.getByRole('link', { name: 'Log service' }).click()
    await expect(page).toHaveURL(/\/dashboard\/gym-operations\/maintenance\?equipmentId=1/)
    await expect(page.getByRole('combobox', { name: 'Equipment' })).toHaveValue('1')
  })

  test('cleaning shows overdue, assignee, due date, and mark-complete action', async ({ page }) => {
    await signInAs(page, ADMIN)
    await page.goto('/dashboard/gym-operations/cleaning')
    const overdue = page.locator('[data-testid="cleaning-card"][data-overdue="true"]')
    await expect(overdue).toBeVisible({ timeout: 30_000 })
    await expect(overdue).toContainText('Locker Rooms')
    await expect(overdue.getByTestId('cleaning-assignee')).toContainText('Meena')
    await expect(overdue.getByRole('button', { name: 'Mark shift complete' })).toBeVisible()
  })

  test('locker tickets show overdue, area, days open, and mark-fixed', async ({ page }) => {
    await signInAs(page, ADMIN)
    await page.goto('/dashboard/locker-management/maintenance?attention=overdue')
    const overdue = page.locator('[data-testid="locker-ticket"][data-overdue="true"]')
    await expect(overdue).toBeVisible({ timeout: 30_000 })
    await expect(overdue).toContainText('B-205')
    await expect(overdue.getByTestId('locker-area')).toContainText('Changing Room')
    await expect(overdue.getByTestId('locker-days-open')).toContainText('Overdue')
    await expect(overdue.getByRole('button', { name: 'Mark fixed' })).toBeVisible()
    await expect(page.locator('[data-testid="locker-ticket"]')).toHaveCount(1)
  })

  test('inventory alerts show low stock and open existing inward flow', async ({ page }) => {
    await signInAs(page, ADMIN)
    await page.goto('/dashboard/retail/alerts')
    const out = page.locator('[data-testid="low-stock-row"][data-alert-type="OutOfStock"]')
    await expect(out).toBeVisible({ timeout: 30_000 })
    await expect(out).toContainText('Whey Isolate')
    await expect(out).toContainText('5')
    await out.getByRole('button', { name: 'Add stock' }).click()
    await expect(page.getByRole('heading', { name: 'Add Stock (Inward)' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open catalog' }).first()).toHaveAttribute(
      'href',
      '/dashboard/retail/products',
    )
  })

  test('receptionist cannot open ops, locker, or retail work screens', async ({ page }) => {
    await signInAs(page, { appRoles: ['RECEPTIONIST'], permissions: ['UsersAccess'] })
    await page.goto('/dashboard/gym-operations/equipment')
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto('/dashboard/locker-management/maintenance')
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto('/dashboard/retail/alerts')
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
