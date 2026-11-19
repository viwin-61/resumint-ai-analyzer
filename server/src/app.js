import express from 'express'
import helmet from 'helmet'
import { getConfig } from './config/env.js'
import { errorHandler, notFound } from './middleware/error-handler.js'
import { requestId } from './middleware/request-id.js'
import { createHealthRouter } from './routes/health.js'
import { HttpError } from './errors/http-error.js'
import { createAuthRouter } from './routes/auth.js'
import { createAnalysesRouter } from './routes/analyses.js'
import { createPlansRouter } from './routes/plans.js'
import { createSupportRouter } from './routes/support.js'
import { createResumesRouter } from './routes/resumes.js'
import { getDatabase } from './config/mongodb.js'
import { createRequireAuth } from './middleware/require-auth.js'

export function createApp({ config = getConfig(), services = {} } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.locals.config = config
  const databaseProvider = services.databaseProvider || getDatabase
  const requireAuth = createRequireAuth(databaseProvider)
  app.locals.requireAuth = requireAuth

  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(requestId)
  app.use((req, res, next) => {
    const origin = req.get('origin')
    if (!origin) return next()

    const allowedOrigins = new Set([config.clientOrigin])
    if (config.nodeEnv !== 'production') {
      try {
        const clientUrl = new URL(config.clientOrigin)
        clientUrl.hostname = clientUrl.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
        allowedOrigins.add(clientUrl.origin)
      } catch {
        return next(new HttpError(500, 'INVALID_CLIENT_ORIGIN', 'CLIENT_ORIGIN must be a valid HTTP origin.', { expose: false }))
      }
    }

    let sameOrigin = false
    try {
      sameOrigin = new URL(origin).host === req.get('host')
    } catch {
      return next(new HttpError(403, 'CORS_ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'))
    }

    if (!allowedOrigins.has(origin) && !sameOrigin) {
      return next(new HttpError(403, 'CORS_ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'))
    }

    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  app.use(express.json({ limit: '64kb' }))

  app.get('/api', (req, res) => res.json({ data: { service: 'resumint-api', requestId: req.requestId } }))
  app.use('/api', createHealthRouter(config))
  app.use('/api', createAuthRouter({ databaseProvider }))
  app.use('/api', createPlansRouter({ databaseProvider, requireAuth }))
  app.use('/api', createSupportRouter({ databaseProvider }))
  app.use('/api/resumes', createResumesRouter({ databaseProvider, extractPdfText: services.extractPdfText, requireAuth, maxPdfBytes: config.maxPdfBytes }))
  app.use('/api/analyses', createAnalysesRouter({
    databaseProvider,
    analyze: services.analyzeResume,
    extractPdfText: services.extractPdfText,
    optimize: services.optimizeResume,
    generateLetter: services.generateCoverLetter,
    requireAuth,
    maxPdfBytes: config.maxPdfBytes,
  }))

  app.use(notFound)
  app.use((error, req, res, next) => {
    if (error?.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'PDF_TOO_LARGE', 'This PDF is too large. Please choose a file under 4 MB.'))
      return next(new HttpError(400, 'UPLOAD_INVALID', 'The upload did not match the expected resume fields.'))
    }
    if (error.type === 'entity.too.large') {
      return next(new HttpError(413, 'REQUEST_TOO_LARGE', 'The request body is too large.'))
    }
    if (error.type === 'entity.parse.failed') {
      return next(new HttpError(400, 'INVALID_JSON', 'Request body must contain valid JSON.'))
    }
    next(error)
  })
  app.use(errorHandler)

  return app
}
