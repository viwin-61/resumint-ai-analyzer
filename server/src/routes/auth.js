import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { Router } from 'express'
import { getDatabase } from '../config/mongodb.js'
import { createInitialUsage, getPlanSnapshot } from '../config/plans.js'
import { HttpError } from '../errors/http-error.js'
import { createSessionToken, setSessionCookie } from '../services/session.js'

const scrypt = promisify(scryptCallback)
const passwordBytes = 64
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernamePattern = /^[a-z0-9_]{3,24}$/

export async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const derived = await scrypt(password, salt, passwordBytes, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return { salt, hash: Buffer.from(derived).toString('hex') }
}

function publicUser(user) {
  const name = user.fullName || user.name || ''
  return { id: String(user._id), name, fullName: name, username: user.username || '', email: user.email, subscription: getPlanSnapshot(user) }
}

function requireSessionConfiguration(config) {
  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    throw new HttpError(503, 'SESSIONS_NOT_CONFIGURED', 'Sign-in is not configured for this deployment.', { expose: true })
  }
}

function makeSession(res, user, req, rememberMe = true) {
  const maxAgeSeconds = rememberMe ? 60 * 60 * 24 * 14 : 60 * 60 * 8
  const token = createSessionToken(user._id, req.app.locals.config.sessionSecret, Date.now(), maxAgeSeconds)
  setSessionCookie(res, token, req.app.locals.config, maxAgeSeconds)
}

export function createAuthRouter({ databaseProvider = getDatabase } = {}) {
  const router = Router()

  router.post('/auth/register', async (req, res) => {
    requireSessionConfiguration(req.app.locals.config)
    const name = typeof (req.body?.fullName || req.body?.name) === 'string' ? (req.body.fullName || req.body.name).trim() : ''
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : ''
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : ''
    if (name.length < 2 || name.length > 80 || !usernamePattern.test(username) || !emailPattern.test(email) || email.length > 254 || password.length < 10 || password.length > 128 || confirmPassword !== password) {
      throw new HttpError(400, 'INVALID_SIGNUP', 'Enter your name, a username with 3–24 letters/numbers/underscores, a valid email, and matching passwords of at least 10 characters.')
    }

    const database = await databaseProvider(req.app.locals.config)
    const users = database.collection('users')
    if (await users.findOne({ email })) throw new HttpError(409, 'EMAIL_IN_USE', 'An account with this email already exists.')
    if (await users.findOne({ username })) throw new HttpError(409, 'USERNAME_IN_USE', 'That username is already in use.')

    const credentials = await hashPassword(password)
    const user = {
      fullName: name,
      name,
      username,
      email,
      passwordSalt: credentials.salt,
      passwordHash: credentials.hash,
      subscription: { plan: 'free', status: 'active', startedAt: new Date(), billingProvider: null },
      usage: createInitialUsage(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    try {
      const result = await users.insertOne(user)
      user._id = result.insertedId
    } catch (error) {
      if (error.code === 11000) throw new HttpError(409, error.keyPattern?.username ? 'USERNAME_IN_USE' : 'EMAIL_IN_USE', 'That email or username is already in use.')
      throw error
    }
    makeSession(res, user, req, true)
    res.status(201).json({ data: { user: publicUser(user) } })
  })

  router.post('/auth/login', async (req, res) => {
    requireSessionConfiguration(req.app.locals.config)
    const identifier = typeof (req.body?.identifier || req.body?.email) === 'string' ? (req.body.identifier || req.body.email).trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!identifier || identifier.length > 254 || password.length < 1 || password.length > 128) {
      throw new HttpError(400, 'INVALID_CREDENTIALS', 'Enter your username or email and password.')
    }
    const database = await databaseProvider(req.app.locals.config)
    const user = await database.collection('users').findOne({ $or: [{ email: identifier }, { username: identifier }] })
    if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Username/email or password is incorrect.')
    const candidate = Buffer.from((await hashPassword(password, user.passwordSalt)).hash, 'hex')
    const saved = Buffer.from(user.passwordHash, 'hex')
    if (candidate.length !== saved.length || !timingSafeEqual(candidate, saved)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Username/email or password is incorrect.')
    }
    makeSession(res, user, req, req.body?.rememberMe !== false)
    res.json({ data: { user: publicUser(user) } })
  })

  router.get('/auth/me', (req, res, next) => {
    req.app.locals.requireAuth(req, res, (error) => {
      if (error) return next(error)
      res.json({ data: { user: publicUser(req.user) } })
    })
  })

  router.patch('/auth/profile', (req, res, next) => {
    req.app.locals.requireAuth(req, res, async (authError) => {
      if (authError) return next(authError)
      try {
        const name = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : ''
        const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : ''
        if (name.length < 2 || name.length > 80 || !usernamePattern.test(username)) throw new HttpError(400, 'INVALID_PROFILE', 'Enter a full name and a username with 3–24 letters, numbers, or underscores.')
        const database = await databaseProvider(req.app.locals.config)
        const users = database.collection('users')
        const conflict = await users.findOne({ username })
        if (conflict && String(conflict._id) !== String(req.user._id)) throw new HttpError(409, 'USERNAME_IN_USE', 'That username is already in use.')
        await users.updateOne({ _id: req.user._id }, { $set: { fullName: name, name, username, updatedAt: new Date() } })
        const updated = { ...req.user, fullName: name, name, username, updatedAt: new Date() }
        res.json({ data: { user: publicUser(updated) } })
      } catch (error) {
        if (error.code === 11000) return next(new HttpError(409, 'USERNAME_IN_USE', 'That username is already in use.'))
        next(error)
      }
    })
  })

  router.post('/auth/logout', (req, res) => {
    const secure = req.app.locals.config.nodeEnv === 'production' ? '; Secure' : ''
    res.setHeader('Set-Cookie', [
      `resumint_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
      `reframe_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    ])
    res.status(204).end()
  })

  return router
}
