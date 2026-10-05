import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Attendance dashboard against mocked APIs only. No live or UAT attendance rows are written.
 * The clock is 2026-10-05 00:30 in Asia/Calcutta (2026-10-04 19:00 UTC), inside the window
 * where a UTC date would be the previous day.
 */

const FROZEN_UTC = '2026-10-04T19:00:00.000Z'
const RANGE_START = '2026-09-29'
const RANGE_END = '2026-10-05'

type Visit = {
  id: number
  userId: number
  userName: string
  attendanceDate: string
  checkInTime: string
  checkOutTime: string | null
  isCheckedIn: boolean
  checkInMethod: string
  notes: string | null
  durationMinutes: number | null
}

type Member = {
  id: number
  firstName: string
  lastName: string
  email: string
}

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt() {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: ['ADMIN'], exp })}.sig`
}

function shiftIso(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() + days)
  const yyyy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function buildVisits(): Visit[] {
  const visits: Visit[] = []
  for (let id = 1; id <= 250; id += 1) {
    const date = shiftIso(RANGE_START, (id - 1) % 7)
    const userId = ((id - 1) % 210) + 1
    const open = id <= 80
    visits.push({
      id,
      userId,
      userName: `Member ${userId}`,
      attendanceDate: `${date}T00:00:00`,
      checkInTime: new Date(Date.UTC(2026, 9, 5, 0, 0, id)).toISOString(),
      checkOutTime: open ? null : new Date(Date.UTC(2026, 9, 5, 1, 0, id)).toISOString(),
      isCheckedIn: open,
      checkInMethod: 'FrontDesk',
      notes: null,
      durationMinutes: open ? null : 60,
    })
  }

  const midnight = visits[2]
  midnight.userName = 'Calcutta Midnight'
  midnight.attendanceDate = '2026-10-05T00:00:00'
  midnight.checkInTime = '2026-10-04T18:45:00.000Z'
  midnight.notes = 'arrived-00-15-ist'

  const late = visits[40]
  late.userId = 7
  late.userName = 'Member 7'
  late.attendanceDate = '2026-10-05T00:00:00'
  late.notes = 'late-record'
  late.isCheckedIn = true
  late.checkOutTime = null

  const onTime = visits[41]
  onTime.userId = 7
  onTime.userName = 'Member 7'
  onTime.attendanceDate = '2026-10-05T00:00:00'
  onTime.notes = 'on-time-same-member'
  onTime.isCheckedIn = true
  onTime.checkOutTime = null

  visits.push({
    id: 9001,
    userId: 901,
    userName: 'Before Range',
    attendanceDate: '2026-09-28T00:00:00',
    checkInTime: '2026-09-28T12:00:00.000Z',
    checkOutTime: '2026-09-28T13:00:00.000Z',
    isCheckedIn: false,
    checkInMethod: 'FrontDesk',
    notes: 'before-range',
    durationMinutes: 60,
  })
  visits.push({
    id: 9002,
    userId: 902,
    userName: 'After Range',
    attendanceDate: '2026-10-06T00:00:00',
    checkInTime: '2026-10-05T18:45:00.000Z',
    checkOutTime: null,
    isCheckedIn: true,
    checkInMethod: 'FrontDesk',
    notes: 'after-range',
    durationMinutes: null,
  })
  return visits
}

function buildMembers(): Member[] {
  return Array.from({ length: 240 }, (_, index) => {
    const id = index + 1
    if (id === 240) {
      return { id, firstName: 'Zed', lastName: 'Boundary', email: 'zed.boundary@example.com' }
    }
    return { id, firstName: 'Member', lastName: String(id), email: `member${id}@example.com` }
  })
}

const visits = buildVisits()
const members = buildMembers()

function dayOf(visit: Visit) {
  return visit.attendanceDate.slice(0, 10)
}

function visitsInRange(from: string | null, to: string | null) {
  return visits.filter((visit) => {
    const day = dayOf(visit)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })
}

function summarize(rows: Visit[]) {
  const activeVisits = rows.filter((visit) => visit.isCheckedIn).length
  const uniqueMembers = new Set(rows.map((visit) => visit.userId)).size
  const totalVisits = rows.length
  return {
    totalVisits,
    activeVisits,
    completedSessions: totalVisits - activeVisits,
    uniqueMembers,
  }
}

const defaultSummary = summarize(visitsInRange(RANGE_START, RANGE_END))

function filterVisits(url: URL) {
  const from = url.searchParams.get('fromDate')
  const to = url.searchParams.get('toDate')
  const status = url.searchParams.get('status')
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25')
  const rows = visitsInRange(from, to)
    .filter((visit) => {
      if (search && !visit.userName.toLowerCase().includes(search)) return false
      if (status === 'checked-in') return visit.isCheckedIn
      if (status === 'checked-out') return !visit.isCheckedIn
      if (status === 'late') return visit.id === 41
      return true
    })
    .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime) || b.id - a.id)
  const start = (page - 1) * pageSize
  const data = rows.slice(start, start + pageSize)
  return {
    data,
    page,
    pageSize,
    totalRecords: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
  }
}

type FixtureMode = {
  failAttendance: boolean
  anomalies: 'populated' | 'empty'
  historyReads: number
}

function anomaliesBody() {
  return [
    {
      userId: 7,
      userName: 'Member 7',
      attendanceDate: '2026-10-05',
      type: 'late',
      message: 'Checked in 20 minutes late.',
      attendanceLogId: 41,
      lateByMinutes: 20,
    },
    {
      userId: 8,
      userName: 'No Show Nia',
      attendanceDate: '2026-10-05',
      type: 'no_show',
      message: 'Scheduled but no attendance was logged.',
      attendanceLogId: null,
      lateByMinutes: null,
    },
  ]
}

async function installFixtures(page: Page, permissions: string[], mode: FixtureMode) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route: Route) => {
      const url = new URL(route.request().url())
      const path = url.pathname.toLowerCase()
      const method = route.request().method()

      if (path === '/api/auth/preferences' && method === 'GET') {
        return route.fulfill({ json: { theme: 'dark' } })
      }
      if (path === '/api/auth/preferences' && method === 'PUT') {
        return route.fulfill({ json: { theme: 'dark' } })
      }
      if (path === '/api/auth/logout' || path === '/api/auth/refresh') {
        return route.fulfill({ json: {} })
      }

      if (path === '/api/attendancelogs/summary') {
        if (mode.failAttendance) {
          return route.fulfill({ status: 500, json: { message: 'summary down' } })
        }
        const summary = summarize(visitsInRange(url.searchParams.get('fromDate'), url.searchParams.get('toDate')))
        return route.fulfill({ json: summary })
      }

      if (path === '/api/attendancelogs/paged') {
        if (mode.failAttendance) {
          return route.fulfill({ status: 500, json: { message: 'paged down' } })
        }
        return route.fulfill({ json: filterVisits(url) })
      }

      if (path.startsWith('/api/attendancelogs/anomalies/')) {
        if (mode.failAttendance) {
          return route.fulfill({ status: 500, json: { message: 'anomalies down' } })
        }
        return route.fulfill({ json: mode.anomalies === 'empty' ? [] : anomaliesBody() })
      }

      if (path === '/api/attendancelogs/user/7') {
        mode.historyReads += 1
        const before = {
          id: 41,
          userId: 7,
          userName: 'Member 7',
          attendanceDate: '2026-10-05T00:00:00',
          checkInTime: '2026-10-05T02:00:00.000Z',
          checkOutTime: null,
          isCheckedIn: true,
          checkInMethod: 'FrontDesk',
          notes: 'history-before',
          durationMinutes: null,
        }
        const after = { ...before, id: 77, notes: 'history-after-refresh' }
        return route.fulfill({ json: mode.historyReads > 1 ? [before, after] : [before] })
      }

      if (path === '/api/attendancelogs/checkin' && method === 'POST') {
        return route.fulfill({
          status: 201,
          json: {
            id: 77,
            userId: 9,
            userName: 'Member 9',
            attendanceDate: '2026-10-05T00:00:00',
            checkInTime: FROZEN_UTC,
            checkOutTime: null,
            isCheckedIn: true,
            checkInMethod: 'FrontDesk',
            notes: null,
          },
        })
      }

      if (path === '/api/users/paged') {
        const pageNumber = Number(url.searchParams.get('page') ?? '1')
        const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
        const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
        const filtered = members.filter((member) => {
          const label = `${member.firstName} ${member.lastName} ${member.email}`.toLowerCase()
          return !search || label.includes(search)
        })
        const start = (pageNumber - 1) * pageSize
        return route.fulfill({
          json: {
            items: filtered.slice(start, start + pageSize),
            totalCount: filtered.length,
            page: pageNumber,
            pageSize,
          },
        })
      }

      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    },
  )

  const token = fakeJwt()
  const user = {
    token,
    username: 'persona@test.local',
    email: 'persona@test.local',
    fullName: 'Persona Test',
    userId: 101,
    id: 101,
    appRoles: ['ADMIN'],
    permissions: permissions.map((code, index) => ({ id: index + 1, code })),
  }
  await page.addInitScript(
    ({ token: accessToken, user: session }) => {
      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(session))
    },
    { token, user },
  )
}

async function openAttendance(page: Page) {
  await page.clock.install({ time: new Date(FROZEN_UTC) })
  await page.goto('/dashboard/attendance')
  await expect(page.getByRole('heading', { level: 1, name: 'Attendance' })).toBeVisible()
}

test.describe('attendance dashboard fixtures', () => {
  test.use({ timezoneId: 'Asia/Calcutta', locale: 'en-US' })

  test('covers range totals, paging, status, late rows, Calcutta dates, search, and history refresh', async ({ page }) => {
    const mode: FixtureMode = { failAttendance: false, anomalies: 'populated', historyReads: 0 }
    await installFixtures(page, ['VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE'], mode)
    await openAttendance(page)

    await expect(page.getByRole('textbox', { name: 'Range start' })).toHaveValue(RANGE_START)
    await expect(page.getByRole('textbox', { name: 'Range end' })).toHaveValue(RANGE_END)
    await expect(page.getByRole('heading', { name: 'Range Overview' })).toBeVisible()
    await expect(page.getByText('Tue, Sep 29, 2026 – Mon, Oct 5, 2026')).toBeVisible()
    await expect(page.getByText(`${defaultSummary.totalVisits}`).first()).toBeVisible()
    await expect(page.getByText(`${defaultSummary.uniqueMembers} unique members in this range`)).toBeVisible()
    await expect(page.getByText(`${defaultSummary.activeVisits}`, { exact: true }).first()).toBeVisible()
    const completion = Math.round((defaultSummary.completedSessions / defaultSummary.totalVisits) * 100)
    await expect(page.getByText(`${completion}%`)).toBeVisible()
    await expect(page.getByText('Before Range')).toHaveCount(0)
    await expect(page.getByText('After Range')).toHaveCount(0)
    await expect(page.getByText('Page 1 of 10 · Showing 1–25 of 250')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Page 2 of 10 · Showing 26–50 of 250')).toBeVisible()

    await page.getByRole('combobox', { name: 'Status' }).selectOption('checked-in')
    await expect(page.getByText('Page 1 of 4 · Showing 1–25 of 80')).toBeVisible()
    await expect(page.getByText(`${defaultSummary.totalVisits}`).first()).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Page 2 of 4 · Showing 26–50 of 80')).toBeVisible()

    await page.getByRole('combobox', { name: 'Status' }).selectOption('late')
    await expect(page.getByText('late-record')).toBeVisible()
    await expect(page.getByText('on-time-same-member')).toHaveCount(0)
    await expect(page.getByText('Page 1 of 1 · Showing 1–1 of 1')).toBeVisible()

    await page.getByRole('combobox', { name: 'Status' }).selectOption('all')
    await page.getByRole('textbox', { name: 'Search attendance by member name or phone' }).fill('Calcutta')
    await expect(page.getByText('Calcutta Midnight')).toBeVisible()
    await expect(page.getByText('Before Range')).toHaveCount(0)

    await page.getByRole('textbox', { name: 'Range start' }).fill('2026-10-05')
    await page.getByRole('textbox', { name: 'Range end' }).fill('2026-10-05')
    await expect(page.getByRole('heading', { name: "Today's Overview" })).toBeVisible()
    await expect(page.getByText('Calcutta Midnight')).toBeVisible()
    await expect(page.getByText('Before Range')).toHaveCount(0)
    await expect(page.getByText('After Range')).toHaveCount(0)
    await expect(page.getByText('Inferred no-show', { exact: true })).toBeVisible()
    await expect(page.getByText('All clear')).toHaveCount(0)

    await page.getByRole('button', { name: 'View history for Member 7' }).click()
    await expect(page.getByText('history-before')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('history-before')).toHaveCount(0)

    await page.getByRole('button', { name: 'Check in member' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('1–20 of 240')).toBeVisible()
    await expect(dialog.getByRole('option', { name: /Zed Boundary/ })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Next' }).click()
    await expect(dialog.getByText('21–40 of 240')).toBeVisible()
    await dialog.getByRole('textbox', { name: 'Search members to check in' }).fill('Zed')
    await expect(dialog.getByRole('option', { name: /Zed Boundary/ })).toBeVisible()
    await dialog.getByRole('option', { name: /Zed Boundary/ }).click()
    await dialog.getByRole('button', { name: 'Check in member' }).click()
    await expect(page.getByRole('heading', { name: 'Check In Member' })).toHaveCount(0)

    await page.getByRole('button', { name: 'View history for Member 7' }).click()
    await expect(page.getByText('history-after-refresh')).toBeVisible()
    expect(mode.historyReads).toBeGreaterThan(1)
  })

  test('api failures stay distinct from an empty exception list', async ({ page }) => {
    const mode: FixtureMode = { failAttendance: true, anomalies: 'empty', historyReads: 0 }
    await installFixtures(page, ['VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE'], mode)
    await openAttendance(page)

    await expect(page.getByText('Something went wrong on our side. Please try again in a moment.').first()).toBeVisible()
    await expect(page.getByText('Could not load exceptions')).toBeVisible()
    await expect(page.getByText('All clear')).toHaveCount(0)
    await expect(page.getByText('Total visits', { exact: true })).toBeVisible()
  })

  test('view-only attendance hides check-in and check-out', async ({ page }) => {
    const mode: FixtureMode = { failAttendance: false, anomalies: 'empty', historyReads: 0 }
    await installFixtures(page, ['VIEW_ATTENDANCE'], mode)
    await openAttendance(page)

    await expect(page.getByRole('button', { name: 'Check in member' })).toHaveCount(0)
    await expect(page.getByText('All clear')).toBeVisible()
    await page.getByRole('button', { name: /Actions for / }).first().click()
    await expect(page.getByRole('menuitem', { name: 'View history' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Check out' })).toHaveCount(0)
  })

  test('desktop light and dark layouts keep the log and exceptions readable', async ({ page }) => {
    const mode: FixtureMode = { failAttendance: false, anomalies: 'populated', historyReads: 0 }
    await installFixtures(page, ['VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE'], mode)
    await page.setViewportSize({ width: 1280, height: 800 })
    await openAttendance(page)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('heading', { name: 'Attendance log' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Exceptions' })).toBeVisible()
    const darkOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(darkOverflow).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByText('Total visits', { exact: true })).toBeVisible()
    await expect(page.getByText('Inferred no-show', { exact: true })).toBeVisible()
    const lightText = await page.getByText('Total visits', { exact: true }).evaluate((element) => {
      const style = getComputedStyle(element)
      return { color: style.color, size: style.fontSize }
    })
    expect(lightText.color).not.toBe('rgba(0, 0, 0, 0)')
    expect(Number.parseFloat(lightText.size)).toBeGreaterThanOrEqual(11)
  })

  test('mobile light and dark layouts keep row actions on screen', async ({ page }) => {
    const mode: FixtureMode = { failAttendance: false, anomalies: 'populated', historyReads: 0 }
    await installFixtures(page, ['VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE'], mode)
    await page.setViewportSize({ width: 390, height: 844 })
    await openAttendance(page)

    await expect(page.getByRole('button', { name: 'Check in member' })).toBeVisible()
    const action = page.getByRole('button', { name: /Actions for / }).first()
    await action.scrollIntoViewIfNeeded()
    const box = await action.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('heading', { name: 'Exceptions' })).toBeVisible()
    await expect(page.getByText('Inferred no-show', { exact: true })).toBeVisible()
  })
})
