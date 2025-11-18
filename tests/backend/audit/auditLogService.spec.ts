import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { createPrismaClient } from '../../../server/src/lib/prismaClient'
import { createTestDatabase } from '../support/testDatabase'
import { WorkspaceRepository } from '../../../server/src/modules/workspaces/workspaceRepository'
import { WorkspaceService } from '../../../server/src/modules/workspaces/workspaceService'
import { WorkspaceAccessService } from '../../../server/src/modules/workspaces/workspaceAccess'
import { PrismaAccountRepository } from '../../../server/src/modules/accounts/accountRepository'
import { AccountService } from '../../../server/src/modules/accounts/accountService'
import { MembershipRepository } from '../../../server/src/modules/workspaces/membershipRepository'
import { AuditLogRepository } from '../../../server/src/modules/audit/auditLogRepository'
import { AuditLogService } from '../../../server/src/modules/audit/auditLogService'

describe('AuditLogService', () => {
  let prisma = createPrismaClient()
  let dbHandle: ReturnType<typeof createTestDatabase> | null = null
  let auditLogService: AuditLogService
  let workspaceId: string
  let membershipId: string

  beforeEach(async () => {
    dbHandle = createTestDatabase()
    prisma = createPrismaClient({ datasourceUrl: dbHandle.url })
    const accountRepository = new PrismaAccountRepository(prisma)
    const accountService = new AccountService(accountRepository)
    const workspaceRepository = new WorkspaceRepository(prisma)
    const accessService = new WorkspaceAccessService(workspaceRepository, new MembershipRepository(prisma))
    const workspaceService = new WorkspaceService(workspaceRepository, accessService)
    const membershipRepository = new MembershipRepository(prisma)
    const auditLogRepository = new AuditLogRepository(prisma)
    auditLogService = new AuditLogService(auditLogRepository)

    const owner = await accountService.registerAccount({ email: 'audit-owner@example.com', password: 'Sup3rSecure!' })
    const workspace = await workspaceService.create(owner.id, { name: 'Audit Workspace' })
    workspaceId = workspace.id
    const membership = await membershipRepository.create({
      workspaceId,
      accountId: owner.id,
      role: 'owner',
      status: 'active',
    })
    membershipId = membership.id
  })

  afterEach(async () => {
    await prisma.$disconnect()
    dbHandle?.cleanup()
    dbHandle = null
  })

  it('records audit events and paginates results', async () => {
    await auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId },
      action: 'membership.added',
      entityType: 'membership',
      entityId: 'member-1',
      metadata: { role: 'member' },
    })
    await auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId },
      action: 'membership.updated',
      entityType: 'membership',
      entityId: 'member-1',
      metadata: { updatedFields: ['role'] },
    })
    await auditLogService.record({
      workspaceId,
      actor: { type: 'external', collaboratorId: 'guest-1' },
      action: 'share_link.external_accepted',
      entityType: 'share_link',
      entityId: 'share-1',
      metadata: { accessLevel: 'viewer' },
    })

    const page = await auditLogService.list({ workspaceId, page: 1, pageSize: 2 })
    expect(page.logs).toHaveLength(2)
    expect(page.hasNextPage).toBe(true)

    const secondPage = await auditLogService.list({ workspaceId, page: 2, pageSize: 2 })
    expect(secondPage.logs.length).toBeGreaterThanOrEqual(1)
    expect(secondPage.hasNextPage).toBe(false)
  })

  it('applies filters for actor, entity, action, and time window', async () => {
    const past = new Date(Date.now() - 60 * 1000)
    const future = new Date(Date.now() + 60 * 1000)
    await auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId },
      action: 'membership.updated',
      entityType: 'membership',
      entityId: 'member-2',
      metadata: { updatedFields: ['status'] },
    })
    await auditLogService.record({
      workspaceId,
      actor: { type: 'external', collaboratorId: 'guest-2' },
      action: 'share_link.external_sessions_revoked',
      entityType: 'share_link',
      entityId: 'share-2',
      metadata: { reason: 'manual' },
    })

    const filtered = await auditLogService.list({
      workspaceId,
      actorMembershipId: membershipId,
      entityType: 'membership',
      action: 'membership.updated',
      from: past,
      to: future,
    })
    expect(filtered.logs).toHaveLength(1)
    expect(filtered.logs[0].action).toBe('membership.updated')

    const externalFilter = await auditLogService.list({
      workspaceId,
      actorCollaboratorId: 'guest-2',
      entityType: 'share_link',
    })
    expect(externalFilter.logs).toHaveLength(1)
    expect(externalFilter.logs[0].metadata?.reason).toBe('manual')
  })
})
