const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...options })
  } catch {
    throw new ApiError('The Resumint API is unreachable. Check that the server is running and try again.', 'API_UNAVAILABLE')
  }
  if (response.status === 204) return null
  let body
  try { body = await response.json() } catch { body = null }
  if (!response.ok) {
    throw new ApiError(body?.error?.message || 'We could not complete that request. Please try again.', body?.error?.code || 'REQUEST_FAILED', response.status)
  }
  return body?.data
}

export function getCurrentUser() {
  return apiRequest('/auth/me')
}

export function authenticate(mode, values) {
  return apiRequest(`/auth/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
}

export function signOut() {
  return apiRequest('/auth/logout', { method: 'POST' })
}

export function updateProfile(values) {
  return apiRequest('/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
}

export function getPlan() {
  return apiRequest('/plan')
}

export function requestPlanChange(plan) {
  return apiRequest('/plan/change-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) })
}

export function getAnalyses() {
  return apiRequest('/analyses')
}

export function getResumes() {
  return apiRequest('/resumes')
}

export function getAnalysis(id) {
  return apiRequest(`/analyses/${encodeURIComponent(id)}`)
}

export function generateResumeOptimization(id) {
  return apiRequest(`/analyses/${encodeURIComponent(id)}/optimize`, { method: 'POST' })
}

export function generateCoverLetter(id) {
  return apiRequest(`/analyses/${encodeURIComponent(id)}/cover-letter`, { method: 'POST' })
}

export async function downloadPdf(path, filename, body) {
  const options = { credentials: 'include' }
  if (body) {
    options.method = 'POST'
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }
  let response
  try { response = await fetch(`${API_BASE}${path}`, options) } catch { throw new ApiError('The Resumint API is unreachable. Check your connection and try again.', 'API_UNAVAILABLE') }
  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new ApiError(result?.error?.message || 'We could not download this PDF. Please try again.', result?.error?.code || 'DOWNLOAD_FAILED', response.status)
  }
  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function submitAnalysis({ file, resumeId, jobTitle, company, jobDescription }) {
  const form = new FormData()
  if (file) form.append('resume', file)
  if (resumeId) form.append('resumeId', resumeId)
  form.append('jobTitle', jobTitle)
  form.append('company', company)
  form.append('jobDescription', jobDescription)
  return apiRequest('/analyses', { method: 'POST', body: form })
}
