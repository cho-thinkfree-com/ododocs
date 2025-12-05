import { PrismaClient } from '@prisma/client';

export interface BlogProfile {
    blogHandle: string;
    displayName: string;
    blogDescription?: string;
    blogTheme?: string;
    membershipId: string;
}

export interface BlogDocument {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    createdAt: Date;
    updatedAt: Date;
    documentNumber?: number;
}

export class BlogRepository {
    constructor(private db: PrismaClient) { }

    async findProfileByHandle(handle: string): Promise<BlogProfile | null> {
        const membership = await this.db.workspaceMembership.findFirst({
            where: {
                blogHandle: handle,
                status: 'active',
            },
            include: {
                workspace: true,
            },
        });

        if (!membership) {
            return null;
        }

        return {
            blogHandle: membership.blogHandle!,
            displayName: membership.displayName || handle,
            blogDescription: membership.blogDescription || undefined,
            blogTheme: membership.blogTheme || undefined,
            membershipId: membership.id,
        };
    }

    async findProfileByMembershipId(membershipId: string): Promise<BlogProfile | null> {
        const membership = await this.db.workspaceMembership.findUnique({
            where: {
                id: membershipId,
            },
            include: {
                workspace: true,
            },
        });

        if (!membership) {
            return null;
        }

        return {
            blogHandle: membership.blogHandle || '',
            displayName: membership.displayName || 'Unknown',
            blogDescription: membership.blogDescription || undefined,
            blogTheme: membership.blogTheme || undefined,
            membershipId: membership.id,
        };
    }

    async findPublicDocuments(
        membershipId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ documents: BlogDocument[]; total: number }> {
        const skip = (page - 1) * limit;

        // Get membership to find workspace
        const membership = await this.db.workspaceMembership.findUnique({
            where: { id: membershipId },
            include: { workspace: true },
        });

        if (!membership) {
            return { documents: [], total: 0 };
        }

        // Only show documents if workspace is public
        // OR if you want personal blogs to work regardless of workspace visibility,
        // you can remove this check
        const workspaceIsPublic = membership.workspace.visibility === 'public';

        // Find public documents created by this member
        const [documents, total] = await Promise.all([
            this.db.fileSystemEntry.findMany({
                where: {
                    createdBy: membershipId,
                    type: 'file',
                    mimeType: 'application/x-odocs',
                    deletedAt: null,
                    isShared: true,
                    shareLinks: {
                        some: {
                            revokedAt: null,
                            accessType: 'public'
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    createdAt: true,
                    updatedAt: true,
                    viewCount: true,
                    fileIndex: true,
                    shareLinks: {
                        where: {
                            revokedAt: null,
                            accessType: 'public'
                        },
                        take: 1,
                        select: {
                            token: true,
                            accessType: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.db.fileSystemEntry.count({
                where: {
                    createdBy: membershipId,
                    type: 'file',
                    mimeType: 'application/x-odocs',
                    deletedAt: null,
                    isShared: true,
                    shareLinks: {
                        some: {
                            revokedAt: null,
                            accessType: 'public'
                        }
                    }
                },
            }),
        ]);

        return {
            documents: documents.map((doc: any) => ({
                id: doc.id,
                title: doc.name,
                slug: doc.name.toLowerCase().replace(/\s+/g, '-'),
                excerpt: doc.description || undefined,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                viewCount: doc.viewCount,
                documentNumber: doc.fileIndex,
                publicToken: doc.shareLinks[0]?.token,
                shareLink: doc.shareLinks[0] ? {
                    accessType: doc.shareLinks[0].accessType,
                    token: doc.shareLinks[0].token,
                } : undefined,
            })),
            total,
        };
    }

    async findDocumentByIndex(membershipId: string, fileIndex: number) {
        const document = await this.db.fileSystemEntry.findFirst({
            where: {
                workspace: {
                    memberships: {
                        some: { id: membershipId }
                    }
                },
                fileIndex,
                type: 'file',
                deletedAt: null,
                OR: [
                    { shareLinks: { some: { accessType: 'public', revokedAt: null } } }
                ]
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
        });

        if (!document) return null;

        // Increment view count
        this.db.fileSystemEntry.update({
            where: { id: document.id },
            data: { viewCount: { increment: 1 } },
        }).catch(console.error);

        return {
            document: {
                id: document.id,
                workspaceId: document.workspaceId,
                name: document.name,
                title: document.displayName || document.name,
                fileIndex: document.fileIndex,
                documentNumber: document.fileIndex,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
                viewCount: document.viewCount + 1,
                creator: document.creator,
                shareLinks: undefined,
                publicToken: document.shareLinks?.[0]?.token,
            },
            revision: document.currentRevision,
            accessLevel: 'viewer',
            createdByMembershipId: document.createdBy,
        };
    }

    async checkHandleAvailability(handle: string): Promise<boolean> {
        const existing = await this.db.workspaceMembership.findFirst({
            where: {
                blogHandle: handle,
            },
        });

        return !existing;
    }
}
