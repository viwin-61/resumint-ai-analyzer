import { ObjectId } from 'mongodb'
import { getSessionUserId } from '../services/session.js'
import { getDatabase } from '../config/mongodb.js'
import { HttpError } from '../errors/http-error.js'
import { createInitialUsage, planCatalog } from '../config/plans.js'

export function createRequireAuth(databaseProvider = getDatabase) {
  return async function requireAuth(req, res, next) {
    try {
      const userId = getSessionUserId(req, req.app.locals.config)
      if (!userId) throw new HttpError(401, 'AUTH_REQUIRED', 'Sign in to continue.')
      const database = await databaseProvider(req.app.locals.config)
      let user = await database.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { passwordHash: 0, passwordSalt: 0 } })
      if (!user) throw new HttpError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.')
      const plan = planCatalog[user.subscription?.plan] ? user.subscription.plan : 'free'
      const subscription = user.subscription ? { ...user.subscription, plan, status: user.subscription.status || 'active' } : { plan, status: 'active', startedAt: user.createdAt || new Date(), billingProvider: null }
      const usage = user.usage?.periodKey ? user.usage : createInitialUsage()
      if (!user.subscription || !user.usage || !planCatalog[user.subscription.plan]) {
        await database.collection('users').updateOne({ _id: user._id }, { $set: { subscription, usage } })
        user = { ...user, subscription, usage }
      }
      req.user = user
      next()
    } catch (error) {
      next(error)
    }
  }
}
