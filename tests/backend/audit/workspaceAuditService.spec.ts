import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { createPrismaClient } from '../../../server/src/lib/prismaClient'
import { createTestDatabase } from '../support/testDatabase'
import { PrismaAccountRepository } from '../../../server/src/modules/accounts/accountRepository'
import { AccountService } from '../../../server/src/modules/accounts/accountService'
import { WorkspaceRepository } from '../../../server/src/modules/workspaces/workspaceRepository'
import { WorkspaceService } from '../../../server/src/modules/workspaces/workspaceService'
import { WorkspaceAccessService } from '../../../server/src/modules/workspaces/workspaceAccess'
import { MembershipRepository } from '../../../server/src/modules/workspaces/membershipRepository'
import { AuditLogRepository } from '../../../server/src/modules/audit/auditLogRepository'
import { AuditLogService } from '../../../server/src/modules/audit/auditLogService'
import { WorkspaceAuditService } from '../../../server/src/modules/audit/workspaceAuditService'
import { MembershipAccessDeniedError } from '../../../server/src/modules/workspaces/membershipService'

describe('WorkspaceAuditService', () => {
  let prisma = createPrismaClient()
  let dbHandle: ReturnType<typeof createTestDatabase> | null = null
  let accountService: AccountService
  let workspaceService: WorkspaceService
  let membershipRepository: MembershipRepository
  let auditLogService: AuditLogService
  let workspaceAuditService: WorkspaceAuditService
  let ownerId: string
  let workspaceId: string
  let ownerMembershipId: string

  beforeEach(async () => {
    dbHandle = createTestDatabase()
    prisma = createPrismaClient({ datasourceUrl: dbHandle.url })
    const accountRepository = new PrismaAccountRepository(prisma)
    accountService = new AccountService(accountRepository)
    const workspaceRepository = new WorkspaceRepository(prisma)
    const accessService = new WorkspaceAccessService(workspaceRepository, membershipRepository)
    workspaceService = new WorkspaceService(workspaceRepository, accessService)
    membershipRepository = new MembershipRepository(prisma)
    const auditLogRepository = new AuditLogRepository(prisma)
    auditLogService = new AuditLogService(auditLogRepository)
    workspaceAuditService = new WorkspaceAuditService(workspaceRepository, membershipRepository, auditLogService)

    const owner = await accountService.registerAccount({ email: 'audit-owner@example.com', password: 'Sup3rSecure!' })
    ownerId = owner.id
    const workspace = await workspaceService.create(ownerId, { name: 'Audit Log Space' })
    workspaceId = workspace.id
    const ownerMembership = await membershipRepository.create({
      workspaceId,
      accountId: ownerId,
      role: 'owner',
      status: 'active',
    })
    ownerMembershipId = ownerMembership.id
  })

  afterEach(async () => {
    await prisma.$disconnect()
    dbHandle?.cleanup()
    dbHandle = null
  })

  it('allows owners to query logs with filters and pagination', async () => {
    await auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: ownerMembershipId },
      action: 'membership.added',
      entityType: 'membership',
      entityId: 'member-1',
      metadata: { role: 'member' },
    })
    await auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: ownerMembershipId },
      action: 'share_link.created',
      entityType: 'share_link',
      entityId: 'share-1',
    })
    const result = await workspaceAuditService.list(ownerId, workspaceId, {
      entityType: 'membership,share_link',
      page: 1,
      pageSize: 5,
    })
    expect(result.logs).toHaveLength(2)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(5)
  })

  it('filters by actor membership id', async () => {
    const adminAccount = await accountService.registerAccount({ email: 'audit-admin@example.com', password: 'Sup3rSecure!' })
    const otherMembership = await membershipRepository.create({
      workspaceId,
      accountId: adminAccount.id,
      role: 'admin',
      status: 'active',
      displayName: 'Proxy Admin',
    })
    await auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: otherMembership.id },
      action: 'membership.updated',
      entityType: 'membership',
      entityId: otherMembership.id,
    })
    await auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: ownerMembershipId },
      action: 'membership.updated',
      entityType: 'membership',
      entityId: ownerMembershipId,
    })

    const filtered = await workspaceAuditService.list(ownerId, workspaceId, { actorMembershipId: otherMembership.id })
    expect(filtered.logs).toHaveLength(1)
    expect(filtered.logs[0].actorMembershipId).toBe(otherMembership.id)
  })

  it('blocks non-admin members from querying logs', async () => {
    const member = await accountService.registerAccount({ email: 'member@example.com', password: 'Sup3rSecure!' })
    await membershipRepository.create({ workspaceId, accountId: member.id, role: 'member', status: 'active' })
    await expect(() => workspaceAuditService.list(member.id, workspaceId, {})).rejects.toBeInstanceOf(
      MembershipAccessDeniedError,
    )
  })
})
