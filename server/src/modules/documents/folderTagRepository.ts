import type { DatabaseClient } from '../../lib/prismaClient.js'

export interface FolderTagEntity {
    id: string
    folderId: string
    name: string
    createdAt: Date
}

export interface FolderTagCreateInput {
    folderId: string
    name: string
}

export class FolderTagRepository {
    constructor(private readonly prisma: DatabaseClient) { }

    async listByFolder(folderId: string): Promise<FolderTagEntity[]> {
        const tags = await this.prisma.folderTag.findMany({
            where: { folderId },
            orderBy: { createdAt: 'asc' },
        })
        return tags.map(toEntity)
    }

    async findByFolderAndName(folderId: string, name: string): Promise<FolderTagEntity | null> {
        const tag = await this.prisma.folderTag.findFirst({
            where: { folderId, name },
        })
        return tag ? toEntity(tag) : null
    }

    async create(input: FolderTagCreateInput): Promise<FolderTagEntity> {
        const tag = await this.prisma.folderTag.create({
            data: {
                folderId: input.folderId,
                name: input.name,
            },
        })
        return toEntity(tag)
    }

    async delete(folderId: string, name: string): Promise<void> {
        await this.prisma.folderTag.deleteMany({
            where: { folderId, name },
        })
    }
}

const toEntity = (tag: {
    id: string
    folderId: string
    name: string
    createdAt: Date
}): FolderTagEntity => ({
    id: tag.id,
    folderId: tag.folderId,
    name: tag.name,
    createdAt: tag.createdAt,
})
