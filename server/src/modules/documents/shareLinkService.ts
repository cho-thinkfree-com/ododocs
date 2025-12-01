import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { ShareLinkAccess } from '@prisma/client'
import { Argon2PasswordHasher } from '../../lib/passwordHasher.js'
import { hashToken } from '../../lib/tokenGenerator.js'
import { AuditLogService } from '../audit/auditLogService.js'
import { DocumentRepository, type DocumentEntity } from './documentRepository.js'
import { DocumentShareLinkRepository, type ShareLinkEntity } from './documentShareLinkRepository.js'
import { DocumentShareLinkSessionRepository } from './documentShareLinkSessionRepository.js'
import { ExternalCollaboratorRepository } from './externalCollaboratorRepository.js'
import { MembershipRepository, type MembershipEntity } from '../workspaces/membershipRepository.js'
import { DocumentRevisionRepository } from './documentRevisionRepository.js'

import { MembershipAccessDeniedError } from '../workspaces/membershipService.js'
import { DocumentNotFoundError } from './documentService.js'
import { ShareLinkPasswordRequiredError, ShareLinkEditNotAllowedError } from './shareLinkServiceErrors.js'

const createSchema = z.object({
  accessLevel: z.enum(['viewer', 'commenter']),
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(4).max(32).optional(),
  accessType: z.enum(['private', 'link', 'public']).optional(),
})

const resolveSchema = z.object({
  password: z.string().optional(),
})

const updateOptionsSchema = z.object({
  allowExternalEdit: z.boolean().optional(),
  accessType: z.enum(['private', 'link', 'public']).optional(),
})

const acceptSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().max(80).optional(),
  password: z.string().optional(),
})

const GUEST_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export class ShareLinkService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly shareLinkRepository: DocumentShareLinkRepository,
    private readonly sessionRepository: DocumentShareLinkSessionRepository,
    private readonly collaboratorRepository: ExternalCollaboratorRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly revisionRepository: DocumentRevisionRepository,

    private readonly auditLogService: AuditLogService,
    private readonly passwordHasher = new Argon2PasswordHasher(),
  ) { }

  async list(accountId: string, workspaceId: string, documentId: string) {
    const document = await this.getDocument(documentId, workspaceId)
    await this.assertManager(accountId, workspaceId, document)
    return this.shareLinkRepository.listByDocument(documentId)
  }

  async create(accountId: string, workspaceId: string, documentId: string, payload: unknown) {
    const document = await this.getDocument(documentId, workspaceId)
    const membership = await this.assertManager(accountId, workspaceId, document)
    const input = createSchema.parse(payload)
    if (input.expiresAt && new Date(input.expiresAt) <= new Date()) {
      throw new Error('expiresAt must be in the future')
    }

    // Check for existing share link (persistent token)
    const existingShareLink = await this.shareLinkRepository.findLatestByDocumentId(documentId)

    if (existingShareLink) {
      const passwordHash = input.password ? await this.passwordHasher.hash(input.password) : existingShareLink.passwordHash
      const shareLink = await this.shareLinkRepository.reactivate(existingShareLink.id, {
        documentId,
        token: existingShareLink.token,
        accessLevel: input.accessLevel as ShareLinkAccess,
        passwordHash: passwordHash ?? undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        createdByMembershipId: membership.id,
        allowExternalEdit: existingShareLink.allowExternalEdit, // Preserve existing setting or take from input if we supported it here
        accessType: input.accessType ?? 'link',
        workspaceId,
      })

      await this.auditLogService.record({
        workspaceId,
        actor: { type: 'membership', membershipId: membership.id },
        action: 'share_link.updated', // Log as updated since we're reactivating/updating
        entityType: 'share_link',
        entityId: shareLink.id,
        metadata: {
          accessLevel: shareLink.accessLevel,
          expiresAt: shareLink.expiresAt?.toISOString() ?? null,
          reactivated: true,
        },
      })
      return { shareLink, token: shareLink.token }
    }

    const token = randomBytes(24).toString('base64url')
    const passwordHash = input.password ? await this.passwordHasher.hash(input.password) : undefined
    const shareLink = await this.shareLinkRepository.create({
      documentId,
      token,
      accessLevel: input.accessLevel as ShareLinkAccess,
      passwordHash,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      createdByMembershipId: membership.id,
      accessType: input.accessType ?? 'link',
      workspaceId,
    })
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: membership.id },
      action: 'share_link.created',
      entityType: 'share_link',
      entityId: shareLink.id,
      metadata: {
        accessLevel: shareLink.accessLevel,
        expiresAt: shareLink.expiresAt?.toISOString() ?? null,
      },
    })
    return { shareLink, token }
  }

  async revoke(accountId: string, workspaceId: string, shareLinkId: string) {
    const shareLink = await this.ensureShareLink(shareLinkId)
    const document = await this.getDocument(shareLink.documentId, workspaceId)
    const membership = await this.assertManager(accountId, workspaceId, document)
    await this.shareLinkRepository.revoke(shareLinkId)
    await this.sessionRepository.revokeByShareLinkId(shareLinkId)
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: membership.id },
      action: 'share_link.revoked',
      entityType: 'share_link',
      entityId: shareLinkId,
    })
  }

  async updateOptions(accountId: string, workspaceId: string, shareLinkId: string, payload: unknown) {
    const shareLink = await this.ensureShareLink(shareLinkId)
    const document = await this.getDocument(shareLink.documentId, workspaceId)
    const membership = await this.assertManager(accountId, workspaceId, document)
    const input = updateOptionsSchema.parse(payload)
    const updated = await this.shareLinkRepository.updateOptions(shareLinkId, {
      allowExternalEdit: input.allowExternalEdit,
      accessType: input.accessType,
    })
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: membership.id },
      action: 'share_link.updated',
      entityType: 'share_link',
      entityId: shareLinkId,
      metadata: { allowExternalEdit: updated.allowExternalEdit, accessType: updated.accessType },
    })
    return updated
  }

  async resolveToken(token: string, payload: unknown) {
    const result = await this.verifyShareLinkToken(token, resolveSchema.parse(payload))

    // Increment view count
    await this.documentRepository.incrementViewCount(result.document.id)

    // Return document with incremented view count so the viewer sees the update immediately
    const documentWithUpdatedViewCount = {
      ...result.document,
      viewCount: (result.document.viewCount || 0) + 1
    }

    const revision = await this.revisionRepository.findLatest(result.document.id)
    return {
      token: result.shareLink.token,
      document: documentWithUpdatedViewCount,
      revision,
      accessLevel: result.shareLink.accessLevel,
      createdByMembershipId: result.shareLink.createdByMembershipId,
    }
  }

  async getAuthorPublicDocuments(token: string) {
    const shareLink = await this.shareLinkRepository.findActiveByToken(token)
    if (!shareLink || !this.isActive(shareLink)) {
      throw new DocumentNotFoundError()
    }

    // Get author's membership profile
    const membership = await this.membershipRepository.findById(shareLink.createdByMembershipId)
    const authorName = membership?.displayName || undefined

    // Get all public share links created by the same membership
    const publicShareLinks = await this.shareLinkRepository.findPublicByMembership(shareLink.createdByMembershipId)

    // Always include the current document, even if it's not fully public
    const currentDocumentIncluded = publicShareLinks.some(link => link.documentId === shareLink.documentId)
    const allShareLinks = currentDocumentIncluded ? publicShareLinks : [shareLink, ...publicShareLinks]

    // Fetch document details for each share link
    const documents = await Promise.all(
      allShareLinks.map(async (link) => {
        const doc = await this.documentRepository.findById(link.documentId)
        if (!doc || doc.deletedAt) return null
        const revision = await this.revisionRepository.findLatest(doc.id)
        return {
          document: doc,
          shareLink: link,
          revision,
          isCurrentDocument: link.documentId === shareLink.documentId,
          authorName,
        }
      })
    )

    return documents.filter((doc): doc is NonNullable<typeof doc> => doc !== null)
  }

  async acceptGuest(token: string, payload: unknown) {
    const input = acceptSchema.parse(payload)
    const { shareLink, document } = await this.verifyShareLinkToken(token, { password: input.password })
    if (!shareLink.allowExternalEdit) {
      throw new ShareLinkEditNotAllowedError()
    }
    let collaborator = await this.collaboratorRepository.findByEmail(input.email.toLowerCase())
    if (!collaborator) {
      collaborator = await this.collaboratorRepository.create(input.email.toLowerCase(), input.displayName)
    }
    const sessionToken = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_MS)
    await this.sessionRepository.create({
      shareLinkId: shareLink.id,
      collaboratorId: collaborator.id,
      tokenHash: hashToken(sessionToken),
      expiresAt,
    })
    await this.auditLogService.record({
      workspaceId: document.workspaceId,
      actor: { type: 'external', collaboratorId: collaborator.id },
      action: 'share_link.external_accepted',
      entityType: 'share_link',
      entityId: shareLink.id,
      metadata: { accessLevel: shareLink.accessLevel },
    })
    return {
      documentId: document.id,
      workspaceId: document.workspaceId,
      accessLevel: shareLink.accessLevel,
      sessionToken,
      expiresAt,
      collaboratorId: collaborator.id,
    }
  }

  async revokeGuestSessions(accountId: string, workspaceId: string, shareLinkId: string) {
    const shareLink = await this.ensureShareLink(shareLinkId)
    const document = await this.getDocument(shareLink.documentId, workspaceId)
    const membership = await this.assertManager(accountId, workspaceId, document)
    await this.sessionRepository.revokeByShareLinkId(shareLinkId)
    await this.auditLogService.record({
      workspaceId,
      actor: { type: 'membership', membershipId: membership.id },
      action: 'share_link.external_sessions_revoked',
      entityType: 'share_link',
      entityId: shareLinkId,
    })
  }

  private async verifyShareLinkToken(
    token: string,
    payload: z.infer<typeof resolveSchema>,
  ): Promise<{ shareLink: ShareLinkEntity; document: DocumentEntity }> {
    const shareLink = await this.shareLinkRepository.findActiveByToken(token)
    if (!shareLink || !this.isActive(shareLink)) {
      throw new DocumentNotFoundError()
    }
    if (shareLink.passwordHash) {
      if (!payload.password || !(await this.passwordHasher.verify(shareLink.passwordHash, payload.password))) {
        throw new ShareLinkPasswordRequiredError()
      }
    }
    const document = await this.documentRepository.findById(shareLink.documentId)
    if (!document || document.deletedAt) {
      throw new DocumentNotFoundError()
    }
    return { shareLink, document }
  }

  private async ensureShareLink(id: string) {
    const shareLink = await this.shareLinkRepository.findById(id)
    if (!shareLink) {
      throw new DocumentNotFoundError()
    }
    return shareLink
  }

  private async getDocument(documentId: string, workspaceId: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findById(documentId)
    if (!document || document.workspaceId !== workspaceId || document.deletedAt) {
      throw new DocumentNotFoundError()
    }
    return document
  }

  private async assertManager(accountId: string, workspaceId: string, document: DocumentEntity): Promise<MembershipEntity> {
    const membership = await this.membershipRepository.findByWorkspaceAndAccount(workspaceId, accountId)
    if (!membership) {
      throw new MembershipAccessDeniedError()
    }
    if (membership.role === 'owner' || membership.role === 'admin' || membership.id === document.ownerMembershipId) {
      return membership
    }
    throw new MembershipAccessDeniedError()
  }

  private isActive(shareLink: ShareLinkEntity) {
    if (shareLink.revokedAt) return false
    if (shareLink.expiresAt) {
      const expiresAt = new Date(shareLink.expiresAt)
      if (expiresAt.getTime() <= Date.now()) {
        return false
      }
    }
    return true
  }
}

export { ShareLinkPasswordRequiredError, ShareLinkEditNotAllowedError } from './shareLinkServiceErrors.js'
