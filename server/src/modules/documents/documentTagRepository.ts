import type { DatabaseClient } from '../../lib/prismaClient.js'

export interface DocumentTagEntity {
  id: string
  documentId: string
  name: string
  createdAt: Date
}

export interface DocumentTagCreateInput {
  documentId: string
  name: string
}

export class DocumentTagRepository {
  constructor(private readonly prisma: DatabaseClient) { }

  async listByDocument(documentId: string): Promise<DocumentTagEntity[]> {
    const tags = await this.prisma.documentTag.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    })
    return tags.map(toEntity)
  }

  async findByDocumentAndName(documentId: string, name: string): Promise<DocumentTagEntity | null> {
    const tag = await this.prisma.documentTag.findFirst({
      where: { documentId, name },
    })
    return tag ? toEntity(tag) : null
  }

  async create(input: DocumentTagCreateInput): Promise<DocumentTagEntity> {
    const tag = await this.prisma.documentTag.create({
      data: {
        documentId: input.documentId,
        name: input.name,
      },
    })
    return toEntity(tag)
  }

  async delete(documentId: string, name: string): Promise<void> {
    await this.prisma.documentTag.deleteMany({
      where: { documentId, name },
    })
  }
}

const toEntity = (tag: {
  id: string
  documentId: string
  name: string
  createdAt: Date
}): DocumentTagEntity => ({
  id: tag.id,
  documentId: tag.documentId,
  name: tag.name,
  createdAt: tag.createdAt,
})
