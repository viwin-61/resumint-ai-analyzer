import { createApp } from './app.js'
import { getConfig } from './config/env.js'
import { closeDatabase } from './config/mongodb.js'

const config = getConfig()
const app = createApp({ config })
const server = app.listen(config.port, () => {
  console.log(`Resumint API listening on http://localhost:${config.port}`)
})

async function shutdown(signal) {
  console.log(`${signal} received; closing API server.`)
  server.close(async () => {
    await closeDatabase().catch((error) => console.error('MongoDB shutdown failed:', error.message))
    process.exit(0)
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
