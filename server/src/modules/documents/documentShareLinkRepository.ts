import type { DocumentShareLink as ShareLinkModel, DocumentShareLinkAccess } from '@prisma/client'
import type { DatabaseClient } from '../../lib/prismaClient.js'

export type ShareLinkEntity = {
  id: string
  shareLinkId: string
  documentId: string
  token: string
  accessLevel: DocumentShareLinkAccess
  passwordHash: string | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdByMembershipId: string
  allowExternalEdit: boolean
  isPublic: boolean
  createdAt: Date
}

export type ShareLinkCreateInput = {
  token: string
  documentId: string
  accessLevel: DocumentShareLinkAccess
  passwordHash?: string
  expiresAt?: Date
  createdByMembershipId: string
  allowExternalEdit?: boolean
  isPublic?: boolean
}

export class DocumentShareLinkRepository {
  constructor(private readonly prisma: DatabaseClient) { }

  async create(input: ShareLinkCreateInput): Promise<ShareLinkEntity> {
    const shareLink = await this.prisma.documentShareLink.create({
      data: {
        documentId: input.documentId,
        token: input.token,
        accessLevel: input.accessLevel,
        passwordHash: input.passwordHash,
        expiresAt: input.expiresAt,
        createdByMembershipId: input.createdByMembershipId,
        allowExternalEdit: input.allowExternalEdit ?? false,
        isPublic: input.isPublic ?? false,
      },
    })
    return toEntity(shareLink)
  }

  async listByDocument(documentId: string): Promise<ShareLinkEntity[]> {
    const shareLinks = await this.prisma.documentShareLink.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    })
    return shareLinks.map(toEntity)
  }

  async findLatestByDocumentId(documentId: string): Promise<ShareLinkEntity | null> {
    const shareLink = await this.prisma.documentShareLink.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    })
    return shareLink ? toEntity(shareLink) : null
  }

  async findById(id: string): Promise<ShareLinkEntity | null> {
    const shareLink = await this.prisma.documentShareLink.findUnique({ where: { id } })
    return shareLink ? toEntity(shareLink) : null
  }

  async findActiveByToken(token: string): Promise<ShareLinkEntity | null> {
    const shareLink = await this.prisma.documentShareLink.findFirst({
      where: {
        token,
        revokedAt: null,
      },
    })
    return shareLink ? toEntity(shareLink) : null
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.documentShareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  async updateOptions(id: string, options: { allowExternalEdit?: boolean; isPublic?: boolean }): Promise<ShareLinkEntity> {
    const shareLink = await this.prisma.documentShareLink.update({
      where: { id },
      data: {
        allowExternalEdit: options.allowExternalEdit,
        isPublic: options.isPublic,
      },
    })
    return toEntity(shareLink)
  }

  async reactivate(id: string, input: ShareLinkCreateInput): Promise<ShareLinkEntity> {
    const shareLink = await this.prisma.documentShareLink.update({
      where: { id },
      data: {
        revokedAt: null,
        accessLevel: input.accessLevel,
        passwordHash: input.passwordHash,
        expiresAt: input.expiresAt,
        allowExternalEdit: input.allowExternalEdit ?? false,
        isPublic: input.isPublic ?? false,
      },
    })
    return toEntity(shareLink)
  }

  async findPublicByMembership(membershipId: string): Promise<ShareLinkEntity[]> {
    const shareLinks = await this.prisma.documentShareLink.findMany({
      where: {
        createdByMembershipId: membershipId,
        isPublic: true,
        passwordHash: null,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' },
    })
    return shareLinks.map(toEntity)
  }
}

const toEntity = (shareLink: ShareLinkModel): ShareLinkEntity => ({
  id: shareLink.id,
  shareLinkId: shareLink.id,
  documentId: shareLink.documentId,
  token: shareLink.token,
  accessLevel: shareLink.accessLevel,
  passwordHash: shareLink.passwordHash,
  expiresAt: shareLink.expiresAt,
  revokedAt: shareLink.revokedAt,
  createdByMembershipId: shareLink.createdByMembershipId,
  allowExternalEdit: shareLink.allowExternalEdit,
  isPublic: shareLink.isPublic,
  createdAt: shareLink.createdAt,
})
