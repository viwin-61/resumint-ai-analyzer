import { expect, test } from '@playwright/test'

const sampleAnalysis = {
  id: '64b000000000000000000001',
  resumeId: '64b000000000000000000011',
  createdAt: '2026-11-18T10:42:00.000Z',
  jobTitle: 'Product Designer',
  company: 'Northstar Studio',
  resumeName: 'jordan-lee-resume.pdf',
  matchScore: 86,
  atsScore: 91,
  strengthScore: 82,
  summary: 'Strong alignment supported by product design and research experience.',
  matchedSkills: ['Product design', 'User research'],
  missingSkills: ['SQL'],
  strengths: ['Clear impact statements'],
  skillGaps: ['Add examples of data querying'],
  atsIssues: [],
  recommendations: ['Quantify one launch outcome'],
}

const freeSubscription = {
  plan: 'free', name: 'Free', priceInr: 0, status: 'active', periodKey: '2026-11',
  usage: { analyses: 0, uploads: 0, optimizations: 0, coverLetters: 0, pdfReports: 0 },
  limits: { analyses: 2, uploads: 1, optimizations: 3, coverLetters: 0, pdfReports: 0 },
  remaining: { analyses: 2, uploads: 1, optimizations: 3, coverLetters: 0, pdfReports: 0 },
}

const signedInUser = { id: '64b000000000000000000002', name: 'Taylor Chen', fullName: 'Taylor Chen', username: 'taylorchen', email: 'taylor@example.com', subscription: freeSubscription }

async function mockSignedInWorkspace(page, { analyses = [], resumes = [] } = {}) {
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { data: { user: signedInUser } } }))
  await page.route('**/api/analyses**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: { analyses } } })
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { data: { analysis: sampleAnalysis, subscription: freeSubscription } } })
    return route.continue()
  })
  await page.route('**/api/resumes**', (route) => route.fulfill({ json: { data: { resumes } } }))
}

test('public pages show Resumint branding and the four-column footer', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } } }))
  await page.goto('/')

  await expect(page).toHaveTitle(/Resumint/)
  await expect(page.getByRole('heading', { name: /Your Resume.*Smarter.*Stronger/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'About' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get started free' }).first()).toBeVisible()
  await expect(page.locator('.footer-grid section')).toHaveCount(4)
  await expect(page.getByText('© 2026 Resumint. All rights reserved.')).toBeVisible()
  await page.getByRole('link', { name: 'Support', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: /Let’s figure it out/ })).toBeVisible()
  await expect(page.locator('#contact')).toBeVisible()
})

test('registration captures profile fields and loads a protected dashboard', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } } }))
  await page.route('**/api/auth/register', (route) => route.fulfill({ status: 201, json: { data: { user: signedInUser } } }))
  await page.route('**/api/analyses**', (route) => route.fulfill({ json: { data: { analyses: [] } } }))
  await page.route('**/api/resumes**', (route) => route.fulfill({ json: { data: { resumes: [] } } }))
  await page.goto('/register')

  await page.getByLabel('Full name').fill('Taylor Chen')
  await page.getByLabel('Username').fill('taylorchen')
  await page.getByLabel('Email address').fill('taylor@example.com')
  await page.getByLabel('Password', { exact: true }).fill('a-secure-test-passphrase')
  await page.getByLabel('Confirm password').fill('a-secure-test-passphrase')
  await page.getByRole('button', { name: 'Create my account' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.getByRole('heading', { name: 'Welcome, Taylor Chen!' })).toBeVisible()
  await expect(page.locator('.metric-card')).toHaveCount(3)
  await expect(page.locator('.performance-chart, .strength-card, .tip-card')).toHaveCount(0)
})

test('analyzes a PDF from the dashboard and displays the structured report', async ({ page }) => {
  await mockSignedInWorkspace(page)
  await page.goto('/dashboard')
  await page.getByLabel('Choose resume PDF').setInputFiles({ name: 'jordan-lee-resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% test resume') })
  await page.getByLabel('Job title').fill('Product Designer')
  await page.getByLabel('Company').fill('Northstar Studio')
  await page.getByLabel('Job description').fill('We are looking for a product designer with research, prototyping, accessibility, and cross-functional collaboration experience. The role owns product outcomes from discovery through launch.')
  await page.getByRole('button', { name: 'Analyze resume' }).click()

  await expect(page.getByRole('heading', { name: 'Product Designer' })).toBeVisible()
  await expect(page.getByText('Strong alignment supported by product design and research experience.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recommended next steps' })).toBeVisible()
})

test('sample ATS results stay separate from the account history and stats', async ({ page }) => {
  await mockSignedInWorkspace(page)
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Try sample resume' }).click()
  await expect(page.getByText('Sample Analysis')).toBeVisible()
  await expect(page.getByText('Sample ATS score')).toBeVisible()
  await expect(page.locator('.metric-card').first()).toContainText('0')
  await expect(page.locator('.account-recent')).toContainText('0')
  const response = await page.request.get('/sample-ats-resume.pdf')
  expect(response.ok()).toBeTruthy()
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-')
})

test('logout returns to login and direct dashboard visits require a session', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } } }))
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/login/)
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
})

test('signed-in users can log out from the dashboard sidebar', async ({ page }) => {
  await mockSignedInWorkspace(page)
  await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/login/)
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
})

test('theme persists and the public navigation fits mobile screens', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: { error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/)
  const currentTheme = await page.locator('html').getAttribute('data-theme')
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
  await page.getByRole('button', { name: `Switch to ${nextTheme} mode` }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'About', exact: true }).click()
  await expect(page.getByRole('heading', { name: /A little more clarity/ })).toBeVisible()
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }))
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport)
})
