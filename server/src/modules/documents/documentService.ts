import { z } from 'zod'
import type { DocumentStatus, DocumentVisibility } from '@prisma/client'
import { DocumentRepository, type DocumentEntity, type DocumentListFilters } from './documentRepository.js'
import {
  DocumentRevisionRepository,
  type DocumentRevisionEntity,
} from './documentRevisionRepository.js'
import { FolderRepository, type FolderEntity } from './folderRepository.js'
import { MembershipRepository } from '../workspaces/membershipRepository.js'
import { WorkspaceAccessService } from '../workspaces/workspaceAccess.js'
import { ensureUniqueSlug, slugify } from '../../lib/slug.js'
import { FolderNotFoundError } from './folderService.js'
import { MembershipAccessDeniedError } from '../workspaces/membershipService.js'
import {
  DocumentPlanLimitService,
  NoopDocumentPlanLimitService,
} from './planLimitService.js'
import { StorageService } from '../storage/storageService.js'
import { v4 as uuidv4 } from 'uuid'

const documentStatusEnum: [DocumentStatus, ...DocumentStatus[]] = ['draft', 'published', 'archived']
const documentVisibilityEnum: [DocumentVisibility, ...DocumentVisibility[]] = ['private', 'workspace', 'shared', 'public']
const tiptapJsonSchema = z
  .any()
  .refine((value) => typeof value === 'object' && value !== null, { message: 'content must be object or array' })

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  folderId: z.string().uuid().optional().nullable(),
  slug: z.string().trim().min(1).max(160).optional(),
  visibility: z.enum(documentVisibilityEnum).default('private'),
  status: z.enum(documentStatusEnum).default('draft'),
  summary: z.string().trim().max(280).optional(),
  sortOrder: z.number().int().optional(),
  initialRevision: z
    .object({
      content: tiptapJsonSchema,
      summary: z.string().trim().max(280).optional(),
    })
    .optional(),
})

const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    folderId: z.string().uuid().nullable().optional(),
    slug: z.string().trim().min(1).max(160).optional(),
    visibility: z.enum(documentVisibilityEnum).optional(),
    status: z.enum(documentStatusEnum).optional(),
    summary: z.string().trim().max(280).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field required' })

const revisionSchema = z.object({
  content: tiptapJsonSchema,
  summary: z.string().trim().max(280).optional(),
})

const calculateContentSize = (content: unknown): number => {
  try {
    const json = JSON.stringify(content ?? {})
    return Buffer.byteLength(json, 'utf8')
  } catch {
    return 0
  }
}

export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly revisionRepository: DocumentRevisionRepository,
    private readonly folderRepository: FolderRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly storageService: StorageService,
    private readonly planLimitService: DocumentPlanLimitService = new NoopDocumentPlanLimitService(),
  ) { }

  async listWorkspaceDocuments(
    accountId: string,
    workspaceId: string,
    filters: DocumentListFilters = {},
  ): Promise<{ documents: DocumentEntity[]; folders: FolderEntity[] }> {
    await this.workspaceAccess.assertMember(accountId, workspaceId)
    const [documents, folders] = await Promise.all([
      this.documentRepository.listByWorkspace(workspaceId, filters),
      this.folderRepository.listByWorkspace(workspaceId, false, {
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        parentId: filters.folderId !== undefined ? filters.folderId : null
      }),
    ])
    return { documents, folders }
  }

  async listRecentDocuments(accountId: string, options?: { sortBy?: string, sortOrder?: 'asc' | 'desc' }): Promise<DocumentEntity[]> {
    const memberships = await this.membershipRepository.findByAccount(accountId);
    const workspaceIds = memberships.map(m => m.workspaceId);
    return this.documentRepository.listRecentByWorkspaces(workspaceIds, { limit: 50, sortBy: options?.sortBy, sortOrder: options?.sortOrder });
  }

  async createDocument(
    accountId: string,
    workspaceId: string,
    rawInput: z.input<typeof createDocumentSchema>,
  ): Promise<DocumentEntity> {
    await this.workspaceAccess.assertMember(accountId, workspaceId)
    const membership = await this.membershipRepository.findByWorkspaceAndAccount(workspaceId, accountId)
    if (!membership) {
      throw new MembershipAccessDeniedError()
    }
    const input = createDocumentSchema.parse(rawInput)
    const folder = input.folderId ? await this.ensureFolder(workspaceId, input.folderId) : null
    if (folder?.deletedAt) throw new FolderNotFoundError()
    await this.planLimitService.assertDocumentCreateAllowed(workspaceId)

    // Ensure title is unique
    const title = await this.generateUniqueTitle(
      workspaceId,
      input.folderId ?? null,
      input.title || 'Untitled'
    )

    const slug = await this.resolveSlug(workspaceId, input.slug ?? title, {
      strict: Boolean(input.slug),
    })

    // Get next document number for this workspace
    const documentNumber = await this.documentRepository.getNextDocumentNumber(workspaceId)

    const initialContent = input.initialRevision?.content ?? { type: 'doc', content: [] }
    const initialContentSize = calculateContentSize(initialContent)

    const document = await this.documentRepository.create({
      workspaceId,
      folderId: input.folderId ?? null,
      ownerMembershipId: membership.id,
      title,
      slug,
      documentNumber,
      status: input.status,
      visibility: input.visibility,
      summary: input.summary,
      contentSize: initialContentSize,
      sortOrder: input.sortOrder,
    })

    await this.revisionRepository.create({
      documentId: document.id,
      version: 1,
      content: initialContent,
      contentSize: initialContentSize,
      summary: input.initialRevision?.summary,
      createdByMembershipId: membership.id,
    })

    return document
  }

  private async generateUniqueTitle(
    workspaceId: string,
    folderId: string | null,
    baseTitle: string = 'Untitled'
  ): Promise<string> {
    const existingDocs = await this.documentRepository.listByWorkspace(
      workspaceId,
      { folderId }
    )
    const existingFolders = await this.folderRepository.listChildren(workspaceId, folderId)

    const existingNames = new Set([
      ...existingDocs.map(doc => doc.title.toLowerCase()),
      ...existingFolders.map(folder => folder.name.toLowerCase())
    ])

    if (!existingNames.has(baseTitle.toLowerCase())) {
      return baseTitle
    }

    let counter = 1
    while (existingNames.has(`${baseTitle} (${counter})`.toLowerCase())) {
      counter++
    }

    return `${baseTitle} (${counter})`
  }

  async updateDocument(
    accountId: string,
    workspaceId: string,
    documentId: string,
    rawInput: z.input<typeof updateDocumentSchema>
  ): Promise<DocumentEntity> {
    const document = await this.ensureDocument(documentId, workspaceId)
    await this.workspaceAccess.assertMember(accountId, workspaceId)

    const input = updateDocumentSchema.parse(rawInput)

    if (input.slug) {
      await this.resolveSlug(workspaceId, input.slug, { excludeId: documentId, strict: true })
    }

    if (input.title && input.title !== document.title) {
      // Optional: check for title uniqueness if enforced
    }

    return this.documentRepository.update(documentId, input)
  }

  async toggleImportant(accountId: string, documentId: string, isImportant: boolean): Promise<DocumentEntity> {
    const document = await this.ensureDocument(documentId)
    await this.workspaceAccess.assertMember(accountId, document.workspaceId)
    return this.documentRepository.update(documentId, { isImportant })
  }

  async appendRevision(
    accountId: string,
    documentId: string,
    rawInput: z.input<typeof revisionSchema>
  ): Promise<DocumentRevisionEntity> {
    const document = await this.ensureDocument(documentId)
    await this.workspaceAccess.assertMember(accountId, document.workspaceId)
    const membership = await this.membershipRepository.findByWorkspaceAndAccount(document.workspaceId, accountId)
    if (!membership) {
      throw new MembershipAccessDeniedError()
    }
    await this.planLimitService.assertDocumentEditAllowed(document.workspaceId)

    const input = revisionSchema.parse(rawInput)

    // --- Draft-Commit Logic Start ---
    const processedContent = await this.processAssetDrafts(document.workspaceId, documentId, input.content)
    // --- Draft-Commit Logic End ---

    const latest = await this.revisionRepository.findLatest(documentId)
    const nextVersion = (latest?.version ?? 0) + 1
    const contentSize = calculateContentSize(processedContent)

    const revision = await this.revisionRepository.create({
      documentId,
      version: nextVersion,
      content: processedContent,
      contentSize,
      summary: input.summary,
      createdByMembershipId: membership.id,
    })

    await this.documentRepository.update(documentId, { contentSize })

    return revision
  }

  /**
   * Scans content for asset drafts, moves them to permanent storage, and updates URLs.
   */
  private async processAssetDrafts(workspaceId: string, documentId: string, content: any): Promise<any> {
    const contentString = JSON.stringify(content)
    // Regex to find: odocs://workspaces/{ws}/documents/{doc}/asset-drafts/{uuid}
    // We only care about the UUID part for moving, but we need the full string for replacement.
    const draftRegex = new RegExp(`odocs://workspaces/${workspaceId}/documents/${documentId}/asset-drafts/([a-zA-Z0-9-]+)`, 'g')

    let match
    const draftsToMove: string[] = []

    // 1. Scan
    while ((match = draftRegex.exec(contentString)) !== null) {
      draftsToMove.push(match[1]) // The UUID
    }

    if (draftsToMove.length === 0) {
      return content
    }

    // 2. Move (Parallel)
    await Promise.all(draftsToMove.map(async (uuid) => {
      const sourceKey = `workspaces/${workspaceId}/documents/${documentId}/asset-drafts/${uuid}`
      const targetKey = `workspaces/${workspaceId}/documents/${documentId}/assets/${uuid}`
      try {
        await this.storageService.moveObject(sourceKey, targetKey)
      } catch (error) {
        // Ignore if object doesn't exist (maybe already moved or deleted)
        // In production, we might want to log this.
        console.warn(`Failed to move draft asset ${uuid}:`, error)
      }
    }))

    // 3. Replace
    const newContentString = contentString.replace(draftRegex, `odocs://workspaces/${workspaceId}/documents/${documentId}/assets/$1`)
    return JSON.parse(newContentString)
  }

  async createAssetUploadUrl(accountId: string, documentId: string, mimeType: string) {
    const document = await this.ensureDocument(documentId)
    await this.workspaceAccess.assertMember(accountId, document.workspaceId)

    const assetId = uuidv4()
    // Path: workspaces/{ws}/files/{fid}/assets/{uuid}
    const key = `workspaces/${document.workspaceId}/files/${documentId}/assets/${assetId}`

    const uploadUrl = await this.storageService.getPresignedPutUrl(key, mimeType)
    const odocsUrl = `odocs://workspaces/${document.workspaceId}/files/${documentId}/assets/${assetId}`

    return { uploadUrl, odocsUrl }
  }

  async getAssetViewUrl(accountId: string, workspaceId: string, documentId: string, assetId: string) {
    const document = await this.ensureDocument(documentId, workspaceId)
    await this.workspaceAccess.assertMember(accountId, workspaceId)

    // Construct S3 key with new path structure
    const key = `workspaces/${workspaceId}/files/${documentId}/assets/${assetId}`

    const url = await this.storageService.getPresignedGetUrl(key)
    return url
  }

  async resolveAssetUrls(accountId: string, workspaceId: string, documentId: string, assetUrls: string[]) {
    const document = await this.ensureDocument(documentId, workspaceId)
    await this.workspaceAccess.assertMember(accountId, workspaceId)

    const resolved: Record<string, string> = {}

    await Promise.all(assetUrls.map(async (url) => {
      // Parse URL: odocs://workspaces/{ws}/files/{fid}/assets/{uuid}
      const match = url.match(/odocs:\/\/workspaces\/([^\/]+)\/files\/([^\/]+)\/assets\/([^\/]+)/)
      if (match) {
        const [, wsId, fileId, assetId] = match
        // Security check: ensure the asset belongs to the requested document/workspace
        if (wsId === workspaceId && fileId === documentId) {
          const key = `workspaces/${workspaceId}/files/${documentId}/assets/${assetId}`
          resolved[url] = await this.storageService.getPresignedGetUrl(key)
        }
      }
    }))

    return resolved
  }

  async cloneAsset(accountId: string, targetDocumentId: string, sourceUrl: string) {
    const targetDoc = await this.ensureDocument(targetDocumentId)
    await this.workspaceAccess.assertMember(accountId, targetDoc.workspaceId)

    // Parse Source URL: odocs://workspaces/{ws}/documents/{doc}/assets/{uuid}
    const sourceMatch = sourceUrl.match(/odocs:\/\/workspaces\/([^\/]+)\/documents\/([^\/]+)\/assets\/([^\/]+)/)
    if (!sourceMatch) {
      throw new Error('Invalid source asset URL')
    }
    const [, sourceWsId, sourceDocId, sourceAssetId] = sourceMatch

    // Check read permission on source document (Implicitly handled by S3 Copy if we had strict IAM, 
    // but here we should ideally check if user can read sourceDoc. 
    // For MVP, we assume if you have the link, you can copy it, OR we enforce workspace boundary).

    const newAssetId = uuidv4()
    const sourceKey = `workspaces/${sourceWsId}/documents/${sourceDocId}/assets/${sourceAssetId}`
    const targetKey = `workspaces/${targetDoc.workspaceId}/documents/${targetDocumentId}/assets/${newAssetId}`

    await this.storageService.copyObject(sourceKey, targetKey)

    return `odocs://workspaces/${targetDoc.workspaceId}/documents/${targetDocumentId}/assets/${newAssetId}`
  }

  async getLatestRevision(accountId: string, documentId: string) {
    const document = await this.ensureDocument(documentId)
    await this.workspaceAccess.assertMember(accountId, document.workspaceId)
    const revision = await this.revisionRepository.findLatest(documentId)
    if (!revision) {
      throw new DocumentRevisionNotFoundError()
    }
    return { document, revision }
  }

  async softDelete(accountId: string, documentId: string): Promise<void> {
    const document = await this.ensureDocument(documentId);
    await this.workspaceAccess.assertMember(accountId, document.workspaceId);
    const membership = await this.membershipRepository.findByWorkspaceAndAccount(document.workspaceId, accountId);
    if (!membership) {
      throw new MembershipAccessDeniedError();
    }
    await this.documentRepository.softDelete(documentId, membership.id);
  }

  async listTrashed(accountId: string, workspaceId: string, options?: { sortBy?: string, sortOrder?: 'asc' | 'desc' }): Promise<DocumentEntity[]> {
    await this.workspaceAccess.assertMember(accountId, workspaceId);
    return this.documentRepository.findTrashed(workspaceId, options);
  }

  async restoreDocument(accountId: string, documentId: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findById(documentId);
    if (!document || !document.deletedAt) {
      throw new DocumentNotFoundError();
    }
    await this.workspaceAccess.assertMember(accountId, document.workspaceId);

    const originalFolderId = document.originalFolderId;
    let targetFolderId: string | null = null;

    if (originalFolderId) {
      const parentPath = await this.validateFolderPath(originalFolderId, document.workspaceId);
      if (parentPath) {
        targetFolderId = originalFolderId;
      }
    }

    return this.documentRepository.restore(documentId, targetFolderId);
  }

  async permanentlyDeleteDocument(accountId: string, documentId: string): Promise<void> {
    const document = await this.documentRepository.findById(documentId);
    if (!document || !document.deletedAt) {
      throw new DocumentNotFoundError();
    }
    await this.workspaceAccess.assertMember(accountId, document.workspaceId);
    await this.documentRepository.permanentDelete(documentId);
  }

  private async validateFolderPath(folderId: string, workspaceId: string): Promise<boolean> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder || folder.deletedAt || folder.workspaceId !== workspaceId) {
      return false;
    }
    if (folder.parentId) {
      return this.validateFolderPath(folder.parentId, workspaceId);
    }
    return true;
  }

  private async ensureFolder(workspaceId: string, folderId: string) {
    const folder = await this.folderRepository.findById(folderId)
    if (!folder || folder.workspaceId !== workspaceId) {
      throw new FolderNotFoundError()
    }
    return folder
  }

  private async ensureDocument(documentId: string, workspaceId?: string) {
    const document = await this.documentRepository.findById(documentId)
    if (!document || document.deletedAt) {
      throw new DocumentNotFoundError()
    }
    if (workspaceId && document.workspaceId !== workspaceId) {
      throw new DocumentNotFoundError()
    }
    return document
  }

  private async resolveSlug(
    workspaceId: string,
    rawValue: string,
    options: { excludeId?: string; strict?: boolean } = {},
  ) {
    const formatted = slugify(rawValue)
    if (options.strict || options.excludeId) {
      if (await this.documentRepository.slugExists(workspaceId, formatted, options.excludeId)) {
        throw new DocumentSlugConflictError()
      }
      return formatted
    }
    return ensureUniqueSlug(rawValue, (candidate) => this.documentRepository.slugExists(workspaceId, candidate))
  }
}

export class DocumentNotFoundError extends Error {
  constructor() {
    super('Document not found')
    this.name = 'DocumentNotFoundError'
  }
}

export class DocumentSlugConflictError extends Error {
  constructor() {
    super('Document slug already exists in this workspace')
    this.name = 'DocumentSlugConflictError'
  }
}

export class DocumentTitleConflictError extends Error {
  constructor() {
    super('A document or folder with this name already exists')
    this.name = 'DocumentTitleConflictError'
  }
}

export class DocumentRevisionNotFoundError extends Error {
  constructor() {
    super('Revision not found')
    this.name = 'DocumentRevisionNotFoundError'
  }
}
