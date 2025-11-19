import 'fastify'
import type { DatabaseClient } from '../lib/prismaClient.js'

declare module 'fastify' {
  interface FastifyRequest {
    accountId?: string
    sessionId?: string
    db?: DatabaseClient
    startTime?: number
  }
}
