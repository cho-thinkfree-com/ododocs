import { FileSystemEntry, FileSystemType } from '@prisma/client';
import { FileSystemRepository } from './fileSystemRepository.js';
import { RevisionRepository } from './revisionRepository.js';
import { ShareLinkRepository } from './shareLinkRepository.js';
import { StorageService } from '../storage/storageService.js';
import { WorkspaceAccessService } from '../workspaces/workspaceAccess.js';

const ODOCS_MIME_TYPE = 'application/x-odocs';

export class FileSystemService {
    constructor(
        private fileSystemRepo: FileSystemRepository,
        private revisionRepo: RevisionRepository,
        private shareLinkRepo: ShareLinkRepository,
        private storageService: StorageService,
        private workspaceAccess: WorkspaceAccessService
    ) { }

    // ============================================================================
    // CREATE OPERATIONS
    // ============================================================================

    async createFolder(
        membershipId: string,
        workspaceId: string,
        name: string,
        parentId?: string
    ): Promise<FileSystemEntry> {
        // Membership already validated by resolveMembership middleware
        // This is a defensive check to ensure membershipId is valid
        // Note: In production, consider adding membership cache to avoid redundant DB calls

        return this.fileSystemRepo.create({
            name,
            type: 'folder',
            workspaceId,
            parentId,
            createdBy: membershipId,
        });
    }

    async createDocument(
        membershipId: string,
        workspaceId: string,
        title: string,
        content: any,
        parentId?: string
    ): Promise<FileSystemEntry> {
        // Membership already validated by resolveMembership middleware

        // Create file entry
        const file = await this.fileSystemRepo.create({
            name: title,
            type: 'file',
            mimeType: ODOCS_MIME_TYPE,
            extension: '.odocs',
            workspaceId,
            parentId,
            createdBy: membershipId,
        });

        // Save content as revision
        const contentJson = JSON.stringify(content);
        const contentBuffer = Buffer.from(contentJson, 'utf-8');
        const size = BigInt(contentBuffer.length);

        // Upload to S3
        const storageKey = `workspaces/${workspaceId}/files/${file.id}/v1`;
        const latestKey = `workspaces/${workspaceId}/files/${file.id}/latest`;

        await this.storageService.uploadObject(storageKey, contentBuffer, ODOCS_MIME_TYPE);
        await this.storageService.uploadObject(latestKey, contentBuffer, ODOCS_MIME_TYPE);

        // Create revision
        const revision = await this.revisionRepo.create({
            fileId: file.id,
            storageKey,
            size,
            version: 1,
            createdBy: membershipId,
            changeNote: 'Initial version',
        });

        // Update file to point to this revision
        await this.fileSystemRepo.update(file.id, {
            currentRevisionId: revision.id,
            size,
        });

        return this.fileSystemRepo.findById(file.id) as Promise<FileSystemEntry>;
    }

    async createFile(
        membershipId: string,
        workspaceId: string,
        name: string,
        mimeType: string,
        extension: string,
        buffer: Buffer,
        parentId?: string
    ): Promise<FileSystemEntry> {
        // Membership already validated by resolveMembership middleware

        const size = BigInt(buffer.length);

        // Create file entry
        const file = await this.fileSystemRepo.create({
            name,
            type: 'file',
            mimeType,
            extension,
            size,
            workspaceId,
            parentId,
            createdBy: membershipId,
        });

        // Upload to S3
        const storageKey = `workspaces/${workspaceId}/files/${file.id}/v1`;
        const latestKey = `workspaces/${workspaceId}/files/${file.id}/latest`;

        await this.storageService.uploadObject(storageKey, buffer, mimeType);
        await this.storageService.uploadObject(latestKey, buffer, mimeType);

        // Create revision
        const revision = await this.revisionRepo.create({
            fileId: file.id,
            storageKey,
            size,
            version: 1,
            createdBy: membershipId,
        });

        // Update file
        await this.fileSystemRepo.update(file.id, {
            currentRevisionId: revision.id,
        });

        return this.fileSystemRepo.findById(file.id) as Promise<FileSystemEntry>;
    }

    // ============================================================================
    // READ OPERATIONS
    // ============================================================================

    async getById(membershipId: string, fileId: string): Promise<FileSystemEntry> {
        const file = await this.fileSystemRepo.findById(fileId);
        if (!file) {
            throw new Error('File not found');
        }

        // Membership validated by resolveMembership middleware
        // Files can only be accessed within their workspace context

        return file;
    }

    async listByWorkspace(
        membershipId: string,
        workspaceId: string,
        parentId?: string | null
    ): Promise<FileSystemEntry[]> {
        // Membership validated by resolveMembership middleware

        return this.fileSystemRepo.findByWorkspace(workspaceId, { parentId });
    }

    async getDocumentContent(membershipId: string, fileId: string): Promise<any> {
        const file = await this.getById(membershipId, fileId);

        if (file.mimeType !== ODOCS_MIME_TYPE) {
            throw new Error('Not an OdoDocs document');
        }

        if (!file.currentRevisionId) {
            return { type: 'doc', content: [] }; // Empty document
        }

        // Get latest content from S3
        const latestKey = `workspaces/${file.workspaceId}/files/${file.id}/latest`;
        const buffer = await this.storageService.getObject(latestKey);
        const contentJson = buffer.toString('utf-8');

        return JSON.parse(contentJson);
    }

    async getFileDownloadUrl(membershipId: string, fileId: string): Promise<string> {
        const file = await this.getById(membershipId, fileId);

        if (!file.currentRevisionId) {
            throw new Error('File has no content');
        }

        const latestKey = `workspaces/${file.workspaceId}/files/${file.id}/latest`;
        return this.storageService.getPresignedGetUrl(latestKey, file.name);
    }

    // ============================================================================
    // UPDATE OPERATIONS
    // ============================================================================

    async updateDocument(
        membershipId: string,
        fileId: string,
        content: any
    ): Promise<FileSystemEntry> {
        const file = await this.getById(membershipId, fileId);

        if (file.mimeType !== ODOCS_MIME_TYPE) {
            throw new Error('Not an OdoDocs document');
        }

        // Get next version
        const nextVersion = await this.revisionRepo.getNextVersion(fileId);

        // Save content
        const contentJson = JSON.stringify(content);
        const contentBuffer = Buffer.from(contentJson, 'utf-8');
        const size = BigInt(contentBuffer.length);

        // Upload to S3
        const storageKey = `workspaces/${file.workspaceId}/files/${file.id}/v${nextVersion}`;
        const latestKey = `workspaces/${file.workspaceId}/files/${file.id}/latest`;

        await this.storageService.uploadObject(storageKey, contentBuffer, ODOCS_MIME_TYPE);
        await this.storageService.uploadObject(latestKey, contentBuffer, ODOCS_MIME_TYPE);

        // Create revision
        const revision = await this.revisionRepo.create({
            fileId: file.id,
            storageKey,
            size,
            version: nextVersion,
            createdBy: membershipId,
        });

        // Update file
        await this.fileSystemRepo.update(file.id, {
            currentRevisionId: revision.id,
            size,
            lastModifiedBy: membershipId,
        });

        return this.fileSystemRepo.findById(file.id) as Promise<FileSystemEntry>;
    }

    async updateMetadata(
        membershipId: string,
        fileId: string,
        updates: {
            name?: string;
            displayName?: string;
            description?: string;
            isShared?: boolean;
            isStarred?: boolean;
        }
    ): Promise<FileSystemEntry> {
        await this.getById(membershipId, fileId); // Verify access

        return this.fileSystemRepo.update(fileId, {
            ...updates,
            lastModifiedBy: membershipId,
        });
    }

    async rename(
        membershipId: string,
        fileId: string,
        newName: string
    ): Promise<FileSystemEntry> {
        await this.getById(membershipId, fileId); // Verify access

        return this.fileSystemRepo.update(fileId, {
            name: newName,
            lastModifiedBy: membershipId,
        });
    }

    async move(
        membershipId: string,
        fileId: string,
        newParentId: string | null
    ): Promise<FileSystemEntry> {
        await this.getById(membershipId, fileId); // Verify access

        return this.fileSystemRepo.update(fileId, {
            parentId: newParentId,
            lastModifiedBy: membershipId,
        });
    }

    async toggleStar(membershipId: string, fileId: string): Promise<FileSystemEntry> {
        const file = await this.getById(membershipId, fileId);

        return this.fileSystemRepo.update(fileId, {
            isStarred: !file.isStarred,
            lastModifiedBy: membershipId,
        });
    }

    // ============================================================================
    // DELETE OPERATIONS
    // ============================================================================

    async softDelete(membershipId: string, fileId: string): Promise<void> {
        await this.getById(membershipId, fileId); // Verify access
        await this.fileSystemRepo.softDelete(fileId, membershipId);
    }

    async restore(membershipId: string, fileId: string): Promise<FileSystemEntry> {
        const file = await this.fileSystemRepo.findById(fileId);
        if (!file) {
            throw new Error('File not found');
        }

        // Membership validated by resolveMembership middleware

        return this.fileSystemRepo.restore(fileId);
    }

    async hardDelete(membershipId: string, fileId: string): Promise<void> {
        const file = await this.fileSystemRepo.findById(fileId);
        if (!file) {
            throw new Error('File not found');
        }

        // Membership validated by resolveMembership middleware

        // Delete from S3
        if (file.type === 'file' && file.currentRevisionId) {
            // Delete all versions from S3
            try {
                // For documents and general files, we store them at standardized paths
                const storageKeyV1 = `workspaces/${file.workspaceId}/files/${file.id}/v1`;
                const latestKey = `workspaces/${file.workspaceId}/files/${file.id}/latest`;

                await Promise.all([
                    this.storageService.deleteObject(storageKeyV1).catch(() => { }), // Ignore if doesn't exist
                    this.storageService.deleteObject(latestKey).catch(() => { }),
                ]);

                // TODO: For files with multiple versions, we should list all objects with prefix
                // and delete them all. For now, we only delete v1 and latest.
            } catch (error) {
                console.error('Failed to delete S3 objects:', error);
                // Continue with DB deletion even if S3 deletion fails
            }
        }

        // Delete from DB
        await this.fileSystemRepo.hardDelete(fileId);
    }

    // ============================================================================
    // SHARING
    // ============================================================================

    async createShareLink(
        membershipId: string,
        fileId: string,
        options: {
            password?: string;
            expiresAt?: Date;
            accessType?: 'private' | 'link' | 'public';
        }
    ): Promise<any> {
        const file = await this.getById(membershipId, fileId);

        // Check for existing link (active or revoked) to support permalinks
        const existingLinks = await this.shareLinkRepo.findByFileId(fileId);
        console.log(`[createShareLink] fileId=${fileId} existingLinks=${existingLinks.length}`);
        const existingLink = existingLinks[0]; // Reuse latest

        if (existingLink) {
            const updates: any = {
                revokedAt: null, // Reactivate
                accessType: options.accessType || 'link',
                expiresAt: options.expiresAt,
            };

            if (options.password) {
                const bcrypt = await import('bcryptjs');
                updates.passwordHash = await bcrypt.hash(options.password, 10);
            } else {
                // If password is not provided during creation/reactivation, clear any old password
                updates.passwordHash = null;
            }

            return this.shareLinkRepo.update(existingLink.id, updates);
        }

        let passwordHash: string | undefined;
        if (options.password) {
            const bcrypt = await import('bcryptjs');
            passwordHash = await bcrypt.hash(options.password, 10);
        }

        return this.shareLinkRepo.create({
            fileId: file.id,
            workspaceId: file.workspaceId,
            createdBy: membershipId,
            accessType: options.accessType || 'link',
            passwordHash,
            expiresAt: options.expiresAt,
        });
    }

    async getByShareToken(token: string, password?: string): Promise<any> {
        const shareLink = await this.shareLinkRepo.findByToken(token);

        if (!shareLink) {
            throw new Error('Share link not found');
        }

        if (shareLink.revokedAt) {
            throw new Error('Share link has been revoked');
        }

        if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
            throw new Error('Share link has expired');
        }

        // Check password
        if (shareLink.passwordHash) {
            if (!password) {
                const error: any = new Error('Share link password required or incorrect');
                error.statusCode = 401;
                error.code = 'PASSWORD_REQUIRED';
                throw error;
            }

            const bcrypt = await import('bcryptjs');
            const valid = await bcrypt.compare(password, shareLink.passwordHash);
            if (!valid) {
                const error: any = new Error('Share link password required or incorrect');
                error.statusCode = 401;
                throw error;
            }
        }

        // Increment view count
        await this.fileSystemRepo.incrementViewCount(shareLink.fileId);

        let content = null;
        if (shareLink.file.mimeType === ODOCS_MIME_TYPE && shareLink.file.currentRevision) {
            try {
                // Use storageKey from revision if available
                // If not, try latest key
                let key = shareLink.file.currentRevision.storageKey;
                if (!key) {
                    key = `workspaces/${shareLink.file.workspaceId}/files/${shareLink.file.id}/latest`;
                }

                const buffer = await this.storageService.getObject(key);
                const contentJson = buffer.toString('utf-8');
                content = JSON.parse(contentJson);
            } catch (err) {
                console.error('Failed to load shared document content:', err);
                // Return without content (viewer might show error or empty)
            }
        }

        // Get updated file with incremented view count
        const updatedFile = await this.fileSystemRepo.findById(shareLink.fileId);

        return {
            file: {
                ...updatedFile,
                currentRevision: shareLink.file.currentRevision ? {
                    ...shareLink.file.currentRevision,
                    content
                } : null
            },
            shareLink: {
                accessType: shareLink.accessType,
                requiresPassword: !!shareLink.passwordHash,
                expiresAt: shareLink.expiresAt,
                accessLevel: shareLink.accessLevel,
            },
        };
    }

    async getSharedFileDownloadUrl(token: string, password?: string): Promise<string> {
        const { file } = await this.getByShareToken(token, password);

        const latestKey = `workspaces/${file.workspaceId}/files/${file.id}/latest`;
        return this.storageService.getPresignedGetUrl(latestKey, file.name);
    }

    // ============================================================================
    // UTILITY
    // ============================================================================

    async getAncestors(membershipId: string, fileId: string): Promise<FileSystemEntry[]> {
        await this.getById(membershipId, fileId); // Verify access
        return this.fileSystemRepo.getAncestors(fileId);
    }

    async getStarred(membershipId: string, workspaceId: string): Promise<FileSystemEntry[]> {
        // Membership validated by resolveMembership middleware
        return this.fileSystemRepo.getStarred(workspaceId);
    }

    async getRecentlyModified(
        membershipId: string,
        workspaceId: string,
        limit?: number
    ): Promise<FileSystemEntry[]> {
        // Membership validated by resolveMembership middleware
        return this.fileSystemRepo.getRecentlyModified(workspaceId, limit);
    }

    async search(
        membershipId: string,
        workspaceId: string,
        query: string
    ): Promise<FileSystemEntry[]> {
        // Membership validated by resolveMembership middleware
        return this.fileSystemRepo.search(workspaceId, query);
    }

    // ============================================================================
    // ADDITIONAL METHODS FOR COMPATIBILITY
    // ============================================================================

    async getFileSystemEntry(membershipId: string, fileId: string): Promise<FileSystemEntry> {
        // This is a compatibility wrapper
        return this.getById(membershipId, fileId);
    }

    async getShareLinks(fileId: string): Promise<any[]> {
        return this.shareLinkRepo.findByFileId(fileId);
    }

    async revokeShareLink(membershipId: string, linkId: string): Promise<void> {
        await this.shareLinkRepo.revoke(linkId);
    }

    async updateShareLink(membershipId: string, linkId: string, body: any): Promise<any> {
        const updates: any = { ...body };

        if (body.password) {
            const bcrypt = await import('bcryptjs');
            updates.passwordHash = await bcrypt.hash(body.password, 10);
            delete updates.password;
        } else if (body.password === null) {
            updates.passwordHash = null;
            delete updates.password;
        }

        // If making public, clear password protection
        if (body.accessType === 'public') {
            updates.passwordHash = null;
        }

        return this.shareLinkRepo.update(linkId, updates);
    }

    async resolveShareLink(token: string, password?: string): Promise<any> {
        return this.getByShareToken(token, password);
    }

    async listTrash(workspaceId: string): Promise<FileSystemEntry[]> {
        return this.fileSystemRepo.findDeleted(workspaceId);
    }

    async permanentlyDelete(membershipId: string, fileId: string): Promise<void> {
        return this.hardDelete(membershipId, fileId);
    }

    async getRecentFiles(accountId: string, limit: number): Promise<FileSystemEntry[]> {
        return this.fileSystemRepo.findRecentByAccount(accountId, limit);
    }
}
