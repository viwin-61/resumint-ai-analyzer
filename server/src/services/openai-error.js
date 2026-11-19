import { HttpError } from '../errors/http-error.js'

const quotaCodePattern = /^(insufficient_quota|credit_balance_exhausted|billing_hard_limit_reached|quota_exceeded)$/i

function isQuotaExhaustion(error) {
  return [error?.code, error?.type, error?.error?.code, error?.error?.type]
    .some((value) => typeof value === 'string' && quotaCodePattern.test(value))
}

export function mapOpenAIRequestError(error, workflow = 'AI') {
  if (error instanceof HttpError) return error

  if (error?.status === 429 && isQuotaExhaustion(error)) {
    return new HttpError(503, 'AI_QUOTA_EXHAUSTED', `The ${workflow} service has reached a usage limit. Please contact support.`, { cause: error, expose: true })
  }
  if (error?.status === 429) {
    return new HttpError(503, 'AI_RATE_LIMITED', `The ${workflow} service is busy. Please try again shortly.`, { cause: error, expose: true })
  }
  if (error?.name === 'APIConnectionTimeoutError') {
    return new HttpError(504, 'AI_TIMEOUT', `The ${workflow} service took too long to finish. Please try again shortly.`, { cause: error, expose: true })
  }
  return new HttpError(502, 'AI_REQUEST_FAILED', `The ${workflow} service could not complete this request. Please try again.`, { cause: error, expose: true })
}
