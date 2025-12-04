import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { FileSystemService } from '../filesystem/fileSystemService.js'
import type { StorageService } from '../storage/storageService.js'
import type { WorkspaceAccessService } from '../workspaces/workspaceAccess.js'
import type { ShareLinkRepository } from '../filesystem/shareLinkRepository.js'

export async function documentAssetRoutes(
    fastify: FastifyInstance,
    options: {
        fileSystemService: FileSystemService
        storageService: StorageService
        workspaceAccess: WorkspaceAccessService
        shareLinkRepository: ShareLinkRepository
        authenticate: (req: FastifyRequest) => Promise<void>
    }
) {
    const { fileSystemService, storageService, workspaceAccess, shareLinkRepository, authenticate } = options

    // Validation schemas
    const uploadSchema = z.object({
        mimeType: z.string(),
    })

    const resolveSchema = z.object({
        urls: z.array(z.string()),
        shareToken: z.string().optional(), // Optional share token for public access
    })

    // Upload Asset (Presigned URL)
    fastify.post('/api/workspaces/:workspaceId/files/:documentId/assets/upload', {
        preHandler: authenticate,
        handler: async (req, reply) => {
            const { workspaceId, documentId } = req.params as { workspaceId: string; documentId: string }
            const body = uploadSchema.parse(req.body)
            const accountId = req.accountId!

            // Check that document exists and user has access
            const document = await fileSystemService.getFileSystemEntry(accountId, documentId)
            await workspaceAccess.assertMember(accountId, workspaceId)

            const assetId = uuidv4()
            const key = `workspaces/${workspaceId}/files/${documentId}/assets/${assetId}`

            const uploadUrl = await storageService.getPresignedPutUrl(key, body.mimeType)

            // Asset URL format:
            // - remote: odocsassets://remote/workspaces/{wid}/files/{fid}/assets/{uuid}
            //   -> Stored in S3, requires API call to resolve to presigned URL
            // 
            // - embedded (future): odocsassets://embedded/{uuid}
            //   -> Base64 data stored directly in document JSON
            //   -> Used for exports, offline documents, or small images
            //   -> Implementation TODO: Add embedded asset storage in document content
            const odocsUrl = `odocsassets://remote/workspaces/${workspaceId}/files/${documentId}/assets/${assetId}`

            return { uploadUrl, odocsUrl }
        },
    })

    // Resolve multiple Asset URLs (supports both authenticated and share token access)
    fastify.post('/api/workspaces/:workspaceId/files/:documentId/assets/resolve', {
        handler: async (req, reply) => {
            const { workspaceId, documentId } = req.params as { workspaceId: string; documentId: string }
            const body = resolveSchema.parse(req.body)

            // Try authentication first, if it fails, check for share token
            let hasAccess = false
            let accountId: string | undefined

            try {
                await authenticate(req)
                accountId = req.accountId
                // Verify workspace access
                await fileSystemService.getFileSystemEntry(accountId!, documentId)
                await workspaceAccess.assertMember(accountId!, workspaceId)
                hasAccess = true
            } catch (authError) {
                // Authentication failed, check for share token
                if (body.shareToken) {
                    const shareLink = await shareLinkRepository.findByToken(body.shareToken)

                    if (!shareLink || shareLink.revokedAt) {
                        throw new Error('Invalid or revoked share link')
                    }

                    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
                        throw new Error('Share link has expired')
                    }

                    if (shareLink.fileId !== documentId) {
                        throw new Error('Share link does not match requested file')
                    }

                    // Share token is valid
                    hasAccess = true
                } else {
                    // No valid authentication method
                    throw new Error('Authentication required')
                }
            }

            if (!hasAccess) {
                throw new Error('Access denied')
            }

            const resolved: Record<string, string> = {}

            await Promise.all(body.urls.map(async (url) => {
                // Parse URL: odocsassets://remote/workspaces/{wid}/files/{fid}/assets/{uuid}
                const match = url.match(/^odocsassets:\/\/remote\/workspaces\/([^\/]+)\/files\/([^\/]+)\/assets\/([^\/]+)$/)
                if (match) {
                    const [, wsId, fileId, assetId] = match
                    // Security check: ensure the asset belongs to the requested document/workspace
                    if (wsId === workspaceId && fileId === documentId) {
                        const key = `workspaces/${workspaceId}/files/${documentId}/assets/${assetId}`
                        resolved[url] = await storageService.getPresignedGetUrl(key)
                    }
                }

                // TODO: Future support for embedded assets
                // else if (url.startsWith('odocsassets://embedded/')) {
                //   const embeddedMatch = url.match(/^odocsassets:\/\/embedded\/([^\/]+)$/)
                //   if (embeddedMatch) {
                //     const [, uuid] = embeddedMatch
                //     // Look up embedded asset data in document content
                //     // Return base64 data URL directly
                //     // resolved[url] = `data:image/png;base64,...`
                //   }
                // }
            }))

            return { resolved }
        },
    })
}
