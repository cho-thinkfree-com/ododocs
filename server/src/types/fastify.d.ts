import 'fastify'
import type { DatabaseClient } from '../lib/prismaClient'

declare module 'fastify' {
  interface FastifyRequest {
    accountId?: string
    sessionId?: string
    db?: DatabaseClient
    startTime?: number
  }
}
