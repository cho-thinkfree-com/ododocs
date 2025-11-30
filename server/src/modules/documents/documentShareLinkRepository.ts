import type { ShareLink as ShareLinkModel, ShareLinkAccess } from '@prisma/client'
import type { DatabaseClient } from '../../lib/prismaClient.js'

export type ShareLinkEntity = {
  id: string
  shareLinkId: string
  documentId: string
  fileId: string
  token: string
  accessLevel: ShareLinkAccess
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
  documentId?: string
  fileId?: string
  accessLevel: ShareLinkAccess
  passwordHash?: string
  expiresAt?: Date
  createdByMembershipId: string
  allowExternalEdit?: boolean
  isPublic?: boolean
  workspaceId: string
}

export class DocumentShareLinkRepository {
  constructor(private readonly prisma: DatabaseClient) { }

  async create(input: ShareLinkCreateInput): Promise<ShareLinkEntity> {
    const shareLink = await this.prisma.shareLink.create({
      data: {
        fileId: input.documentId!, // Map documentId to fileId
        token: input.token,
        accessLevel: input.accessLevel,
        passwordHash: input.passwordHash,
        expiresAt: input.expiresAt,
        createdBy: input.createdByMembershipId, // Map createdByMembershipId to createdBy
        isPublic: input.isPublic ?? false,
        workspaceId: input.workspaceId,
      },
    })
    return toEntity(shareLink)
  }

  async listByDocument(documentId: string): Promise<ShareLinkEntity[]> {
    const shareLinks = await this.prisma.shareLink.findMany({
      where: { fileId: documentId },
      orderBy: { createdAt: 'desc' },
    })
    return shareLinks.map(toEntity)
  }

  async findLatestByDocumentId(documentId: string): Promise<ShareLinkEntity | null> {
    const shareLink = await this.prisma.shareLink.findFirst({
      where: { fileId: documentId },
      orderBy: { createdAt: 'desc' },
    })
    return shareLink ? toEntity(shareLink) : null
  }

  async findById(id: string): Promise<ShareLinkEntity | null> {
    const shareLink = await this.prisma.shareLink.findUnique({ where: { id } })
    return shareLink ? toEntity(shareLink) : null
  }

  async findActiveByToken(token: string): Promise<ShareLinkEntity | null> {
    const shareLink = await this.prisma.shareLink.findFirst({
      where: {
        token,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    })
    return shareLink ? toEntity(shareLink) : null
  }

  async findByToken(token: string): Promise<ShareLinkEntity | null> {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { token },
    })
    return shareLink ? toEntity(shareLink) : null
  }

  async createForFile(params: {
    fileId: string
    token: string
    accessLevel: ShareLinkAccess
    passwordHash?: string | null
    expiresAt?: Date
    isPublic?: boolean
    createdByMembershipId: string
    workspaceId: string // Added workspaceId requirement
  }): Promise<ShareLinkEntity> {
    const shareLink = await this.prisma.shareLink.create({
      data: {
        fileId: params.fileId,
        token: params.token,
        accessLevel: params.accessLevel,
        passwordHash: params.passwordHash,
        expiresAt: params.expiresAt,
        isPublic: params.isPublic ?? false,
        createdBy: params.createdByMembershipId,
        workspaceId: params.workspaceId,
      },
    })
    return toEntity(shareLink)
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.shareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  async updateOptions(id: string, options: { allowExternalEdit?: boolean; isPublic?: boolean }): Promise<ShareLinkEntity> {
    const shareLink = await this.prisma.shareLink.update({
      where: { id },
      data: {
        // allowExternalEdit: options.allowExternalEdit, // Not in schema
        isPublic: options.isPublic,
      },
    })
    return toEntity(shareLink)
  }

  async reactivate(id: string, input: ShareLinkCreateInput): Promise<ShareLinkEntity> {
    const shareLink = await this.prisma.shareLink.update({
      where: { id },
      data: {
        revokedAt: null,
        accessLevel: input.accessLevel,
        passwordHash: input.passwordHash,
        expiresAt: input.expiresAt,
        // allowExternalEdit: input.allowExternalEdit ?? false, // Not in schema
        isPublic: input.isPublic ?? false,
      },
    })
    return toEntity(shareLink)
  }

  async findPublicByMembership(membershipId: string): Promise<ShareLinkEntity[]> {
    const shareLinks = await this.prisma.shareLink.findMany({
      where: {
        createdBy: membershipId,
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
  documentId: shareLink.fileId, // Map fileId to documentId
  fileId: shareLink.fileId,
  token: shareLink.token,
  accessLevel: shareLink.accessLevel,
  passwordHash: shareLink.passwordHash,
  expiresAt: shareLink.expiresAt,
  revokedAt: shareLink.revokedAt,
  createdByMembershipId: shareLink.createdBy, // Map createdBy to createdByMembershipId
  allowExternalEdit: false, // Default to false as it's missing in schema
  isPublic: shareLink.isPublic,
  createdAt: shareLink.createdAt,
})
