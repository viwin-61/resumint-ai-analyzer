const defaultOrigin = 'http://localhost:5173'

export function getConfig(env = process.env) {
  const port = Number.parseInt(env.PORT || '4000', 10)
  const maxPdfBytes = Number.parseInt(env.MAX_PDF_BYTES || String(4 * 1024 * 1024), 10)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.')
  }
  if (!Number.isInteger(maxPdfBytes) || maxPdfBytes < 1024 || maxPdfBytes > 4 * 1024 * 1024) {
    throw new Error('MAX_PDF_BYTES must be between 1 KB and 4 MB to fit the Netlify request limit.')
  }

  return Object.freeze({
    port,
    nodeEnv: env.NODE_ENV || 'development',
    clientOrigin: env.CLIENT_ORIGIN || defaultOrigin,
    mongodbUri: env.MONGODB_URI || '',
    mongodbDatabase: env.MONGODB_DATABASE || 'reframe',
    openAiApiKey: env.OPENAI_API_KEY || '',
    openAiModel: env.OPENAI_MODEL || 'gpt-6-astra',
    sessionSecret: env.SESSION_SECRET || '',
    maxPdfBytes,
  })
}

export function getServiceReadiness(config = getConfig()) {
  return {
    mongodb: config.mongodbUri ? 'configured' : 'missing',
    openai: config.openAiApiKey ? 'configured' : 'missing',
    sessions: config.sessionSecret.length >= 32 ? 'configured' : 'missing',
  }
}
