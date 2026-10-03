import { expect, test, type Page } from '@playwright/test'

/**
 * CSV member import on `/dashboard/users`. Directory APIs are stubbed; preview and import
 * are intercepted so row errors, duplicates, and the result download can be asserted without a DB.
 */

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

const CSV = `firstName,lastName,email,phone,dateOfBirth,gender
Jane,Doe,jane@test.local,9876543210,1990-05-15,Female
Bad,Phone,bad@test.local,12345,1990-05-15,Female
Dup,Phone,dup@test.local,9123456789,1990-05-15,Female
`

async function signIn(page: Page) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/users/paged',
    (route) => route.fulfill({ json: { items: [], totalCount: 0, page: 1, pageSize: 50 } }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/users/members-directory-count',
    (route) => route.fulfill({ json: 0 }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/users/members-directory-stats',
    (route) => route.fulfill({ json: { total: 0, active: 0, inactive: 0, batches: [] } }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/membershipplans' || url.pathname.toLowerCase() === '/api/membership-plans',
    (route) => route.fulfill({ json: [] }),
  )
  await page.route((url) => url.pathname.toLowerCase() === '/api/trainers', (route) =>
    route.fulfill({ json: [] }),
  )
  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/auth/preferences',
    (route) => route.fulfill({ json: { theme: 'dark' } }),
  )

  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/users/bulk-import/preview',
    async (route) => {
      const body = route.request().postDataJSON() as { members: { email: string; sourceRowNumber?: number }[] }
      const rows = (body.members ?? []).map((m) => {
        if (m.email === 'dup@test.local') {
          return {
            sourceRowNumber: m.sourceRowNumber ?? 4,
            email: m.email,
            phone: '9123456789',
            outcome: 'skipped',
            field: 'phone',
            code: 'duplicate_phone',
            matchedOn: 'phone',
            existingUserId: 42,
            existingUserLabel: 'Riya Sharma (#42)',
            message: 'Duplicate phone number: 9123456789 (dup@test.local) matches Riya Sharma (#42).',
            howToFix: 'This import skips the row. It does not update the existing member. Use a different phone, or omit this row.',
          }
        }
        return {
          sourceRowNumber: m.sourceRowNumber ?? 2,
          email: m.email,
          phone: '9876543210',
          outcome: 'accepted',
          message: 'Ready to import as a new member (will not update an existing account).',
        }
      })
      return route.fulfill({
        json: {
          imported: 0,
          wouldImport: rows.filter((r) => r.outcome === 'accepted').length,
          skipped: rows.filter((r) => r.outcome === 'skipped').length,
          failed: 0,
          dryRun: true,
          log: [],
          rows,
        },
      })
    },
  )

  await page.route(
    (url) => url.pathname.toLowerCase() === '/api/users/bulk-import',
    async (route) => {
      const body = route.request().postDataJSON() as { members: { email: string; sourceRowNumber?: number }[] }
      const accepted = (body.members ?? []).filter((m) => m.email === 'jane@test.local')
      return route.fulfill({
        json: {
          imported: accepted.length,
          wouldImport: accepted.length,
          skipped: (body.members ?? []).length - accepted.length,
          failed: 0,
          dryRun: false,
          log: [],
          rows: (body.members ?? []).map((m) =>
            m.email === 'jane@test.local'
              ? {
                  sourceRowNumber: m.sourceRowNumber ?? 2,
                  email: m.email,
                  outcome: 'accepted',
                  message: 'Imported as a new member.',
                }
              : {
                  sourceRowNumber: m.sourceRowNumber ?? 4,
                  email: m.email,
                  outcome: 'skipped',
                  matchedOn: 'phone',
                  existingUserLabel: 'Riya Sharma (#42)',
                  message: 'Duplicate phone number skipped.',
                  howToFix: 'This import skips the row.',
                },
          ),
        },
      })
    },
  )

  const token = fakeJwt(['ADMIN'])
  const user = {
    token,
    username: 'admin@test.local',
    email: 'admin@test.local',
    fullName: 'Admin Test',
    userId: 101,
    appRoles: ['ADMIN'],
    permissions: ['UsersAccess', 'MANAGE_MEMBERS', 'CREATE_MEMBER', 'Payments'].map((code, i) => ({
      id: i + 1,
      code,
    })),
  }
  await page.addInitScript(
    ({ token, user }) => {
      if (sessionStorage.getItem('csv-import-seeded')) return
      sessionStorage.setItem('csv-import-seeded', '1')
      localStorage.clear()
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user },
  )
}

test.describe('Member CSV import @import', () => {
  test('shows required columns, preview, row errors, duplicates, and a downloadable summary', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/users')
    await expect(page.getByRole('heading', { name: 'All Members' })).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: 'Import CSV' }).click()
    const modal = page.getByTestId('member-csv-import-modal')
    await expect(modal).toBeVisible()

    const required = page.getByTestId('member-csv-required-columns')
    await expect(required).toContainText('firstName')
    await expect(required).toContainText('lastName')
    await expect(required).toContainText('email')
    await expect(required).toContainText('phone')
    await expect(required).toContainText('dateOfBirth')
    await expect(required).toContainText('gender')
    await expect(required).toContainText('mobileNumber')

    await page.getByTestId('member-csv-file').setInputFiles({
      name: 'members.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV),
    })

    await expect(page.getByTestId('member-csv-preview')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('member-csv-preview')).toContainText('ready to import')

    await expect(page.getByTestId('member-csv-row-errors')).toContainText('Row 3')
    await expect(page.getByTestId('member-csv-row-errors')).toContainText('phone')
    await expect(page.getByTestId('member-csv-row-errors')).toContainText('Fix:')

    await expect(page.getByTestId('member-csv-duplicates')).toContainText('matched on phone')
    await expect(page.getByTestId('member-csv-duplicates')).toContainText('Riya Sharma (#42)')
    await expect(page.getByTestId('member-csv-duplicates')).toContainText('does not update')

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('member-csv-download-summary').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/members-import-result/)

    await page.getByTestId('member-csv-submit').click()
    await expect(page.getByTestId('member-csv-progress')).toContainText('Importing')
    await expect(page.getByTestId('member-csv-preview')).toContainText('Imported 1', { timeout: 15_000 })
  })
})
