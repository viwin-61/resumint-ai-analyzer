import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'
import { ObjectId } from 'mongodb'
import PDFDocument from 'pdfkit'
import { extractPdfText } from '../src/services/pdf-text.js'
import { analyzeResume } from '../src/services/openai-analysis.js'
import { optimizeResume } from '../src/services/openai-writing.js'
import { handler } from '../../netlify/functions/api.mjs'

let server
let baseUrl
const users = []
const analyses = []
const resumes = []
const supportTickets = []
const billingRequests = []

function valueAt(record, path) {
  return path.split('.').reduce((value, key) => value?.[key], record)
}

function setAt(record, path, value) {
  const keys = path.split('.')
  const last = keys.pop()
  const parent = keys.reduce((node, key) => (node[key] ??= {}), record)
  parent[last] = value
}

function matches(record, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((candidate) => matches(record, candidate))
    const actual = valueAt(record, key)
    if (expected && typeof expected === 'object' && !(expected instanceof ObjectId) && !(expected instanceof Date) && Object.keys(expected).some((item) => item.startsWith('$'))) {
      return Object.entries(expected).every(([operator, value]) => {
        if (operator === '$gte') return actual >= value
        if (operator === '$lte') return actual <= value
        if (operator === '$lt') return actual < value
        if (operator === '$gt') return actual > value
        if (operator === '$ne') return actual !== value
        return false
      })
    }
    if (key === '_id' || key === 'userId') return actual?.toString() === expected?.toString()
    return actual === expected
  })
}

const database = {
  collection(name) {
    const records = ({ users, analyses, resumes, supportTickets, billingRequests })[name]
    return {
      async findOne(query) {
        return records.find((record) => matches(record, query)) || null
      },
      async insertOne(record) {
        record._id = new ObjectId()
        records.push(record)
        return { insertedId: record._id }
      },
      async updateOne(query, update, options = {}) {
        let record = records.find((item) => matches(item, query))
        let inserted = false
        if (!record && options.upsert) {
          record = Object.fromEntries(Object.entries(query).filter(([key]) => !key.startsWith('$')))
          record._id = new ObjectId()
          records.push(record)
          inserted = true
        }
        if (record && update.$set) Object.entries(update.$set).forEach(([key, value]) => setAt(record, key, value))
        if (record && update.$setOnInsert && inserted) Object.entries(update.$setOnInsert).forEach(([key, value]) => setAt(record, key, value))
        if (record && update.$inc) Object.entries(update.$inc).forEach(([key, value]) => setAt(record, key, (valueAt(record, key) || 0) + value))
        if (record && update.$push) Object.entries(update.$push).forEach(([key, value]) => { const current = valueAt(record, key) || []; setAt(record, key, [...current, value]) })
        return { matchedCount: record ? 1 : 0 }
      },
      find(query) {
        let found = records.filter((record) => matches(record, query))
        return {
          sort(order) { const [key] = Object.keys(order); found = [...found].sort((a, b) => valueAt(b, key) - valueAt(a, key)); return this },
          limit(count) { found = found.slice(0, count); return this },
          async toArray() { return found },
        }
      },
    }
  },
}
const sampleResult = {
  matchScore: 86, atsScore: 91, strengthScore: 82,
  summary: 'Strong alignment supported by product design and research experience.',
  matchedSkills: ['Product design', 'User research'], missingSkills: ['SQL'], strengths: ['Clear impact statements'],
  skillGaps: ['Add examples of data querying'], atsIssues: [], recommendations: ['Quantify one launch outcome'],
}

function createSamplePdf() {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument()
    const chunks = []
    document.on('data', (chunk) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)
    document.fontSize(12).text('Product designer with user research, prototyping, accessibility, and cross-functional delivery experience. '.repeat(4))
    document.end()
  })
}

before(async () => {
  const app = createApp({
    config: {
      port: 0,
      nodeEnv: 'test',
      clientOrigin: 'http://localhost:5173',
      mongodbUri: '',
      mongodbDatabase: 'reframe',
      openAiApiKey: '',
      openAiModel: 'gpt-6-astra',
      sessionSecret: 'test-session-secret-with-more-than-32-characters',
      maxPdfBytes: 4 * 1024 * 1024,
    },
    services: {
      databaseProvider: async () => database,
      extractPdfText: async () => 'A product designer with experience in user research, prototyping, accessibility, and shipping measurable outcomes. '.repeat(4),
      analyzeResume: async () => sampleResult,
      optimizeResume: async () => ({ headline: 'Product designer focused on accessible workflows', professionalSummary: 'Experienced product designer with research-led practice.', bulletRewrites: [], keywordsToConsider: ['Accessibility'], accuracyNotes: ['Verify the impact statement before use.'] }),
      generateCoverLetter: async () => ({ letter: `Dear Hiring Team,\n\nI am excited to apply for this role. My background in product design and user research has helped me create thoughtful, accessible experiences with cross-functional teams. I would welcome the opportunity to bring that practice to your team and contribute to the work ahead.\n\nSincerely,\n[Your Name]` }),
    },
  })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('health endpoint reports missing external services without exposing secrets', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.data.service, 'resumint-api')
  assert.equal(body.data.status, 'degraded')
  assert.deepEqual(body.data.dependencies, { mongodb: 'missing', openai: 'missing', sessions: 'configured' })
  assert.ok(response.headers.get('x-request-id'))
  assert.equal(JSON.stringify(body).includes('replace_me'), false)
})

test('OpenAI quota exhaustion is distinguished from transient rate limiting', async () => {
  const config = { openAiApiKey: 'test-only-key', openAiModel: 'gpt-6-astra' }
  const quotaClient = { responses: { create: async () => { throw Object.assign(new Error('provider error'), { status: 429, code: 'credit_balance_exhausted', type: 'insufficient_quota' }) } } }
  const rateLimitClient = { responses: { create: async () => { throw Object.assign(new Error('provider error'), { status: 429, code: 'rate_limit_exceeded', type: 'requests' }) } } }
  const analysisInput = { config, resumeText: 'A fictional candidate with relevant skills.', jobTitle: 'Engineer', jobDescription: 'A role requiring relevant engineering experience.', openAiClient: quotaClient }

  await assert.rejects(() => analyzeResume(analysisInput), (error) => error.code === 'AI_QUOTA_EXHAUSTED' && error.status === 503)
  await assert.rejects(() => optimizeResume({ ...analysisInput, analysis: { matchScore: 80, missingSkills: [] } }), (error) => error.code === 'AI_QUOTA_EXHAUSTED' && error.status === 503)
  await assert.rejects(() => analyzeResume({ ...analysisInput, openAiClient: rateLimitClient }), (error) => error.code === 'AI_RATE_LIMITED' && error.status === 503)
})

test('unknown routes return a stable JSON error envelope', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`)
  const body = await response.json()

  assert.equal(response.status, 404)
  assert.equal(body.error.code, 'ROUTE_NOT_FOUND')
  assert.ok(body.error.requestId)
})

test('oversized JSON requests return a stable client error', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'taylor@example.com', password: 'x'.repeat(70 * 1024) }),
  })
  const body = await response.json()
  assert.equal(response.status, 413)
  assert.equal(body.error.code, 'REQUEST_TOO_LARGE')
})

test('unapproved browser origins are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://not-allowed.example' } })
  const body = await response.json()

  assert.equal(response.status, 403)
  assert.equal(body.error.code, 'CORS_ORIGIN_NOT_ALLOWED')
})

test('Netlify adapter forwards API requests to the shared Express app', async () => {
  const result = await handler({
    httpMethod: 'GET',
    path: '/api/health',
    headers: { host: 'reframe.example.netlify.app' },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
  }, {})

  assert.equal(result.statusCode, 200)
  assert.equal(JSON.parse(result.body).data.service, 'resumint-api')
})

test('registration validates fields and requires a session secret', async () => {
  const invalid = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'A', username: 'x', email: 'not-an-email', password: 'short', confirmPassword: 'short' }),
  })
  assert.equal(invalid.status, 400)
  assert.equal((await invalid.json()).error.code, 'INVALID_SIGNUP')

  const unauthorized = await fetch(`${baseUrl}/api/analyses`)
  assert.equal(unauthorized.status, 401)
  assert.equal((await unauthorized.json()).error.code, 'AUTH_REQUIRED')
})

test('a signed-in user can analyze a PDF and only sees their own history', async () => {
  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Taylor Chen', username: 'taylorchen', email: 'taylor@example.com', password: 'a-secure-test-passphrase', confirmPassword: 'a-secure-test-passphrase' }),
  })
  assert.equal(register.status, 201)
  const cookie = register.headers.get('set-cookie').split(';')[0]
  assert.match(register.headers.get('set-cookie'), /HttpOnly/)

  const form = new FormData()
  form.append('resume', new Blob(['%PDF-1.4 fake resume content'], { type: 'application/pdf' }), 'resume.pdf')
  form.append('jobTitle', 'Product Designer')
  form.append('company', 'Northstar Studio')
  form.append('jobDescription', 'We are looking for a product designer with user research, prototyping, accessibility, and cross-functional collaboration experience. '.repeat(2))
  const response = await fetch(`${baseUrl}/api/analyses`, { method: 'POST', headers: { Cookie: cookie }, body: form })
  const body = await response.json()
  assert.equal(response.status, 201)
  assert.equal(body.data.analysis.matchScore, 86)
  assert.equal('resumeText' in body.data.analysis, false)
  assert.ok(body.data.analysis.resumeId)

  const resumeList = await fetch(`${baseUrl}/api/resumes`, { headers: { Cookie: cookie } })
  assert.equal((await resumeList.json()).data.resumes.length, 1)
  const secondForm = new FormData()
  secondForm.append('resumeId', body.data.analysis.resumeId)
  secondForm.append('jobTitle', 'Product Designer II')
  secondForm.append('jobDescription', 'We need a product designer with research, prototyping, accessibility, and cross-functional collaboration experience. '.repeat(2))
  const secondAnalysis = await fetch(`${baseUrl}/api/analyses`, { method: 'POST', headers: { Cookie: cookie }, body: secondForm })
  assert.equal(secondAnalysis.status, 201)
  const overLimit = await fetch(`${baseUrl}/api/analyses`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeId: body.data.analysis.resumeId, jobTitle: 'Third role', jobDescription: 'We need a product designer with research, prototyping, accessibility, and cross-functional collaboration experience. '.repeat(2) }) })
  assert.equal(overLimit.status, 403)
  assert.equal((await overLimit.json()).error.code, 'PLAN_LIMIT_REACHED')

  const history = await fetch(`${baseUrl}/api/analyses`, { headers: { Cookie: cookie } })
  assert.equal((await history.json()).data.analyses.length, 2)

  const other = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Morgan Lee', username: 'morganlee', email: 'morgan@example.com', password: 'another-secure-passphrase', confirmPassword: 'another-secure-passphrase' }),
  })
  const otherCookie = other.headers.get('set-cookie').split(';')[0]
  const privateRecord = await fetch(`${baseUrl}/api/analyses/${body.data.analysis.id}`, { headers: { Cookie: otherCookie } })
  assert.equal(privateRecord.status, 404)

  const changedProfile = await fetch(`${baseUrl}/api/auth/profile`, { method: 'PATCH', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'Taylor Updated', username: 'taylor_updated' }) })
  assert.equal(changedProfile.status, 200)
  assert.equal((await changedProfile.json()).data.user.name, 'Taylor Updated')
  const otherProfile = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: otherCookie } })
  assert.equal((await otherProfile.json()).data.user.name, 'Morgan Lee')

  const planRequest = await fetch(`${baseUrl}/api/plan/change-request`, { method: 'POST', headers: { Cookie: otherCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'basic' }) })
  assert.equal(planRequest.status, 202)
  assert.equal((await planRequest.json()).data.activated, false)
  const stillFree = await fetch(`${baseUrl}/api/plan`, { headers: { Cookie: otherCookie } })
  assert.equal((await stillFree.json()).data.subscription.plan, 'free')
})

test('upload endpoint rejects non-PDF files before analysis', async () => {
  const cookie = (await users[0]) && (await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'taylor_updated', password: 'a-secure-test-passphrase', rememberMe: false }),
  })).headers.get('set-cookie').split(';')[0]
  const form = new FormData()
  form.append('resume', new Blob(['plain text'], { type: 'text/plain' }), 'resume.txt')
  form.append('jobTitle', 'Product Designer')
  form.append('jobDescription', 'A valid job description with enough detail that would otherwise pass the request field checks. '.repeat(2))
  const response = await fetch(`${baseUrl}/api/analyses`, { method: 'POST', headers: { Cookie: cookie }, body: form })
  assert.equal(response.status, 415)
  assert.equal((await response.json()).error.code, 'PDF_REQUIRED')
})

test('PDF extraction reads text from a generated PDF document', async () => {
  const text = await extractPdfText(await createSamplePdf())
  assert.match(text, /Product designer with user research/)
  assert.ok(text.length > 200)
})

test('resume optimization, cover letters, and private PDF reports use saved analysis data', async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'taylor_updated', password: 'a-secure-test-passphrase', rememberMe: true }),
  })
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const history = await fetch(`${baseUrl}/api/analyses`, { headers: { Cookie: cookie } })
  const analysisId = (await history.json()).data.analyses[0].id

  const freeLetter = await fetch(`${baseUrl}/api/analyses/${analysisId}/cover-letter`, { method: 'POST', headers: { Cookie: cookie } })
  assert.equal(freeLetter.status, 403)
  const freeReport = await fetch(`${baseUrl}/api/analyses/${analysisId}/report.pdf`, { headers: { Cookie: cookie } })
  assert.equal(freeReport.status, 403)

  const taylor = users.find((user) => user.email === 'taylor@example.com')
  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
  taylor.subscription.plan = 'premium'
  taylor.usage = { periodKey: period, analyses: 2, uploads: 1, optimizations: 0, coverLetters: 0, pdfReports: 0 }

  const optimization = await fetch(`${baseUrl}/api/analyses/${analysisId}/optimize`, { method: 'POST', headers: { Cookie: cookie } })
  assert.equal(optimization.status, 200)
  assert.equal((await optimization.json()).data.optimization.keywordsToConsider[0], 'Accessibility')

  const letter = await fetch(`${baseUrl}/api/analyses/${analysisId}/cover-letter`, { method: 'POST', headers: { Cookie: cookie } })
  assert.equal(letter.status, 200)
  assert.match((await letter.json()).data.coverLetter.letter, /Hiring Team/)

  const report = await fetch(`${baseUrl}/api/analyses/${analysisId}/report.pdf`, { headers: { Cookie: cookie } })
  assert.equal(report.status, 200)
  assert.equal(report.headers.get('content-type'), 'application/pdf')
  assert.equal(Buffer.from(await report.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')

  const coverPdf = await fetch(`${baseUrl}/api/analyses/${analysisId}/cover-letter.pdf`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ letter: `Dear Hiring Team,\n\nThis is an edited draft that is long enough to be turned into a reviewable cover letter PDF. My product design and research experience helps me contribute thoughtfully to accessible products and cross-functional work. I would love to learn more about your priorities and share how I could support your team.\n\nSincerely,\n[Your Name]` }) })
  assert.equal(coverPdf.status, 200)
  assert.equal(Buffer.from(await coverPdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')
})

test('support endpoint validates and stores a support request attachment', async () => {
  const form = new FormData()
  form.append('fullName', 'Riya Support')
  form.append('email', 'riya@example.com')
  form.append('category', 'resume-upload')
  form.append('subject', 'I need help with a resume')
  form.append('message', 'I uploaded my resume and need help understanding the extracted text in my analysis.')
  form.append('attachment', new Blob([await createSamplePdf()], { type: 'application/pdf' }), 'resume-help.pdf')
  const response = await fetch(`${baseUrl}/api/support`, { method: 'POST', body: form })
  assert.equal(response.status, 201)
  assert.equal((await response.json()).data.status, 'received')
  assert.equal(supportTickets.length, 1)
  assert.equal(supportTickets[0].attachment.filename, 'resume-help.pdf')
  assert.ok(Buffer.isBuffer(supportTickets[0].attachment.content))

  const invalid = await fetch(`${baseUrl}/api/support`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'A', email: 'bad', category: 'other', subject: 'no', message: 'short' }) })
  assert.equal(invalid.status, 400)
})

test('Basic and Premium limits are reported and enforced by protected API routes', async () => {
  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`
  for (const plan of [
    { id: 'basic', email: 'basic-limits@example.com', username: 'basiclimits', limits: { analyses: 15, uploads: 5, optimizations: 10, coverLetters: 5, pdfReports: 5 } },
    { id: 'premium', email: 'premium-limits@example.com', username: 'premiumlimits', limits: { analyses: 50, uploads: 20, optimizations: 30, coverLetters: 20, pdfReports: 30 } },
  ]) {
    const register = await fetch(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'Plan Test User', username: plan.username, email: plan.email, password: 'a-plan-test-password', confirmPassword: 'a-plan-test-password' }) })
    const cookie = register.headers.get('set-cookie').split(';')[0]
    const account = users.find((user) => user.email === plan.email)
    account.subscription.plan = plan.id
    account.usage = { periodKey: period, analyses: plan.limits.analyses, uploads: plan.limits.uploads, optimizations: plan.limits.optimizations, coverLetters: plan.limits.coverLetters, pdfReports: plan.limits.pdfReports }

    const planResponse = await fetch(`${baseUrl}/api/plan`, { headers: { Cookie: cookie } })
    const snapshot = (await planResponse.json()).data.subscription
    assert.equal(snapshot.plan, plan.id)
    assert.equal(snapshot.limits.analyses, plan.limits.analyses)
    assert.equal(snapshot.limits.pdfReports, plan.limits.pdfReports)
    assert.equal(snapshot.remaining.analyses, 0)

    const resumeId = new ObjectId()
    await database.collection('resumes').insertOne({ _id: resumeId, userId: account._id, name: 'Saved resume.pdf', resumeText: 'Professional resume text '.repeat(20), createdAt: new Date(), updatedAt: new Date() })
    const analysis = await database.collection('analyses').insertOne({ userId: account._id, resumeId, resumeText: 'Professional resume text '.repeat(20), jobTitle: 'Designer', company: 'Example', jobDescription: 'Role details '.repeat(20), matchScore: 85, atsScore: 88, strengthScore: 80, summary: 'Test', matchedSkills: [], missingSkills: [], strengths: [], skillGaps: [], atsIssues: [], recommendations: [], createdAt: new Date() })
    const analysisId = String(analysis.insertedId)
    const blockedAnalysis = await fetch(`${baseUrl}/api/analyses`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeId: String(resumeId), jobTitle: 'Product Designer', jobDescription: 'We need a designer with strong collaboration and product skills. '.repeat(2) }) })
    assert.equal(blockedAnalysis.status, 403)
    const blockedOptimizer = await fetch(`${baseUrl}/api/analyses/${analysisId}/optimize`, { method: 'POST', headers: { Cookie: cookie } })
    assert.equal(blockedOptimizer.status, 403)
    const blockedLetter = await fetch(`${baseUrl}/api/analyses/${analysisId}/cover-letter`, { method: 'POST', headers: { Cookie: cookie } })
    assert.equal(blockedLetter.status, 403)
    const blockedReport = await fetch(`${baseUrl}/api/analyses/${analysisId}/report.pdf`, { headers: { Cookie: cookie } })
    assert.equal(blockedReport.status, 403)

    const uploadForm = new FormData()
    uploadForm.append('resume', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'another-resume.pdf')
    const blockedUpload = await fetch(`${baseUrl}/api/resumes`, { method: 'POST', headers: { Cookie: cookie }, body: uploadForm })
    assert.equal(blockedUpload.status, 403)
  }
})
