import { getConfig } from '../config/env.js'
import { getDatabase, closeDatabase } from '../config/mongodb.js'
import { createInitialUsage } from '../config/plans.js'
import { hashPassword } from '../routes/auth.js'

const accounts = [
  { email: 'free@resumint.example.com', username: 'resumint_free', fullName: 'Free Sample User', password: process.env.DEMO_FREE_PASSWORD, plan: 'free' },
  { email: 'basic@resumint.example.com', username: 'resumint_basic', fullName: 'Basic Sample User', password: process.env.DEMO_BASIC_PASSWORD, plan: 'basic' },
  { email: 'premium@resumint.example.com', username: 'resumint_premium', fullName: 'Premium Sample User', password: process.env.DEMO_PREMIUM_PASSWORD, plan: 'premium' },
]

const config = getConfig()
if (config.nodeEnv === 'production' || process.env.ENABLE_DEMO_ACCOUNTS !== 'true') {
  throw new Error('Demo account seeding is disabled. Use a non-production environment and set ENABLE_DEMO_ACCOUNTS=true explicitly.')
}
const missingPasswords = accounts.filter((account) => typeof account.password !== 'string' || account.password.length < 10)
if (missingPasswords.length) {
  throw new Error('Set DEMO_FREE_PASSWORD, DEMO_BASIC_PASSWORD, and DEMO_PREMIUM_PASSWORD to unique values of at least 10 characters before seeding.')
}

try {
  const database = await getDatabase(config)
  const users = database.collection('users')
  for (const account of accounts) {
    const existing = await users.findOne({ email: account.email })
    const credentials = await hashPassword(account.password)
    const now = new Date()
    const fields = {
      fullName: existing?.fullName || account.fullName,
      name: existing?.name || existing?.fullName || account.fullName,
      username: account.username,
      email: account.email,
      subscription: { ...(existing?.subscription || {}), plan: account.plan, status: 'active', startedAt: existing?.subscription?.startedAt || now, billingProvider: account.plan === 'free' ? null : 'development-seed' },
      usage: existing?.usage || createInitialUsage(),
      updatedAt: now,
    }
    Object.assign(fields, { passwordSalt: credentials.salt, passwordHash: credentials.hash })
    await users.updateOne({ email: account.email }, { $set: fields, $setOnInsert: { createdAt: now } }, { upsert: true })
  }
  console.log('Seeded 3 Resumint development accounts.')
} finally {
  await closeDatabase()
}
