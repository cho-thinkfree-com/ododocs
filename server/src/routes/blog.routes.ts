import { type FastifyInstance } from 'fastify'
import { type DatabaseClient } from '../lib/prismaClient.js'

export default async function blogRoutes(app: FastifyInstance) {
    app.get<{ Querystring: { handle: string } }>('/check-handle', async (request, reply) => {
        const { handle } = request.query
        const db = request.db as DatabaseClient

        if (!handle || handle.length < 4) {
            return { available: false }
        }

        // Check reserved words (basic list for now, should be expanded)
        const reserved = ['admin', 'blog', 'api', 'dashboard', 'settings', 'login', 'signup', 'help', 'support', 'status']
        if (reserved.includes(handle.toLowerCase())) {
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
                        slug: true,
                    },
                },
            },
        })

        if (!membership) {
            return reply.status(404).send({ message: 'Blog not found' })
        }

        // Fetch public documents for this profile
        const documents = await db.document.findMany({
            where: {
                workspaceId: membership.workspaceId,
                ownerMembershipId: membership.id,
                OR: [
                    { visibility: 'public' },
                    { shareLinks: { some: { isPublic: true } } }
                ],
                deletedAt: null,
            },
            select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                updatedAt: true,
                createdAt: true,
                viewCount: true,
                workspaceId: true,
                status: true,
                visibility: true,
                isImportant: true,
                tags: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })

        // Format response
        const profile = {
            id: membership.id,
            workspaceId: membership.workspaceId,
            accountId: membership.accountId,
            role: membership.role,
            status: membership.status,
            displayName: membership.displayName,
            avatarUrl: membership.avatarUrl,
            timezone: membership.timezone,
            preferredLocale: membership.preferredLocale,
            blogTheme: membership.blogTheme,
            blogHandle: membership.blogHandle,
        }

        const documentSummaries = documents.map((doc: any) => ({
            ...doc,
            tags: doc.tags.map((t: any) => t.name),
        }))

        return {
            profile,
            documents: documentSummaries,
        }
    })
}
