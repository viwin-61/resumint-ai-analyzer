export const planCatalog = Object.freeze({
  free: Object.freeze({ name: 'Free', priceInr: 0, limits: Object.freeze({ analyses: 2, uploads: 1, optimizations: 3, coverLetters: 0, pdfReports: 0, historyDays: 7, historyCount: 5 }) }),
  basic: Object.freeze({ name: 'Basic', priceInr: 150, limits: Object.freeze({ analyses: 15, uploads: 5, optimizations: 10, coverLetters: 5, pdfReports: 5, historyDays: 30, historyCount: Infinity }) }),
  premium: Object.freeze({ name: 'Premium', priceInr: 299, limits: Object.freeze({ analyses: 50, uploads: 20, optimizations: 30, coverLetters: 20, pdfReports: 30, historyDays: Infinity, historyCount: Infinity }) }),
})

export const usageFields = Object.freeze({
  analyses: 'analyses',
  uploads: 'uploads',
  optimizations: 'optimizations',
  coverLetters: 'coverLetters',
  pdfReports: 'pdfReports',
})

export function currentUsagePeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function createInitialUsage(periodKey = currentUsagePeriod()) {
  return { periodKey, analyses: 0, uploads: 0, optimizations: 0, coverLetters: 0, pdfReports: 0 }
}

export function getPlan(plan = 'free') {
  return planCatalog[planCatalog[plan] ? plan : 'free']
}

export function getPlanSnapshot(user) {
  const planKey = planCatalog[user?.subscription?.plan] ? user.subscription.plan : 'free'
  const plan = getPlan(planKey)
  const usage = user?.usage?.periodKey === currentUsagePeriod() ? user.usage : createInitialUsage()
  const remaining = Object.fromEntries(Object.entries(plan.limits).filter(([key]) => usageFields[key]).map(([key, limit]) => [key, Math.max(0, limit - (usage[key] || 0))]))
  return { plan: planKey, name: plan.name, priceInr: plan.priceInr, status: user?.subscription?.status || 'active', usage, limits: plan.limits, remaining, periodKey: currentUsagePeriod() }
}

export async function ensureCurrentUsage(database, user) {
  const periodKey = currentUsagePeriod()
  if (user.usage?.periodKey === periodKey) return user
  const usage = createInitialUsage(periodKey)
  await database.collection('users').updateOne({ _id: user._id, 'usage.periodKey': { $ne: periodKey } }, { $set: { usage } })
  return await database.collection('users').findOne({ _id: user._id }) || { ...user, usage }
}

export async function reserveUsage(database, user, action, count = 1) {
  const field = usageFields[action]
  if (!field) throw new Error(`Unknown usage action: ${action}`)
  const plan = getPlan(user.subscription?.plan)
  const limit = plan.limits[action]
  const current = await ensureCurrentUsage(database, user)
  if (!Number.isFinite(limit) || count < 1) return { user: current, reserved: false }
  const collection = database.collection('users')
  const result = await collection.updateOne(
    { _id: user._id, 'subscription.plan': user.subscription?.plan || 'free', 'subscription.status': 'active', 'usage.periodKey': currentUsagePeriod(), [`usage.${field}`]: { $lte: limit - count } },
    { $inc: { [`usage.${field}`]: count } },
  )
  if (!result.matchedCount) {
    const latest = await collection.findOne({ _id: user._id })
    const used = latest?.usage?.[field] || 0
    throw Object.assign(new Error(`You’ve reached your ${plan.name} plan limit (${used}/${limit} ${action} this month).`), { status: 403, code: 'PLAN_LIMIT_REACHED', limit, used, action })
  }
  return { user: current, reserved: true }
}

export async function releaseUsage(database, user, action, count = 1) {
  const field = usageFields[action]
  if (field) await database.collection('users').updateOne({ _id: user._id, 'usage.periodKey': currentUsagePeriod(), [`usage.${field}`]: { $gte: count } }, { $inc: { [`usage.${field}`]: -count } })
}
