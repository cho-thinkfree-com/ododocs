import { FastifyInstance } from 'fastify'
import { DocumentService } from './documentService.js'
import { z } from 'zod'

export async function documentAssetRoutes(fastify: FastifyInstance, options: { documentService: DocumentService }) {
    const { documentService } = options

    // Upload Asset Draft (Presigned URL)
    fastify.post('/api/workspaces/:workspaceId/documents/:documentId/assets/upload', {
        schema: {
            params: z.object({
                workspaceId: z.string().uuid(),
                documentId: z.string().uuid(),
            }),
            body: z.object({
                mimeType: z.string(),
            }),
        },
        handler: async (req, reply) => {
            const { workspaceId, documentId } = req.params as { workspaceId: string; documentId: string }
            const { mimeType } = req.body as { mimeType: string }
            const accountId = req.user!.id

            // Verify workspace match (optional but good for consistency)
            // documentService.createAssetUploadUrl handles permission checks.

            const result = await documentService.createAssetUploadUrl(accountId, documentId, mimeType)
            return result
        },
    })

    // View Asset (Redirect to Presigned URL)
    fastify.get('/api/workspaces/:workspaceId/documents/:documentId/assets/:assetId', {
        schema: {
            params: z.object({
                workspaceId: z.string().uuid(),
                documentId: z.string().uuid(),
                assetId: z.string().uuid(),
            }),
        },
        handler: async (req, reply) => {
            const { workspaceId, documentId, assetId } = req.params as { workspaceId: string; documentId: string; assetId: string }
            const accountId = req.user!.id

            const url = await documentService.getAssetViewUrl(accountId, workspaceId, documentId, assetId)
            return reply.redirect(url)
        },
    })

    // Resolve multiple Asset URLs
    fastify.post('/api/workspaces/:workspaceId/documents/:documentId/assets/resolve', {
        schema: {
            params: z.object({
                workspaceId: z.string().uuid(),
                documentId: z.string().uuid(),
            }),
            body: z.object({
                urls: z.array(z.string()),
            }),
        },
        handler: async (req, reply) => {
            const { workspaceId, documentId } = req.params as { workspaceId: string; documentId: string }
            const { urls } = req.body as { urls: string[] }
            const accountId = req.user!.id

            const resolved = await documentService.resolveAssetUrls(accountId, workspaceId, documentId, urls)
            return { resolved }
        },
    })
}
