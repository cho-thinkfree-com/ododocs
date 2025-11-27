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
                    slug: true,
                },
            },
        },
    })

    if (!membership) {
        return reply.status(404).send({ message: 'Blog not found' })
    }

    // Fetch public documents for this profile
    const page = parseInt((request.query as any).page) || 1;
    const limit = parseInt((request.query as any).limit) || 10;
    const skip = (page - 1) * limit;

    const where = {
        workspaceId: membership.workspaceId,
        ownerMembershipId: membership.id,
        OR: [
            { visibility: 'public' },
            { shareLinks: { some: { isPublic: true } } }
        ],
        deletedAt: null,
    };

    const [total, documents] = await Promise.all([
        db.document.count({ where }),
        db.document.findMany({
            where,
            select: {
                id: true,
                title: true,
                slug: true,
                documentNumber: true,
                status: true,
                visibility: true,
                summary: true,
                createdAt: true,
                updatedAt: true,
                contentSize: true,
                viewCount: true,
                shareLinks: {
                    where: { isPublic: true },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit,
        })
    ]);

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
        blogDescription: membership.blogDescription,
    }

    const documentSummaries = documents.map((doc: any) => ({
        ...doc,
        shareLinks: undefined, // Don't expose share links array
        publicToken: doc.shareLinks?.[0]?.token // Expose one public token if available
    }));

    return {
        profile,
        documents: documentSummaries,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
});

// Get single blog document
app.get<{
    Params: { handle: string; documentNumber: string; titleSlug?: string }
}>('/:handle/documents/:documentNumber/:titleSlug?', async (request, reply) => {
    const { handle, documentNumber } = request.params;
    const db = request.db as DatabaseClient

    const membership = await db.workspaceMembership.findUnique({
        where: { blogHandle: handle },
    });

    if (!membership) {
        return reply.status(404).send({ message: 'Blog not found' });
    }

    const docNumber = parseInt(documentNumber, 10);
    if (isNaN(docNumber)) {
        return reply.status(400).send({ message: 'Invalid document number' });
    }

    const document = await db.document.findFirst({
        where: {
            workspaceId: membership.workspaceId,
            ownerMembershipId: membership.id,
            documentNumber: docNumber,
            OR: [
                { visibility: 'public' },
                { shareLinks: { some: { isPublic: true } } }
            ],
            deletedAt: null,
        },
        include: {
            shareLinks: {
                where: { isPublic: true },
                take: 1
            }
        }
    });

    if (!document) {
        return reply.status(404).send({ message: 'Document not found' });
    }

    // Get latest revision
    const revision = await db.documentRevision.findFirst({
        where: { documentId: document.id },
        orderBy: { createdAt: 'desc' },
    });

    // Increment view count (async)
    db.document.update({
        where: { id: document.id },
        data: { viewCount: { increment: 1 } },
    }).catch(console.error);

    return {
        document: {
            ...document,
            shareLinks: undefined,
            publicToken: document.shareLinks?.[0]?.token
        },
        revision,
        accessLevel: 'viewer',
        createdByMembershipId: document.ownerMembershipId
    };
});
}
