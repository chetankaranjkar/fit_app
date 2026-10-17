import { expect, test, type Page } from '@playwright/test'

const member = { id: 10011, firstName: 'Ayush', lastName: 'Gire', email: 'ayush@test.local', isActive: true }
const other = { id: 10012, firstName: 'Riya', lastName: 'Sharma', email: 'riya@test.local', isActive: true }
const profilePath = `/dashboard/users/${member.id}`
const assignmentPath = '/dashboard/diet-plans/assign'

async function setup(page: Page) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: '101', role: ['ADMIN'], exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
  await page.addInitScript(({ token }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify({
      token, userId: 101, username: 'staff@test.local', appRoles: ['ADMIN'],
      permissions: ['UsersAccess', 'TrainerAccess'].map((code, i) => ({ id: i + 1, code })),
    }))
  }, { token })
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.toLowerCase()
    if (path === '/api/auth/preferences') return route.fulfill({ json: { theme: 'dark' } })
    // Intentionally exclude the profile member from the picker's first page.
    if (path === '/api/users/paged') return route.fulfill({ json: { items: [other], totalCount: 1 } })
    if (path === `/api/users/${member.id}`) return route.fulfill({ json: member })
    if (path === `/api/users/${member.id}/profile-summary`) return route.fulfill({ json: { hasActiveMembership: true } })
    if (path === '/api/dietplans/paged') return route.fulfill({ json: { items: [], totalCount: 0 } })
    if (path === '/api/userdietplans') return route.fulfill({ json: [] })
    return route.fulfill({ status: 404, json: {} })
  })
}

test.describe('Diet assignment from a profile @regression', () => {
  test.beforeEach(async ({ page }) => setup(page))

  test('locks the profile member and restores it after multiple-member selection', async ({ page }) => {
    await page.goto(`${assignmentPath}?userId=${member.id}&returnTo=${encodeURIComponent(profilePath)}`)
    const dialog = page.getByRole('dialog', { name: 'Assign diet plan' })
    const picker = dialog.getByRole('combobox', { name: 'Select user' })
    await expect(picker).toBeDisabled()
    await expect(picker).toHaveValue(String(member.id))
    await expect(picker.locator('option:checked')).toContainText('Ayush Gire')
    const bulk = dialog.getByRole('checkbox', { name: 'Assign to multiple members' })
    await bulk.check()
    await expect(picker).toHaveCount(0)
    await expect(dialog.getByRole('checkbox', { name: /Ayush Gire/ })).toBeChecked()
    await dialog.getByRole('checkbox', { name: /Ayush Gire/ }).uncheck()
    await dialog.getByRole('checkbox', { name: /Riya Sharma/ }).check()
    await bulk.uncheck()
    await expect(picker).toBeDisabled()
    await expect(picker).toHaveValue(String(member.id))
  })

  for (const close of ['Cancel', 'Close', 'Escape', 'Backdrop']) {
    test(`${close} returns to the original profile`, async ({ page }) => {
      const returnPath = `${profilePath}?tab=details`
      await page.goto(`${assignmentPath}?userId=${member.id}&returnTo=${encodeURIComponent(returnPath)}`)
      const dialog = page.getByRole('dialog', { name: 'Assign diet plan' })
      await expect(dialog).toBeVisible()
      if (close === 'Escape') await page.keyboard.press('Escape')
      else if (close === 'Backdrop') await page.mouse.click(5, 700)
      else await dialog.getByRole('button', { name: close, exact: true }).click()
      await expect(page).toHaveURL(returnPath)
      await expect(dialog).toHaveCount(0)
    })
  }

  test('preset member is the return fallback', async ({ page }) => {
    await page.goto(`${assignmentPath}?userId=${member.id}`)
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(profilePath)
  })

  test('direct assignment keeps the member editable and stays on the list on cancel', async ({ page }) => {
    await page.goto(assignmentPath)
    await page.getByRole('button', { name: 'Assign plan', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('combobox', { name: 'Select user' })).toBeEnabled()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(assignmentPath)
    await expect(dialog).toHaveCount(0)
  })
})
