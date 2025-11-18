import { z } from 'zod'
import type { WorkspaceAccessService } from '../workspaces/workspaceAccess'
import type { DocumentTagRepository } from './documentTagRepository'

const tagSchema = z.object({
  name: z.string().trim().min(1).max(40),
})

export class DocumentTagService {
  constructor(
    private readonly repository: DocumentTagRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async addTag(accountId: string, workspaceId: string, documentId: string, payload: unknown) {
    await this.workspaceAccess.assertMember(accountId, workspaceId)
    const input = tagSchema.parse(payload)
    const existing = await this.repository.findByDocumentAndName(documentId, input.name)
    if (existing) {
      throw new DocumentTagAlreadyExistsError()
    }
    return this.repository.create({
      documentId,
      name: input.name,
    })
  }

  async removeTag(accountId: string, workspaceId: string, documentId: string, tagName: string) {
    await this.workspaceAccess.assertMember(accountId, workspaceId)
    const existing = await this.repository.findByDocumentAndName(documentId, tagName)
    if (!existing) {
      throw new DocumentTagNotFoundError()
    }
    await this.repository.delete(documentId, tagName)
  }
}

export class DocumentTagAlreadyExistsError extends Error {
  constructor() {
    super('Tag already exists on document')
    this.name = 'DocumentTagAlreadyExistsError'
  }
}

export class DocumentTagNotFoundError extends Error {
  constructor() {
    super('Tag not found on document')
    this.name = 'DocumentTagNotFoundError'
  }
}
