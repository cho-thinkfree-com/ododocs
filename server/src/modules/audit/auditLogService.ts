import type { AuditActorType } from '@prisma/client'
import { AuditLogRepository, type AuditLogEntity, type AuditLogQuery } from './auditLogRepository'

export type AuditActor =
  | { type: 'membership'; membershipId: string }
  | { type: 'external'; collaboratorId: string }

export interface AuditEventInput {
  workspaceId: string
  actor: AuditActor
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  async record(input: AuditEventInput): Promise<AuditLogEntity> {
    return this.repository.create({
      workspaceId: input.workspaceId,
      actorType: input.actor.type as AuditActorType,
      actorMembershipId: input.actor.type === 'membership' ? input.actor.membershipId : null,
      actorCollaboratorId: input.actor.type === 'external' ? input.actor.collaboratorId : null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? null,
    })
  }

  list(query: AuditLogQuery) {
    return this.repository.list(query)
  }
}
