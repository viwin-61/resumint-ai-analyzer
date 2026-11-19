import { Router } from 'express'
import { getDatabase } from '../config/mongodb.js'
import { getPlanSnapshot, planCatalog } from '../config/plans.js'
import { HttpError } from '../errors/http-error.js'
import { createRequireAuth } from '../middleware/require-auth.js'

export function createPlansRouter({ databaseProvider = getDatabase, requireAuth = createRequireAuth(databaseProvider) } = {}) {
  const router = Router()
  router.get('/plans', (req, res) => {
    res.json({ data: { plans: Object.entries(planCatalog).map(([key, plan]) => ({ id: key, ...plan })) } })
  })
  router.get('/plan', requireAuth, async (req, res) => {
    const database = await databaseProvider(req.app.locals.config)
    const user = await database.collection('users').findOne({ _id: req.user._id })
    res.json({ data: { subscription: getPlanSnapshot(user || req.user), requests: user?.subscription?.requests || [] } })
  })
  router.post('/plan/change-request', requireAuth, async (req, res) => {
    const desiredPlan = typeof req.body?.plan === 'string' ? req.body.plan.toLowerCase() : ''
    if (!planCatalog[desiredPlan]) throw new HttpError(400, 'INVALID_PLAN', 'Choose Free, Basic, or Premium.')
    const database = await databaseProvider(req.app.locals.config)
    const users = database.collection('users')
    const user = await users.findOne({ _id: req.user._id })
    if (!user) throw new HttpError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.')
    const currentPlan = planCatalog[user.subscription?.plan] ? user.subscription.plan : 'free'
    if (currentPlan === desiredPlan) throw new HttpError(409, 'PLAN_ALREADY_ACTIVE', 'That plan is already active on your account.')

    if (desiredPlan === 'free') {
      const subscription = { ...user.subscription, plan: 'free', status: 'active', startedAt: new Date(), billingProvider: null, updatedAt: new Date() }
      await users.updateOne({ _id: req.user._id }, { $set: { subscription } })
      return res.json({ data: { subscription: getPlanSnapshot({ ...user, subscription }), activated: true } })
    }

    const request = { plan: desiredPlan, status: 'pending-payment-setup', requestedAt: new Date(), priceInr: planCatalog[desiredPlan].priceInr }
    await database.collection('billingRequests').insertOne({ userId: req.user._id, ...request })
    await users.updateOne({ _id: req.user._id }, { $push: { 'subscription.requests': request } })
    res.status(202).json({ data: { subscription: getPlanSnapshot(user), request, activated: false } })
  })
  return router
}
