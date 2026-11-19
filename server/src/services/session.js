import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from '../errors/http-error.js'

const cookieName = 'resumint_session'
const defaultSessionSeconds = 60 * 60 * 24 * 14

function signature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createSessionToken(userId, secret, now = Date.now(), sessionSeconds = defaultSessionSeconds) {
  if (!secret || secret.length < 32) {
    throw new HttpError(503, 'SESSIONS_NOT_CONFIGURED', 'Sign-in is not configured for this deployment.', { expose: true })
  }
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), exp: Math.floor(now / 1000) + sessionSeconds })).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function readSessionToken(token, secret, now = Date.now()) {
  if (!token || !secret || secret.length < 32) return null
  const [payload, suppliedSignature, extra] = token.split('.')
  if (!payload || !suppliedSignature || extra) return null
  const expected = Buffer.from(signature(payload, secret))
  const supplied = Buffer.from(suppliedSignature)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof value.sub !== 'string' || !/^[a-f\d]{24}$/i.test(value.sub) || !Number.isInteger(value.exp) || value.exp <= Math.floor(now / 1000)) return null
    return value.sub
  } catch {
    return null
  }
}

export function setSessionCookie(res, token, config, sessionSeconds = defaultSessionSeconds) {
  const secure = config.nodeEnv === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionSeconds}${secure}`)
}

export function clearSessionCookie(res, config) {
  const secure = config.nodeEnv === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
}

export function getSessionUserId(req, config) {
  const cookieHeader = req.headers.cookie || ''
  const pairs = cookieHeader.split(';').map((part) => part.trim())
  const pair = pairs.find((part) => part.startsWith(`${cookieName}=`)) || pairs.find((part) => part.startsWith('reframe_session='))
  const name = pair?.startsWith(`${cookieName}=`) ? cookieName : 'reframe_session'
  return readSessionToken(pair?.slice(name.length + 1), config.sessionSecret)
}
