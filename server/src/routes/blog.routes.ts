import { FastifyInstance } from 'fastify'
import { DatabaseClient } from '../lib/prismaClient.js'
import { isReservedHandle } from '../lib/reservedHandles.js'
import { ShareLinkAccessType } from '@prisma/client'

export default async function blogRoutes(app: FastifyInstance) {
    app.get<{ Querystring: { handle: string } }>('/check-handle', async (request) => {
        const { handle } = request.query
        const db = request.db as DatabaseClient

        if (!handle || handle.length < 4) {
            return { available: false }
        }

        // Check reserved words
        if (isReservedHandle(handle)) {
            return { available: false }
        }

        const existing = await db.workspaceMembership.findUnique({
            where: { blogHandle: handle },
            select: { id: true },
        })

        return { available: !existing }
    })

    app.get<{ Params: { handle: string } }>('/:handle', async (request, reply) => {
        const { handle } = request.params
        const db = request.db as DatabaseClient

        const membership = await db.workspaceMembership.findUnique({
            where: { blogHandle: handle },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        // slug: true, // Workspace slug removed from schema?
                    },
                },
                account: {
                    select: {
                        legalName: true,
                        preferredLocale: true,
                    }
                }
            },
        })

        if (!membership) {
            return reply.status(404).send({ message: 'Blog not found' })
        }

        // Fetch public documents for this profile
        const page = parseInt((request.query as any).page) || 1
        const limit = parseInt((request.query as any).limit) || 10
        const skip = (page - 1) * limit

        const where = {
            workspaceId: membership.workspaceId,
            createdBy: membership.id,
            type: 'file' as const,
            OR: [
                { shareLinks: { some: { accessType: ShareLinkAccessType.public, revokedAt: null } } }
            ],
            deletedAt: null,
        }

        const [total, documents] = await Promise.all([
            db.fileSystemEntry.count({ where }),
            db.fileSystemEntry.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                    fileIndex: true,
                    description: true,
                    createdAt: true,
                    updatedAt: true,
                    size: true,
                    viewCount: true,
                    shareLinks: {
                        where: { accessType: 'public', revokedAt: null },
                        take: 1,
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
        ])

        // Format response
        const profile = {
            id: membership.id,
            workspaceId: membership.workspaceId,
            accountId: membership.accountId,
            role: membership.role,
            status: membership.status,
            displayName: membership.displayName || membership.account.legalName,
            // avatarUrl: membership.avatarUrl, // Not in schema
            timezone: membership.timezone,
            preferredLocale: membership.locale || membership.account.preferredLocale,
            blogTheme: membership.blogTheme,
            blogHandle: membership.blogHandle,
            blogDescription: membership.blogDescription,
        }

        const documentSummaries = documents.map((doc: any) => ({
            ...doc,
            title: doc.displayName || doc.name, // Map displayName/name to title
            shareLinks: undefined, // Don't expose share links array
            publicToken: doc.shareLinks?.[0]?.token, // Expose one public token if available
            documentNumber: doc.fileIndex, // Map fileIndex to documentNumber
        }))

        return {
            profile,
            documents: documentSummaries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }
    })

    // Get single blog document
    app.get<{
        Params: { handle: string; documentNumber: string; titleSlug?: string }
    }>('/:handle/documents/:documentNumber/:titleSlug?', async (request, reply) => {
        const { handle, documentNumber } = request.params
        const db = request.db as DatabaseClient

        const membership = await db.workspaceMembership.findUnique({
            where: { blogHandle: handle },
        })

        if (!membership) {
            return reply.status(404).send({ message: 'Blog not found' })
        }

        const docNumber = parseInt(documentNumber, 10)
        if (isNaN(docNumber)) {
            return reply.status(400).send({ message: 'Invalid document number' })
        }

        // Find file by index and workspace
        const document = await db.fileSystemEntry.findFirst({
            where: {
                workspaceId: membership.workspaceId,
                fileIndex: docNumber,
                type: 'file' as const,
                OR: [
                    { shareLinks: { some: { accessType: ShareLinkAccessType.public, revokedAt: null } } }
                ],
                deletedAt: null,
            },
            include: {
                currentRevision: true,
                shareLinks: {
                    where: { accessType: 'public', revokedAt: null },
                    take: 1,
                },
                creator: {
                    include: {
                        account: {
                            select: {
                                legalName: true,
                            },
                        },
                    },
                },
            },
        })

        if (!document) {
            return reply.status(404).send({ message: 'Document not found' })
        }

        // Increment view count (async)
        db.fileSystemEntry.update({
            where: { id: document.id },
            data: { viewCount: { increment: 1 } },
        }).catch(console.error)

        return {
            document: {
                ...document,
                shareLinks: undefined,
                publicToken: document.shareLinks?.[0]?.token,
            },
            revision: document.currentRevision,
            accessLevel: 'viewer',
            createdByMembershipId: document.createdBy,
        }
    })
}
