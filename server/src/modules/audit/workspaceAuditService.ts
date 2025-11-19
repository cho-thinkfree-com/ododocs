import { z } from 'zod'
import { AuditLogService } from './auditLogService.js'
import { WorkspaceRepository } from '../workspaces/workspaceRepository.js'
import { MembershipRepository } from '../workspaces/membershipRepository.js'
import { WorkspaceAccessService } from '../workspaces/workspaceAccess.js'

const querySchema = z
  .object({
    actorMembershipId: z.string().uuid().optional(),
    actorCollaboratorId: z.string().uuid().optional(),
    entityType: z.string().optional(),
    action: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z
      .union([z.string(), z.number()])
      .transform((value) => Number(value))
      .pipe(z.number().int().min(1))
      .optional(),
    pageSize: z
      .union([z.string(), z.number()])
      .transform((value) => Number(value))
      .pipe(z.number().int().min(1).max(200))
      .optional(),
  })
  .partial()

export class WorkspaceAuditService {
  private readonly access: WorkspaceAccessService

  constructor(
    workspaceRepository: WorkspaceRepository,
    membershipRepository: MembershipRepository,
    private readonly auditLogService: AuditLogService,
  ) {
    this.access = new WorkspaceAccessService(workspaceRepository, membershipRepository)
  }

  async list(accountId: string, workspaceId: string, rawQuery: unknown) {
    await this.access.assertAdminOrOwner(accountId, workspaceId)
    const query = querySchema.parse(rawQuery ?? {})
    const entityTypes = query.entityType
      ? query.entityType
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      : undefined
    return this.auditLogService.list({
      workspaceId,
      actorMembershipId: query.actorMembershipId,
      actorCollaboratorId: query.actorCollaboratorId,
      entityTypes,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    })
  }
}
