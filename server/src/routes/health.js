import { Router } from 'express'
import { getServiceReadiness } from '../config/env.js'

export function createHealthRouter(config) {
  const healthRouter = Router()

  healthRouter.get('/health', (req, res) => {
    const readiness = getServiceReadiness(config)
    const ready = Object.values(readiness).every((value) => value === 'configured')

    res.status(200).json({
      data: {
        service: 'resumint-api',
        status: ready ? 'ready' : 'degraded',
        dependencies: readiness,
        requestId: req.requestId,
      },
    })
  })

  return healthRouter
}
