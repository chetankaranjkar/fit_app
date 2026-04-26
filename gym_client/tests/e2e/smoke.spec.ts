import { expect, request, test } from '@playwright/test'

type LoginPayload = {
  token: string
}

type UserPayload = {
  id: number
}

type PlanPayload = {
  id: number
}

type MembershipPayload = {
  id: number
}

type PaymentPayload = {
  id: number
  receiptNo?: string | null
  invoiceId?: number | null
}

const adminUsername = process.env.E2E_ADMIN_USERNAME ?? 'admin@gym.com'
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'admin123'
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:5104/api'

async function loginViaUi(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill(adminUsername)
  await page.getByLabel('Password').fill(adminPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function getAuthToken() {
  const api = await request.newContext({ baseURL: apiBaseUrl })
  const login = await api.post('/Auth/login', {
    data: { username: adminUsername, password: adminPassword },
  })
  expect(login.ok()).toBeTruthy()
  const payload = (await login.json()) as LoginPayload
  await api.dispose()
  return payload.token
}

async function createMemberFixture(token: string, seed: string) {
  const api = await request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  })

  const userRes = await api.post('/Users', {
    data: {
      firstName: `E2E${seed}`,
      lastName: 'Member',
      email: `e2e-${seed}@example.com`,
      phone: `999${seed.slice(-7)}`,
      dateOfBirth: '1995-01-01',
      gender: 'Male',
      isActive: true,
      address: 'Smoke test street',
    },
  })
  expect(userRes.ok()).toBeTruthy()
  const user = (await userRes.json()) as UserPayload

  const plansRes = await api.get('/MembershipPlans')
  expect(plansRes.ok()).toBeTruthy()
  const plans = (await plansRes.json()) as PlanPayload[]
  let planId = plans[0]?.id

  if (!planId) {
    const createPlanRes = await api.post('/MembershipPlans', {
      data: {
        planName: `E2E Plan ${seed}`,
        durationDays: 30,
        price: 1499,
        description: 'Smoke test plan',
      },
    })
    expect(createPlanRes.ok()).toBeTruthy()
    const plan = (await createPlanRes.json()) as PlanPayload
    planId = plan.id
  }

  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 30)
  const membershipRes = await api.post('/UserMemberships', {
    data: {
      userId: user.id,
      planId,
      startDate: today.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      status: 'Active',
    },
  })
  expect(membershipRes.ok()).toBeTruthy()
  const membership = (await membershipRes.json()) as MembershipPayload

  await api.dispose()
  return { userId: user.id, membershipId: membership.id }
}

test.describe('Critical smoke flows', () => {
  test('login works @smoke', async ({ page }) => {
    await loginViaUi(page)
    await expect(page.getByText("Here's what's happening at your gym today.")).toBeVisible()
  })

  test('payment creates and invoice opens @smoke', async ({ page }) => {
    const seed = Date.now().toString()
    const token = await getAuthToken()
    const { membershipId } = await createMemberFixture(token, seed)
    const receiptNo = `E2E-${seed}`

    const api = await request.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    })
    const paymentRes = await api.post('/Payments', {
      data: {
        membershipId,
        amount: 999,
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMode: 'Cash',
        receiptNo,
      },
    })
    expect(paymentRes.ok()).toBeTruthy()
    const payment = (await paymentRes.json()) as PaymentPayload
    await api.dispose()

    await loginViaUi(page)
    await page.goto('/dashboard/payments')
    const row = page.locator('tr', { hasText: payment.receiptNo ?? receiptNo })
    await expect(row).toBeVisible()

    const invoiceBtn = row.getByRole('button', { name: 'Invoice' })
    if (await invoiceBtn.count()) {
      await invoiceBtn.click()
    } else {
      await row.getByRole('button', { name: 'Generate' }).click()
      await row.getByRole('button', { name: 'Invoice' }).click()
    }

    const title = payment.invoiceId ? `Invoice ${payment.invoiceId}` : 'Invoice'
    await expect(page.getByRole('heading', { name: new RegExp(title.split(' ')[0], 'i') })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible()
  })

  test('body metrics CRUD works @smoke', async ({ page }) => {
    const seed = Date.now().toString()
    const token = await getAuthToken()
    const { userId } = await createMemberFixture(token, seed)

    await loginViaUi(page)
    await page.goto(`/dashboard/users/${userId}`)
    await page.getByRole('button', { name: 'Body Metrics' }).click()
    await page.getByRole('button', { name: '+ Log metrics' }).click()
    await page.getByLabel('Weight (kg)').fill('79.2')
    await page.getByLabel('Height (cm)').fill('176')
    await page.getByLabel('Notes').fill(`metrics-${seed}`)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText(`metrics-${seed}`)).toBeVisible()
    await page.getByRole('button', { name: 'Update' }).first().click()
    await page.getByLabel('Notes').fill(`updated-${seed}`)
    await page.getByRole('button', { name: 'Update' }).last().click()
    await expect(page.getByText(`updated-${seed}`)).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByText(`updated-${seed}`)).toHaveCount(0)
  })
})

