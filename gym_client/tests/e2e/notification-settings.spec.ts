import { expect, test, type Page } from '@playwright/test'

/**
 * Notification channel status, delivery states, member opt-in, and secret masking.
 * Fake JWT + localStorage; every /api call is stubbed.
 */

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeJwt(appRoles: string[]) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: '101', role: appRoles, exp })}.sig`
}

const LEAKED_SECRET = 'smtp-super-secret-password-xyz'
const LEAKED_TOKEN = 'Bearer FAKESECRET_k1l2m3n4o5p6q7r8s9t0'

async function signIn(page: Page, roles = ['ADMIN']) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  )

  await page.route('**/api/notification-channels', (route) =>
    route.fulfill({
      json: {
        memberOptInNote:
          'Outbound email and SMS/WhatsApp send only when the member has opted in. In-app dashboard alerts do not use those opt-ins.',
        channels: [
          {
            channel: 'email',
            label: 'Email',
            readiness: 'Disabled',
            blockingReasons: ['SMTP host missing'],
            summary: 'Email is disabled. SMTP host missing.',
            settingsPath: '/dashboard/settings/email',
            secretConfigured: false,
          },
          {
            channel: 'sms',
            label: 'SMS',
            readiness: 'Unconfigured',
            blockingReasons: ['SMS not configured'],
            summary: 'SMS is unconfigured. SMS not configured.',
            settingsPath: '/dashboard/settings/sms',
            secretConfigured: false,
          },
          {
            channel: 'whatsapp',
            label: 'WhatsApp',
            readiness: 'Ready',
            blockingReasons: [],
            summary: 'WhatsApp webhook is ready. Members still need SMS/WhatsApp opt-in.',
            settingsPath: '/dashboard/settings/sms',
            secretConfigured: true,
          },
          {
            channel: 'inapp',
            label: 'In-app',
            readiness: 'Ready',
            blockingReasons: [],
            summary: 'In-app alerts write to the member dashboard and mobile inbox.',
            settingsPath: null,
            secretConfigured: false,
          },
          {
            channel: 'push',
            label: 'Push',
            readiness: 'Unconfigured',
            blockingReasons: ['Push key missing'],
            summary: 'Gym-level Firebase Admin is unconfigured. 0 member device tokens are registered.',
            settingsPath: null,
            secretConfigured: false,
          },
        ],
      },
    }),
  )

  await page.route('**/api/EmailSettings', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        json: {
          enabled: false,
          provider: 'gmail',
          smtpHost: null,
          smtpPort: 587,
          smtpUseStartTls: true,
          smtpUsername: null,
          hasPasswordConfigured: false,
          fromAddress: null,
          fromDisplayName: null,
          sendPaymentReceipts: true,
          sendMembershipExpiryReminders: true,
          sendDietAssignments: true,
          isConfigured: false,
          passwordNeedsReentry: false,
          readiness: 'Disabled',
          blockingReasons: ['SMTP host missing', 'SMTP password missing'],
          updatedDateUtc: null,
        },
      })
    }
    return route.fulfill({ status: 200, json: {} })
  })

  await page.route('**/api/SmsSettings', (route) =>
    route.fulfill({
      json: {
        sms: {
          enabled: true,
          webhookUrl: null,
          senderId: null,
          hasAuthHeaderConfigured: false,
          sendPaymentReceipts: true,
          sendMembershipExpiryReminders: true,
          isConfigured: false,
          readiness: 'Unconfigured',
          blockingReasons: ['SMS not configured'],
        },
        whatsApp: {
          enabled: true,
          webhookUrl: 'https://example.test/wa',
          senderId: null,
          hasAuthHeaderConfigured: true,
          sendPaymentReceipts: true,
          sendMembershipExpiryReminders: true,
          isConfigured: true,
          readiness: 'Ready',
          blockingReasons: [],
        },
        updatedDateUtc: null,
      },
    }),
  )

  await page.route('**/api/notification-templates/outbox**', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          templateCode: 'Welcome',
          channel: 'Email',
          recipient: 'queued@test.local',
          status: 'Pending',
          displayStatus: 'Queued',
          retryCount: 0,
          maxRetries: 3,
          errorMessage: null,
          createdDate: new Date().toISOString(),
        },
        {
          id: 2,
          templateCode: 'PaymentSuccess',
          channel: 'SMS',
          recipient: '+910000000000',
          status: 'Pending',
          displayStatus: 'Retrying',
          retryCount: 1,
          maxRetries: 3,
          errorMessage: 'WhatsApp not configured',
          createdDate: new Date().toISOString(),
        },
        {
          id: 3,
          templateCode: 'Attendance',
          channel: 'Email',
          recipient: 'fail@test.local',
          status: 'Failed',
          displayStatus: 'Failed',
          retryCount: 3,
          maxRetries: 3,
          errorMessage: 'SMTP host missing',
          createdDate: new Date().toISOString(),
        },
      ],
    }),
  )

  await page.route('**/api/notification-templates/history**', (route) =>
    route.fulfill({
      json: [
        {
          id: 11,
          notificationType: 'Welcome',
          channel: 'Email',
          recipient: 'sent@test.local',
          status: 'Sent',
          displayStatus: 'Sent',
          errorMessage: null,
          retryCount: 0,
          createdDate: new Date().toISOString(),
          message: 'ok',
        },
        {
          id: 12,
          notificationType: 'PaymentSuccess',
          channel: 'SMS',
          recipient: '+910000000001',
          status: 'Failed',
          displayStatus: 'Failed',
          errorMessage: 'SMTP authentication failed. Check username and app password.',
          retryCount: 3,
          createdDate: new Date().toISOString(),
          message: 'fail',
        },
        {
          id: 13,
          notificationType: 'Attendance',
          channel: 'Email',
          recipient: 'skip@test.local',
          status: 'Skipped',
          displayStatus: 'Skipped',
          errorMessage: 'Member has email notifications turned off.',
          retryCount: 0,
          createdDate: new Date().toISOString(),
          message: 'skipped',
        },
      ],
    }),
  )

  await page.route('**/api/notification-templates?**', (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } }),
  )
  await page.route('**/api/notification-templates', (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } }),
  )

  let prefs = { receiveEmailNotifications: false, receiveSmsNotifications: false }
  await page.route(/\/api\/me\/notification-preferences$/i, async (route) => {
    if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() || '{}') as Partial<typeof prefs>
      prefs = {
        receiveEmailNotifications: Boolean(body.receiveEmailNotifications),
        receiveSmsNotifications: Boolean(body.receiveSmsNotifications),
      }
    }
    return route.fulfill({ json: prefs })
  })

  await page.route('**/api/me/profile', (route) =>
    route.fulfill({
      json: {
        userId: 101,
        fullName: 'Member Test',
        email: 'persona@test.local',
        phone: '9999999999',
      },
    }),
  )

  const token = fakeJwt(roles)
  const user = {
    token,
    username: 'persona@test.local',
    email: 'persona@test.local',
    fullName: 'Persona Test',
    userId: 101,
    appRoles: roles,
    permissions: ['Config', 'UsersAccess', 'Reports'].map((code, i) => ({ id: i + 1, code })),
  }
  await page.addInitScript(
    ({ token, user }) => {
      if (sessionStorage.getItem('notify-seeded')) return
      sessionStorage.setItem('notify-seeded', '1')
      localStorage.clear()
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user },
  )
}

test.describe('Notification settings @regression', () => {
  test('channel status shows disabled, unconfigured, and ready without secrets', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/settings/notifications', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Channel/i })).toBeVisible({ timeout: 45_000 })

    const email = page.getByTestId('channel-card-email')
    const sms = page.getByTestId('channel-card-sms')
    const wa = page.getByTestId('channel-card-whatsapp')
    const inapp = page.getByTestId('channel-card-inapp')
    const push = page.getByTestId('channel-card-push')

    await expect(email.getByText('Disabled', { exact: true })).toBeVisible()
    await expect(email.getByText('SMTP host missing', { exact: true })).toBeVisible()
    await expect(sms.getByText('Unconfigured', { exact: true })).toBeVisible()
    await expect(sms.getByText('SMS not configured', { exact: true })).toBeVisible()
    await expect(wa.getByText('Ready', { exact: true })).toBeVisible()
    await expect(inapp.getByText('Ready', { exact: true })).toBeVisible()
    await expect(push.getByText('Unconfigured', { exact: true })).toBeVisible()
    await expect(push.getByText('Push key missing')).toBeVisible()

    await expect(page.getByText(LEAKED_SECRET)).toHaveCount(0)
    await expect(page.getByText(LEAKED_TOKEN)).toHaveCount(0)
    await expect(page.getByText('opted in', { exact: false })).toBeVisible()
  })

  test('email settings masks password and lists blocking reasons', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/settings/email', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Email channel')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText('Disabled', { exact: true })).toBeVisible()
    await expect(page.getByTestId('email-blocking-reasons')).toContainText('SMTP host missing')
    await expect(page.getByTestId('email-password-state')).toHaveText('Password: empty.')
    await expect(page.getByText(LEAKED_SECRET)).toHaveCount(0)
  })

  test('delivery queue shows queued, retrying, sent, failed, skipped', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/settings/notification-templates', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Delivery queue' })).toBeVisible({ timeout: 45_000 })

    const queue = page.getByTestId('notification-outbox-table')
    await expect(queue.getByText('Queued', { exact: true })).toBeVisible()
    await expect(queue.getByText('Retrying', { exact: true })).toBeVisible()
    await expect(queue.getByText('Failed', { exact: true })).toBeVisible()
    await expect(queue.getByText('SMTP host missing')).toBeVisible()

    const history = page.getByTestId('notification-history-table')
    await expect(history.getByText('Sent', { exact: true })).toBeVisible()
    await expect(history.getByText('Failed', { exact: true })).toBeVisible()
    await expect(history.getByText('Skipped', { exact: true })).toBeVisible()
    await expect(history.getByText('Member has email notifications turned off.')).toBeVisible()
    await expect(page.getByText(LEAKED_SECRET)).toHaveCount(0)
    await expect(page.getByText(LEAKED_TOKEN)).toHaveCount(0)
  })

  test('member email opt-in stays off by default and can be saved', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Notification preferences' })).toBeVisible({
      timeout: 45_000,
    })
    const email = page.getByRole('checkbox', { name: /Receive email/i })
    const sms = page.getByRole('checkbox', { name: /Receive SMS/i })
    await expect(email).not.toBeChecked()
    await expect(sms).not.toBeChecked()
    await expect(page.getByText('Nothing is emailed while this is off.')).toBeVisible()
    await Promise.all([
      page.waitForResponse(
        (res) =>
          /notification-preferences/i.test(res.url()) && res.request().method() === 'PUT' && res.ok(),
      ),
      email.click(),
    ])
    await expect(email).toBeChecked()
    await expect(sms).not.toBeChecked()
  })
})
