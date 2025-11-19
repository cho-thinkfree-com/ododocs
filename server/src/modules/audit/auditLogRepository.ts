import type { AuditActorType, AuditLog as AuditLogModel } from '@prisma/client'
import type { DatabaseClient } from '../../lib/prismaClient.js'

export interface AuditLogEntity {
  id: string
  workspaceId: string
  actorType: AuditActorType
  actorMembershipId?: string | null
  actorCollaboratorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

export interface AuditLogCreateInput {
  workspaceId: string
  actorType: AuditActorType
  actorMembershipId?: string | null
  actorCollaboratorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

export interface AuditLogQuery {
  workspaceId: string
  actorMembershipId?: string
  actorCollaboratorId?: string
  entityType?: string
  entityTypes?: string[]
  action?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export class AuditLogRepository {
  constructor(private readonly prisma: DatabaseClient) { }

  async create(input: AuditLogCreateInput): Promise<AuditLogEntity> {
    const log = await this.prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorType: input.actorType,
        actorMembershipId: input.actorMembershipId ?? null,
        actorCollaboratorId: input.actorCollaboratorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? null) as any,
      },
    })
    return toEntity(log)
  }

  async list(query: AuditLogQuery) {
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? 50, 200)
    const entityTypeFilter =
      query.entityTypes && query.entityTypes.length > 0
        ? { in: query.entityTypes }
        : query.entityType ?? undefined

    const logs = await this.prisma.auditLog.findMany({
      where: {
        workspaceId: query.workspaceId,
        actorMembershipId: query.actorMembershipId,
        actorCollaboratorId: query.actorCollaboratorId,
        entityType: entityTypeFilter,
        action: query.action,
        createdAt: {
          gte: query.from,
          lte: query.to,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    })
    const hasNextPage = logs.length > pageSize
    const trimmed = hasNextPage ? logs.slice(0, pageSize) : logs
    return {
      logs: trimmed.map(toEntity),
      page,
      pageSize,
      hasNextPage,
    }
  }
}

const toEntity = (log: AuditLogModel): AuditLogEntity => ({
  id: log.id,
  workspaceId: log.workspaceId,
  actorType: log.actorType,
  actorMembershipId: log.actorMembershipId,
  actorCollaboratorId: log.actorCollaboratorId,
  action: log.action,
  entityType: log.entityType,
  entityId: log.entityId,
  metadata: (log.metadata as Record<string, unknown> | null) ?? null,
  createdAt: log.createdAt,
})
