import { z } from 'zod'
import type { WorkspaceMembershipRole, WorkspaceMembershipStatus } from '@prisma/client'
import { MembershipRepository, type MembershipEntity } from './membershipRepository.js'
import { WorkspaceRepository } from './workspaceRepository.js'
import { WorkspaceNotFoundError } from './workspaceService.js'
import { WorkspaceAccessService } from './workspaceAccess.js'
import { AuditLogService } from '../audit/auditLogService.js'

const roleEnum: [WorkspaceMembershipRole, ...WorkspaceMembershipRole[]] = ['owner', 'admin', 'member']
const statusEnum: [WorkspaceMembershipStatus, ...WorkspaceMembershipStatus[]] = ['active', 'invited', 'pending', 'removed']

const createMembershipSchema = z.object({
  accountId: z.string().uuid(),
  role: z.enum(roleEnum).default('member'),
  status: z.enum(statusEnum).default('invited'),
  displayName: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().max(50).optional(),
  preferredLocale: z.string().trim().min(2).max(10).optional(),
  blogTheme: z.string().optional(),
  blogHandle: z.string().optional(),
  blogDescription: z.string().max(500).optional(),
  notifications: z.record(z.string(), z.any()).optional(),
})

const updateMembershipSchema = z.object({
  role: z.enum(roleEnum).optional(),
  status: z.enum(statusEnum).optional(),
  displayName: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().max(50).optional(),
  preferredLocale: z.string().trim().min(2).max(10).optional(),
  blogTheme: z.string().optional(),
  blogHandle: z.string().optional(),
  blogDescription: z.string().max(500).optional(),
  notifications: z.record(z.string(), z.any()).optional(),
})

export class MembershipService {
  private readonly access: WorkspaceAccessService
  constructor(
    private readonly repository: MembershipRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly auditLogService: AuditLogService,
  ) {
    this.access = new WorkspaceAccessService(workspaceRepository, repository)
  }

  async listMembers(requestorId: string, workspaceId: string) {
    await this.access.assertAdminOrOwner(requestorId, workspaceId)
    return this.repository.list(workspaceId)
  }

  async addMember(requestorId: string, workspaceId: string, rawInput: z.input<typeof createMembershipSchema>) {
    await this.access.assertAdminOrOwner(requestorId, workspaceId)
    const actor = await this.getActorMembership(workspaceId, requestorId)
    const input = createMembershipSchema.parse(rawInput)
    const existing = await this.repository.findByWorkspaceAndAccountIncludingRemoved(workspaceId, input.accountId)
    if (existing && existing.status !== 'removed') {
      throw new MembershipExistsError()
    }
    if (existing && existing.status === 'removed') {
      const updated = await this.repository.update(existing.id, {
        role: input.role,
        status: input.status,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        timezone: input.timezone,
        preferredLocale: input.preferredLocale,
        blogTheme: input.blogTheme,
        blogHandle: input.blogHandle,
        notifications: input.notifications,
      })
      await this.auditLogService.record({
        workspaceId,
        actor: { type: 'membership', membershipId: actor.id },
        action: 'membership.reactivated',
        entityType: 'membership',
        entityId: updated.id,
        metadata: {
          accountId: updated.accountId,
          role: updated.role,
          status: updated.status,
        },
      })
      return updated
    }
    const membership = await this.repository.create({
      workspaceId,
      accountId: input.accountId,
      role: input.role,
      status: input.status,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      timezone: input.timezone,
      preferredLocale: input.preferredLocale,
      blogTheme: input.blogTheme,
      blogHandle: input.blogHandle,
      notifications: input.notifications,
    })
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: actor.id },
      action: 'membership.added',
      entityType: 'membership',
      entityId: membership.id,
      metadata: {
        accountId: membership.accountId,
        role: membership.role,
        status: membership.status,
      },
    })
    return membership
  }

  async updateMember(
    requestorId: string,
    workspaceId: string,
    accountId: string,
    rawInput: z.input<typeof updateMembershipSchema>,
  ): Promise<MembershipEntity> {
    await this.access.assertAdminOrOwner(requestorId, workspaceId)
    const membership = await this.repository.findByWorkspaceAndAccount(workspaceId, accountId)
    if (!membership) {
      throw new MembershipNotFoundError()
    }
    const input = updateMembershipSchema.parse(rawInput)
    if (membership.role === 'owner' && input.role && input.role !== 'owner') {
      throw new OwnerDemotionError()
    }
    const updated = await this.repository.update(membership.id, input)
    const actor = await this.getActorMembership(workspaceId, requestorId)
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: actor.id },
      action: 'membership.updated',
      entityType: 'membership',
      entityId: membership.id,
      metadata: {
        accountId: membership.accountId,
        updatedFields: Object.keys(input),
        role: updated.role,
        status: updated.status,
      },
    })
    return updated
  }

  async removeMember(requestorId: string, workspaceId: string, accountId: string) {
    await this.access.assertAdminOrOwner(requestorId, workspaceId)
    const membership = await this.repository.findByWorkspaceAndAccount(workspaceId, accountId)
    if (!membership) {
      throw new MembershipNotFoundError()
    }
    if (membership.role === 'owner') {
      throw new OwnerDemotionError()
    }
    await this.repository.markRemoved(membership.id)
    const actor = await this.getActorMembership(workspaceId, requestorId)
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: actor.id },
      action: 'membership.removed',
      entityType: 'membership',
      entityId: membership.id,
      metadata: { accountId: membership.accountId },
    })
  }

  async transferOwnership(requestorId: string, workspaceId: string, newOwnerAccountId: string) {
    await this.access.assertOwner(requestorId, workspaceId)
    const target = await this.repository.findByWorkspaceAndAccount(workspaceId, newOwnerAccountId)
    if (!target || target.status !== 'active') {
      throw new MembershipNotFoundError()
    }
    if (target.role === 'owner') {
      return
    }
    const currentOwnerMembership = await this.repository.findByWorkspaceAndAccount(workspaceId, requestorId)
    if (currentOwnerMembership) {
      await this.repository.update(currentOwnerMembership.id, { role: 'admin' })
    }
    await this.repository.update(target.id, { role: 'owner' })
    await this.workspaceRepository.updateOwner(workspaceId, newOwnerAccountId)
    const actorMembership = currentOwnerMembership ?? target
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: actorMembership.id },
      action: 'membership.ownership_transferred',
      entityType: 'membership',
      entityId: target.id,
      metadata: {
        newOwnerAccountId,
        previousOwnerMembershipId: currentOwnerMembership?.id ?? null,
      },
    })
  }

  async changeRole(requestorId: string, workspaceId: string, accountId: string, role: WorkspaceMembershipRole) {
    const workspace = await this.access.assertAdminOrOwner(requestorId, workspaceId)
    const membership = await this.repository.findByWorkspaceAndAccount(workspaceId, accountId)
    if (!membership) {
      throw new MembershipNotFoundError()
    }
    if (membership.role === 'owner') {
      throw new OwnerDemotionError()
    }
    if (role === 'owner' && workspace.ownerAccountId !== requestorId) {
      throw new MembershipAccessDeniedError()
    }
    await this.repository.update(membership.id, { role })
    const actor = await this.getActorMembership(workspaceId, requestorId)
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: actor.id },
      action: 'membership.role_changed',
      entityType: 'membership',
      entityId: membership.id,
      metadata: {
        accountId: membership.accountId,
        role,
        requestedByOwner: workspace.ownerAccountId === requestorId,
      },
    })
  }

  async leaveWorkspace(accountId: string, workspaceId: string) {
    const workspace = await this.workspaceRepository.findByIdIncludingDeleted(workspaceId)
    if (!workspace || workspace.deletedAt) {
      throw new WorkspaceNotFoundError()
    }
    if (workspace.ownerAccountId === accountId) {
      throw new OwnerDemotionError()
    }
    const membership = await this.repository.findByWorkspaceAndAccount(workspaceId, accountId)
    if (!membership) {
      throw new MembershipNotFoundError()
    }
    await this.repository.markRemoved(membership.id)
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: membership.id },
      action: 'membership.left',
      entityType: 'membership',
      entityId: membership.id,
      metadata: { accountId },
    })
  }

  async getMember(workspaceId: string, accountId: string): Promise<MembershipEntity> {
    const membership = await this.repository.findByWorkspaceAndAccount(workspaceId, accountId)
    if (!membership) {
      throw new MembershipNotFoundError()
    }
    return membership
  }

  private async getActorMembership(workspaceId: string, accountId: string): Promise<MembershipEntity> {
    return this.getMember(workspaceId, accountId)
  }
}

export class MembershipNotFoundError extends Error {
  constructor() {
    super('Workspace membership not found')
    this.name = 'MembershipNotFoundError'
  }
}

export class OwnerDemotionError extends Error {
  constructor() {
    super('Cannot demote workspace owner')
    this.name = 'OwnerDemotionError'
  }
}

export class MembershipAccessDeniedError extends Error {
  constructor() {
    super('Insufficient permissions for membership operation')
    this.name = 'MembershipAccessDeniedError'
  }
}

export class MembershipExistsError extends Error {
  constructor() {
    super('Membership already exists')
    this.name = 'MembershipExistsError'
  }
}
