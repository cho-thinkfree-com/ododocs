import { FileRepository } from './fileRepository.js'
import { StorageService } from '../storage/storageService.js'
import { WorkspaceAccessService } from '../workspaces/workspaceAccess.js'
import { MembershipRepository } from '../workspaces/membershipRepository.js'
import { DocumentShareLinkRepository } from '../documents/documentShareLinkRepository.js'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import crypto from 'crypto'

export class FileService {
    constructor(
        private readonly fileRepository: FileRepository,
        private readonly storageService: StorageService,
        private readonly workspaceAccess: WorkspaceAccessService,
        private readonly membershipRepository: MembershipRepository,
        private readonly shareLinkRepository: DocumentShareLinkRepository
    ) { }

    /**
     * 1. Generates a Presigned PUT URL for the client.
     * 2. Creates a pending File record in DB.
     */
    async initiateUpload(
        accountId: string,
        workspaceId: string,
        params: { name: string; mimeType: string; size: number; folderId?: string }
    ) {
        await this.workspaceAccess.assertMember(accountId, workspaceId)
        const membership = await this.membershipRepository.findByWorkspaceAndAccount(workspaceId, accountId)
        if (!membership) throw new Error('Membership not found')

        const fileId = uuidv4()
        const extension = path.extname(params.name).replace('.', '')
        // S3 Key Structure: workspaces/{ws}/files/{uuid}/v1/{filename}
        const s3Key = `workspaces/${workspaceId}/files/${fileId}/v1/${params.name}`

        // Create DB record immediately (Optimistic)
        const file = await this.fileRepository.create({
            workspaceId,
            folderId: params.folderId || null,
            originalName: params.name,
            mimeType: params.mimeType,
            size: BigInt(params.size),
            extension,
            s3Key,
            createdByMembershipId: membership.id,
        })

        // Generate Presigned URL
        const uploadUrl = await this.storageService.getPresignedPutUrl(s3Key, params.mimeType)

        return {
            file,
            uploadUrl,
        }
    }

    async getDownloadUrl(accountId: string, fileId: string) {
        const file = await this.fileRepository.findById(fileId)
        if (!file || file.deletedAt) throw new Error('File not found')

        await this.workspaceAccess.assertMember(accountId, file.workspaceId)

        // Force download with original filename
        return this.storageService.getPresignedGetUrl(file.s3Key, file.originalName)
    }

    async listFiles(accountId: string, workspaceId: string, folderId?: string | null) {
        await this.workspaceAccess.assertMember(accountId, workspaceId)
        return this.fileRepository.listByWorkspace(workspaceId, folderId)
    }

    async deleteFile(accountId: string, fileId: string) {
        const file = await this.fileRepository.findById(fileId)
        if (!file) throw new Error('File not found')

        await this.workspaceAccess.assertMember(accountId, file.workspaceId)

        // Soft delete in DB
        await this.fileRepository.softDelete(fileId)
    }

    /**
     * Create a share link for a file
     */
    async createShareLink(
        accountId: string,
        fileId: string,
        options: {
            accessLevel?: 'view' | 'comment' | 'edit'
            password?: string
            expiresAt?: Date
            accessType?: 'private' | 'link' | 'public'
        }
    ) {
        const file = await this.fileRepository.findById(fileId)
        if (!file || file.deletedAt) throw new Error('File not found')

        await this.workspaceAccess.assertMember(accountId, file.workspaceId)
        const membership = await this.membershipRepository.findByWorkspaceAndAccount(file.workspaceId, accountId)
        if (!membership) throw new Error('Membership not found')

        const token = crypto.randomBytes(16).toString('hex')
        const passwordHash = options.password
            ? crypto.createHash('sha256').update(options.password).digest('hex')
            : null

        return this.shareLinkRepository.createForFile({
            fileId,
            token,
            accessLevel: options.accessLevel || 'view',
            passwordHash,
            expiresAt: options.expiresAt,
            accessType: options.accessType || 'link',
            createdByMembershipId: membership.id,
        })
    }

    /**
     * Get file by share token (for public access)
     */
    async getFileByShareToken(token: string, password?: string) {
        const shareLink = await this.shareLinkRepository.findByToken(token)
        if (!shareLink || shareLink.revokedAt || !shareLink.fileId) {
            throw new Error('Share link not found or invalid')
        }

        if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
            throw new Error('Share link has expired')
        }

        if (shareLink.passwordHash) {
            if (!password) {
                const error = new Error('Password required') as Error & { code?: string }
                error.code = 'PASSWORD_REQUIRED'
                throw error
            }
            const providedHash = crypto.createHash('sha256').update(password).digest('hex')
            if (providedHash !== shareLink.passwordHash) {
                throw new Error('Invalid password')
            }
        }

        const file = await this.fileRepository.findById(shareLink.fileId)
        if (!file || file.deletedAt) {
            throw new Error('File not found')
        }

        return { file, shareLink }
    }

    /**
     * Get download URL for shared file
     */
    async getSharedFileDownloadUrl(token: string, password?: string) {
        const { file } = await this.getFileByShareToken(token, password)
        return this.storageService.getPresignedGetUrl(file.s3Key, file.originalName)
    }

    /**
     * Get view URL for shared file (for preview)
     */
    async getSharedFileViewUrl(token: string, password?: string) {
        const { file } = await this.getFileByShareToken(token, password)
        // For preview, we use inline disposition
        return this.storageService.getPresignedGetUrl(file.s3Key)
    }
}
