import { PrismaClient, ShareLink, ShareLinkAccess, ShareLinkAccessType } from '@prisma/client';

export interface CreateShareLinkInput {
    fileId: string;
    workspaceId: string;
    createdBy: string;
    accessLevel?: ShareLinkAccess;
    accessType?: ShareLinkAccessType;
    passwordHash?: string;
    expiresAt?: Date;
}

export interface ShareLinkWithFile extends ShareLink {
    file?: any;
}

export class ShareLinkRepository {
    constructor(private db: PrismaClient) { }

    async create(input: CreateShareLinkInput): Promise<ShareLink> {
        let retries = 3;
        while (retries > 0) {
            try {
                const token = this.generateToken();

                return await this.db.shareLink.create({
                    data: {
                        token,
                        fileId: input.fileId,
                        workspaceId: input.workspaceId,
                        createdBy: input.createdBy,
                        accessLevel: input.accessLevel || 'viewer',
                        accessType: input.accessType || 'link',
                        passwordHash: input.passwordHash,
                        expiresAt: input.expiresAt,
                    },
                });
            } catch (error: any) {
                // P2002 is Prisma's unique constraint violation code
                if (error.code === 'P2002' && error.meta?.target?.includes('token')) {
                    retries--;
                    if (retries === 0) throw error;
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Failed to generate unique token');
    }

    async findByToken(token: string): Promise<ShareLinkWithFile | null> {
        return this.db.shareLink.findUnique({
            where: { token },
            include: {
                file: {
                    include: {
                        currentRevision: true,
                        creator: {
                            select: {
                                id: true,
                                blogHandle: true,
                                displayName: true,
                                account: {
                                    select: {
                                        email: true,
                                        legalName: true,
                                    }
                                }
                            }
                        }
                    },
                },
            },
        });
    }

    async findByFileId(fileId: string): Promise<ShareLink[]> {
        return this.db.shareLink.findMany({
            where: { fileId },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findPublicByFileId(fileId: string): Promise<ShareLink | null> {
        return this.db.shareLink.findFirst({
            where: {
                fileId,
                accessType: 'public',
                revokedAt: null,
            },
        });
    }

    async revoke(id: string): Promise<ShareLink> {
        return this.db.shareLink.update({
            where: { id },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    async update(id: string, data: Partial<{ accessType: ShareLinkAccessType; expiresAt: Date | null; passwordHash: string | null; revokedAt: Date | null }>): Promise<ShareLink> {
        return this.db.shareLink.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<void> {
        await this.db.shareLink.delete({
            where: { id },
        });
    }

    private generateToken(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }
}
