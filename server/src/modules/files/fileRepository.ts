import { PrismaClient, File } from '@prisma/client'

export interface CreateFileParams {
    workspaceId: string
    folderId?: string | null
    originalName: string
    mimeType: string
    size: bigint
    extension: string
    s3Key: string
    s3Bucket?: string
    createdByMembershipId: string
}

export class FileRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async create(params: CreateFileParams): Promise<File> {
        return this.prisma.file.create({
            data: params,
        })
    }

    async findById(id: string): Promise<File | null> {
        return this.prisma.file.findUnique({
            where: { id },
        })
    }

    async listByWorkspace(workspaceId: string, folderId?: string | null, limit = 50, offset = 0): Promise<File[]> {
        return this.prisma.file.findMany({
            where: {
                workspaceId,
                folderId: folderId === undefined ? undefined : folderId,
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        })
    }

    async softDelete(id: string): Promise<File> {
        return this.prisma.file.update({
            where: { id },
            data: { deletedAt: new Date() },
        })
    }
}
