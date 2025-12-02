import { PrismaClient, FileSystemType, FileSystemEntry } from '@prisma/client';

export interface FileSystemEntryWithRelations extends FileSystemEntry {
    parent?: FileSystemEntry | null;
    children?: FileSystemEntry[];
    currentRevision?: any;
    creator?: any;
    shareLinks?: any[];
}

export interface CreateFileSystemEntryInput {
    name: string;
    type: FileSystemType;
    parentId?: string | null;
    workspaceId: string;
    mimeType?: string;
    extension?: string;
    size?: bigint;
    fileIndex?: number;
    createdBy: string;
}

export interface UpdateFileSystemEntryInput {
    name?: string;
    displayName?: string;
    parentId?: string | null;
    currentRevisionId?: string;
    size?: bigint;
    lastModifiedBy?: string;
    description?: string;
    tags?: string[];
    isStarred?: boolean;
    isShared?: boolean;
}

export class FileSystemRepository {
    constructor(private db: PrismaClient) { }

    async create(data: CreateFileSystemEntryInput): Promise<FileSystemEntry> {
        return this.db.fileSystemEntry.create({
            data: {
                ...data,
                // Ensure parentId is null if undefined
                parentId: data.parentId || null,
                displayName: data.name, // Initialize displayName with name
                // description and tags are not part of CreateFileSystemEntryInput anymore
                // isShared defaults to false in schema
            },
        });
    }

    async findById(id: string): Promise<FileSystemEntryWithRelations | null> {
        return this.db.fileSystemEntry.findUnique({
            where: { id },
            include: {
                parent: true,
                children: true,
                currentRevision: true,
                creator: {
                    include: {
                        account: {
                            select: {
                                email: true,
                                legalName: true,
                            },
                        },
                    },
                },
                shareLinks: {
                    where: { revokedAt: null },
                    select: {
                        id: true,
                        token: true,
                        accessLevel: true,
                        accessType: true,
                        expiresAt: true,
                        createdAt: true,
                        passwordHash: true,
                    },
                },
            },
        });
    }

    async findByWorkspace(
        workspaceId: string,
        options?: {
            parentId?: string | null;
            type?: FileSystemType;
            includeDeleted?: boolean;
        }
    ): Promise<FileSystemEntry[]> {
        const where: any = {
            workspaceId,
            deletedAt: options?.includeDeleted ? undefined : null,
        };

        if (options?.parentId !== undefined) {
            where.parentId = options.parentId;
        }

        if (options?.type) {
            where.type = options.type;
        }

        return this.db.fileSystemEntry.findMany({
            where,
            include: {
                currentRevision: true,
                creator: {
                    include: {
                        account: {
                            select: {
                                email: true,
                                legalName: true,
                            },
                        },
                    },
                },
                shareLinks: {
                    where: {
                        revokedAt: null,
                    },
                    select: {
                        id: true,
                        token: true,
                        accessLevel: true,
                        accessType: true,
                        expiresAt: true,
                        createdAt: true,
                        passwordHash: true,
                    },
                },
            },
            orderBy: [
                { type: 'asc' }, // folders first
                { name: 'asc' },
            ],
        });
    }

    async findBySlug(workspaceId: string, slug: string): Promise<FileSystemEntry | null> {
        // For .odocs files, we might use slug in the name or as metadata
        // For now, search by name
        const entries = await this.db.fileSystemEntry.findMany({
            where: {
                workspaceId,
                type: 'file',
                mimeType: 'application/x-odocs',
                deletedAt: null,
            },
        });

        // Simple slug matching (you can enhance this)
        return entries.find(e => e.name.toLowerCase().replace(/\s+/g, '-') === slug) || null;
    }

    async update(id: string, input: UpdateFileSystemEntryInput): Promise<FileSystemEntry> {
        const data: any = {};

        if (input.name !== undefined) data.name = input.name;
        if (input.displayName !== undefined) data.displayName = input.displayName;
        if (input.parentId !== undefined) data.parentId = input.parentId;
        if (input.currentRevisionId !== undefined) data.currentRevisionId = input.currentRevisionId;
        if (input.size !== undefined) data.size = input.size;
        if (input.lastModifiedBy !== undefined) data.lastModifiedBy = input.lastModifiedBy;
        if (input.description !== undefined) data.description = input.description;
        if (input.tags !== undefined) data.tags = input.tags;
        if (input.isStarred !== undefined) data.isStarred = input.isStarred;
        if (input.isShared !== undefined) data.isShared = input.isShared;

        data.updatedAt = new Date();

        return this.db.fileSystemEntry.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string, deletedBy: string): Promise<FileSystemEntry> {
        // Store original parent for restore
        const entry = await this.db.fileSystemEntry.findUnique({
            where: { id },
            select: { parentId: true },
        });

        return this.db.fileSystemEntry.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy,
                originalParentId: entry?.parentId,
                parentId: null, // Move to root of trash
            },
        });
    }

    async restore(id: string): Promise<FileSystemEntry> {
        const entry = await this.db.fileSystemEntry.findUnique({
            where: { id },
            select: { originalParentId: true },
        });

        return this.db.fileSystemEntry.update({
            where: { id },
            data: {
                deletedAt: null,
                deletedBy: null,
                parentId: entry?.originalParentId,
                originalParentId: null,
            },
        });
    }

    async hardDelete(id: string): Promise<void> {
        await this.db.fileSystemEntry.delete({
            where: { id },
        });
    }

    async getAncestors(id: string): Promise<FileSystemEntry[]> {
        console.log(`[getAncestors] Starting for id: ${id}`);
        const ancestors: FileSystemEntry[] = [];
        let currentId: string | null = id;

        // First, get the starting entry to find its parent
        const startEntry = await this.db.fileSystemEntry.findUnique({
            where: { id: currentId },
        });

        if (!startEntry) {
            console.log(`[getAncestors] Start entry not found`);
            return ancestors;
        }

        // Start from the parent of the current file/folder
        currentId = startEntry.parentId;

        // Traverse up the parent chain
        while (currentId) {
            const parent: FileSystemEntry | null = await this.db.fileSystemEntry.findUnique({
                where: { id: currentId },
            });

            console.log(`[getAncestors] Fetched parent:`, parent ? { id: parent.id, name: parent.name, parentId: parent.parentId } : 'NULL');

            if (!parent) {
                console.log(`[getAncestors] Parent not found, breaking`);
                break;
            }

            // Add this parent to ancestors
            ancestors.unshift(parent);

            // Move to the next parent up
            currentId = parent.parentId;
        }

        console.log(`[getAncestors] Final ancestors (${ancestors.length}):`, ancestors.map(a => a.name));
        return ancestors;
    }

    async getStarred(workspaceId: string): Promise<FileSystemEntry[]> {
        return this.db.fileSystemEntry.findMany({
            where: {
                workspaceId,
                isStarred: true,
                deletedAt: null,
            },
            include: {
                currentRevision: true,
                shareLinks: {
                    where: { revokedAt: null },
                    select: {
                        id: true,
                        token: true,
                        accessLevel: true,
                        accessType: true,
                        expiresAt: true,
                        createdAt: true,
                        passwordHash: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }

    async getRecentlyModified(workspaceId: string, limit: number = 20): Promise<FileSystemEntry[]> {
        return this.db.fileSystemEntry.findMany({
            where: {
                workspaceId,
                type: 'file',
                deletedAt: null,
            },
            include: {
                currentRevision: true,
                shareLinks: {
                    where: { revokedAt: null },
                    select: {
                        id: true,
                        token: true,
                        accessLevel: true,
                        accessType: true,
                        expiresAt: true,
                        createdAt: true,
                        passwordHash: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: limit,
        });
    }

    async search(workspaceId: string, query: string): Promise<FileSystemEntry[]> {
        return this.db.fileSystemEntry.findMany({
            where: {
                workspaceId,
                deletedAt: null,
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            include: {
                currentRevision: true,
                shareLinks: {
                    where: { revokedAt: null },
                    select: {
                        id: true,
                        token: true,
                        accessLevel: true,
                        accessType: true,
                        expiresAt: true,
                        createdAt: true,
                        passwordHash: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }

    async findDeleted(workspaceId: string): Promise<FileSystemEntry[]> {
        return this.db.fileSystemEntry.findMany({
            where: {
                workspaceId,
                deletedAt: {
                    not: null,
                },
            },
            include: {
                currentRevision: true,
                shareLinks: {
                    where: { revokedAt: null },
                    select: {
                        id: true,
                        token: true,
                        accessLevel: true,
                        accessType: true,
                        expiresAt: true,
                        createdAt: true,
                        passwordHash: true,
                    },
                },
            },
            orderBy: {
                deletedAt: 'desc',
            },
        });
    }

    async findRecentByAccount(accountId: string, limit: number): Promise<FileSystemEntry[]> {
        return this.db.fileSystemEntry.findMany({
            where: {
                workspace: {
                    memberships: {
                        some: {
                            accountId,
                            status: 'active',
                        },
                    },
                },
                type: 'file',
                deletedAt: null,
            },
            include: {
                currentRevision: {
                    include: {
                        creator: {
                            select: {
                                displayName: true,
                                account: {
                                    select: {
                                        legalName: true,
                                    },
                                },
                            },
                        },
                    },
                },
                shareLinks: {
                    where: { revokedAt: null },
                    select: {
                        id: true,
                        token: true,
                        accessLevel: true,
                        accessType: true,
                        expiresAt: true,
                        createdAt: true,
                        passwordHash: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: limit,
        });
    }

    async incrementViewCount(id: string): Promise<void> {
        // Only increment view count for files, not folders
        const entry = await this.db.fileSystemEntry.findUnique({
            where: { id },
            select: { type: true, name: true, viewCount: true },
        });

        if (entry?.type !== 'file') {
            console.log(`[incrementViewCount] Skipping non-file: ${id}`);
            return; // Skip increment for folders
        }

        console.log(`[incrementViewCount] Incrementing view count for file: ${entry.name} (current: ${entry.viewCount})`);

        await this.db.fileSystemEntry.update({
            where: { id },
            data: {
                viewCount: {
                    increment: 1,
                },
            },
        });

        console.log(`[incrementViewCount] View count incremented for file: ${entry.name} (new: ${entry.viewCount + 1})`);
    }



    async getNextFileIndexAtomic(workspaceId: string): Promise<number> {
        const workspace = await this.db.workspace.update({
            where: { id: workspaceId },
            data: {
                lastFileIndex: {
                    increment: 1
                }
            },
            select: { lastFileIndex: true }
        });
        return workspace.lastFileIndex;
    }
}
