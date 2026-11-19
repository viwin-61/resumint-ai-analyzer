import { MongoClient } from 'mongodb'
import { getConfig } from './env.js'
import { HttpError } from '../errors/http-error.js'

let clientPromise

export async function getDatabase(config = getConfig()) {
  if (!config.mongodbUri) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'MongoDB is not configured for this deployment.', { expose: true })
  }

  if (!clientPromise) {
    const client = new MongoClient(config.mongodbUri, {
      appName: 'resumint-resume-analyzer',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })
    clientPromise = client.connect().then(async () => {
      const database = client.db(config.mongodbDatabase)
      await Promise.all([
        database.collection('users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }),
        database.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true, name: 'users_username_unique' }),
        database.collection('analyses').createIndex({ userId: 1, createdAt: -1 }, { name: 'analyses_user_created' }),
        database.collection('resumes').createIndex({ userId: 1, updatedAt: -1 }, { name: 'resumes_user_updated' }),
        database.collection('resumes').createIndex({ userId: 1, fingerprint: 1 }, { unique: true, name: 'resumes_user_fingerprint_unique' }),
        database.collection('supportTickets').createIndex({ createdAt: -1 }, { name: 'support_tickets_created' }),
        database.collection('billingRequests').createIndex({ userId: 1, requestedAt: -1 }, { name: 'billing_requests_user_created' }),
      ])
      return client
    }).catch(async (error) => {
      clientPromise = undefined
      await client.close().catch(() => undefined)
      throw error
    })
  }

  const client = await clientPromise
  return client.db(config.mongodbDatabase)
}

export async function closeDatabase() {
  if (!clientPromise) return
  const client = await clientPromise.catch(() => undefined)
  clientPromise = undefined
  await client?.close()
}
