import { expect, test, type Page } from '@playwright/test'

/**
 * Sidebar sections and route guards per persona. Sessions are seeded in localStorage and
 * every /api call is stubbed, so this runs against the web client alone.
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

async function signInAs(page: Page, session: PersonaSession) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
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

/** Section heading → entry labels (links and collapsible group headers), in display order. */
async function readSidebarSections(page: Page) {
  const nav = page.locator('aside nav').first()
  await expect(nav).toBeVisible()
  return nav.evaluate((el) => {
    const sections: Record<string, string[]> = {}
    for (const heading of el.querySelectorAll('p')) {
      const bucket = heading.parentElement
      if (!bucket) continue
      sections[heading.textContent?.trim() ?? ''] = [...bucket.children]
        .filter((child) => child !== heading)
        .map((child) => (child.tagName === 'A' ? child : child.querySelector('button'))?.textContent?.trim() ?? '')
    }
    return sections
  })
}

async function expectRedirectedHome(page: Page, path: string, home = /\/dashboard$/) {
  await page.goto(path)
  await expect(page).toHaveURL(home)
}

async function expectAllowed(page: Page, path: string) {
  await page.goto(path)
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`))
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

test.describe('Persona navigation @nav', () => {
  test('admin sees every section with renamed labels and original URLs', async ({ page }) => {
    await signInAs(page, { appRoles: ['ADMIN'], permissions: ADMIN_PERMISSIONS })
    await page.goto('/dashboard/profile')

    await expect(page.locator('aside a[href="/dashboard/profile"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Open account menu', exact: true })).toHaveCount(1)

    const sections = await readSidebarSections(page)
    expect(Object.keys(sections)).toEqual([
      'Overview',
      'Members',
      'Memberships & Billing',
      'Coaching',
      'Attendance & Access',
      'Retail',
      'Operations',
      'Reports',
      'Settings',
    ])
    expect(sections).toEqual({
      Overview: ['Dashboard'],
      Members: ['Members', 'Lead CRM'],
      'Memberships & Billing': ['Memberships', 'Plan catalog', 'Payments', 'Coupons'],
      Coaching: ['Trainers', 'Training', 'Diet Plans', 'Personal Training'],
      'Attendance & Access': ['Attendance', 'Access & QR'],
      Retail: ['Store'],
      Operations: ['Facilities', 'Lockers'],
      Reports: ['Owner Analytics', 'Security & sessions'],
      Settings: ['Roles & Permissions', 'Notifications'],
    })

    const nav = page.locator('aside nav')
    await expect(nav.getByText('Users (members)')).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Members', exact: true })).toHaveAttribute('href', '/dashboard/users')
    await expect(nav.getByRole('link', { name: 'Memberships', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/user-memberships',
    )
    await expect(nav.getByRole('link', { name: 'Plan catalog' })).toHaveAttribute('href', '/dashboard/membership-plans')

    await nav.getByRole('button', { name: 'Training', exact: true }).click()
    await expect(nav.getByRole('link', { name: 'Plans', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/training/programs',
    )
    await expect(nav.getByRole('link', { name: 'Assign', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/training/workout-assignments',
    )
    await expect(nav.getByRole('link', { name: 'Monitor', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/training/workout-monitoring',
    )
    await expect(nav.getByRole('link', { name: 'Review', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/training/workouts-to-review',
    )
    await expect(nav.getByText('Catalog & audit')).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Workout Plan Audit' })).toHaveAttribute(
      'href',
      '/dashboard/training/workout-plan-audit',
    )
    await nav.getByRole('button', { name: 'Diet Plans' }).click()
    await expect(nav.getByRole('link', { name: 'Supplement Catalog' })).toHaveAttribute(
      'href',
      '/dashboard/supplements/master',
    )
    await nav.getByRole('button', { name: 'Access & QR' }).click()
    await expect(nav.getByRole('link', { name: 'Owner QR' })).toBeVisible()

    await expectAllowed(page, '/dashboard/roles')
  })

  test('admin without audit permission does not see Workout Plan Audit', async ({ page }) => {
    await signInAs(page, {
      appRoles: ['ADMIN'],
      permissions: ADMIN_PERMISSIONS.filter((p) => p !== 'VIEW_WORKOUT_PLAN_AUDIT'),
    })
    await page.goto('/dashboard/profile')
    const nav = page.locator('aside nav')
    await nav.getByRole('button', { name: 'Training', exact: true }).click()
    await expect(nav.getByRole('link', { name: 'Plans', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Workout Plan Audit' })).toHaveCount(0)
  })

  test('staff gets the front-desk menu and restrictions', async ({ page }) => {
    await signInAs(page, { appRoles: ['STAFF'], permissions: ['UsersAccess', 'Payments', 'LEADS_CRM'] })
    await page.goto('/dashboard/profile')

    expect(await readSidebarSections(page)).toEqual({
      Overview: ['Dashboard'],
      Members: ['Members', 'Lead CRM'],
      'Memberships & Billing': ['Memberships', 'Collect payment'],
      'Attendance & Access': ['Attendance', 'Check-in'],
    })
    await expectAllowed(page, '/dashboard/payments/collect')
    await expectRedirectedHome(page, '/dashboard/roles')
    await expectRedirectedHome(page, '/dashboard/gym-operations/equipment')
  })

  test('receptionist without Payments has no billing section or billing routes', async ({ page }) => {
    await signInAs(page, { appRoles: ['RECEPTIONIST'], permissions: ['UsersAccess'] })
    await page.goto('/dashboard/profile')

    expect(await readSidebarSections(page)).toEqual({
      Overview: ['Dashboard'],
      Members: ['Members'],
      'Attendance & Access': ['Attendance', 'Check-in'],
    })
    await expectRedirectedHome(page, '/dashboard/payments')
    await expectRedirectedHome(page, '/dashboard/membership-plans')
  })

  test('accountant keeps the restricted staff menu with billing', async ({ page }) => {
    await signInAs(page, { appRoles: ['ACCOUNTANT'], permissions: ['Payments'] })
    await page.goto('/dashboard/profile')

    expect(await readSidebarSections(page)).toEqual({
      Overview: ['Dashboard'],
      'Memberships & Billing': ['Memberships', 'Collect payment'],
      'Attendance & Access': ['Attendance', 'Check-in'],
    })
    await expectAllowed(page, '/dashboard/payments')
    await expectRedirectedHome(page, '/dashboard/owner-analytics')
  })

  test('trainer gets the coach menu grouped by section', async ({ page }) => {
    await signInAs(page, { appRoles: ['TRAINER'], permissions: ['TrainerAccess'] })
    await page.goto('/dashboard/profile')

    expect(await readSidebarSections(page)).toEqual({
      Overview: ['Dashboard'],
      Members: ['Members'],
      Coaching: ['Training', 'Diet'],
      'Attendance & Access': ['Check-in'],
    })
    await expectAllowed(page, '/dashboard/training/programs')
    await expectRedirectedHome(page, '/dashboard/payments')
  })

  test('member keeps the flat member menu', async ({ page }) => {
    await signInAs(page, { appRoles: ['MEMBER'], permissions: [] })
    await page.goto('/dashboard/profile')

    expect(await readSidebarSections(page)).toEqual({})
    const labels = await page.locator('aside nav a').allTextContents()
    expect(labels.map((l) => l.trim())).toEqual([
      'Home',
      'Workouts',
      'Diet',
      'Progress',
      'Health Profile',
      'Supplements',
      'Profile',
    ])
    await expectRedirectedHome(page, '/dashboard/users', /\/dashboard\/member\/portal$/)
  })

  test('switching persona swaps the menu and leaves admin-only pages', async ({ page }) => {
    await signInAs(page, { appRoles: ['ADMIN', 'TRAINER'], permissions: ADMIN_PERMISSIONS })
    await page.goto('/dashboard/roles')
    expect(Object.keys(await readSidebarSections(page))).toContain('Settings')

    await page.getByRole('button', { name: 'Switch viewing role' }).click()
    await page.getByRole('option', { name: 'Trainer' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto('/dashboard/profile')
    const sections = await readSidebarSections(page)
    expect(Object.keys(sections)).toEqual(['Overview', 'Members', 'Coaching', 'Attendance & Access'])
  })

  test('switching from admin to member on an admin page lands on the member portal', async ({ page }) => {
    await signInAs(page, { appRoles: ['ADMIN', 'MEMBER'], permissions: ADMIN_PERMISSIONS })
    await page.goto('/dashboard/users')
    await page.getByRole('button', { name: 'Switch viewing role' }).click()
    await page.getByRole('option', { name: 'Member' }).click()
    await expect(page).toHaveURL(/\/dashboard\/member\/portal$/)
  })
})
