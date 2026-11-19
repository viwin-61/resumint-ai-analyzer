import { HttpError } from '../errors/http-error.js'

export function notFound(req, res, next) {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'The requested route was not found.'))
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)

  const status = Number.isInteger(error.status) ? error.status : 500
  const code = typeof error.code === 'string' ? error.code : 'INTERNAL_ERROR'
  const expose = error.expose === true || status < 500
  const message = expose ? error.message : 'Something went wrong. Please try again.'

  if (status >= 500) {
    const errorMessage = error instanceof TypeError
      ? String(error.message || '').replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted MongoDB URI]').slice(0, 240)
      : undefined
    console.error(JSON.stringify({ requestId: req.requestId, code, errorType: error.name || 'Error', ...(errorMessage ? { errorMessage } : {}) }))
  }

  res.status(status).json({
    error: {
      code,
      message,
      requestId: req.requestId,
    },
  })
}
