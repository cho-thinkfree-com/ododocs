import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { createPrismaClient } from '../../../server/src/lib/prismaClient'
import { createTestDatabase } from '../support/testDatabase'
import { PrismaAccountRepository } from '../../../server/src/modules/accounts/accountRepository'
import { AccountService } from '../../../server/src/modules/accounts/accountService'
import { WorkspaceRepository } from '../../../server/src/modules/workspaces/workspaceRepository'
import { WorkspaceService } from '../../../server/src/modules/workspaces/workspaceService'
import { MembershipRepository } from '../../../server/src/modules/workspaces/membershipRepository'
import { WorkspaceAccessService } from '../../../server/src/modules/workspaces/workspaceAccess'
import { DocumentRepository } from '../../../server/src/modules/documents/documentRepository'
import { DocumentRevisionRepository } from '../../../server/src/modules/documents/documentRevisionRepository'
import { FolderRepository } from '../../../server/src/modules/documents/folderRepository'
import { DocumentService } from '../../../server/src/modules/documents/documentService'
import { DocumentTagRepository } from '../../../server/src/modules/documents/documentTagRepository'
import {
  DocumentTagService,
  DocumentTagAlreadyExistsError,
  DocumentTagNotFoundError,
} from '../../../server/src/modules/documents/documentTagService'

describe('DocumentTagService', () => {
  let prisma = createPrismaClient()
  let dbHandle: ReturnType<typeof createTestDatabase> | null = null
  let accountService: AccountService
  let workspaceService: WorkspaceService
  let membershipRepository: MembershipRepository
  let documentService: DocumentService
  let documentTagService: DocumentTagService
  let ownerId: string

  beforeEach(async () => {
    dbHandle = createTestDatabase()
    prisma = createPrismaClient({ datasourceUrl: dbHandle.url })
    const accountRepository = new PrismaAccountRepository(prisma)
    accountService = new AccountService(accountRepository)
    const workspaceRepository = new WorkspaceRepository(prisma)
    membershipRepository = new MembershipRepository(prisma)
    const workspaceAccess = new WorkspaceAccessService(workspaceRepository, membershipRepository)
    const documentRepository = new DocumentRepository(prisma)
    const documentRevisionRepository = new DocumentRevisionRepository(prisma)
    const folderRepository = new FolderRepository(prisma)
    documentService = new DocumentService(
      documentRepository,
      documentRevisionRepository,
      folderRepository,
      membershipRepository,
      workspaceAccess,
    )
    const documentTagRepository = new DocumentTagRepository(prisma)
    documentTagService = new DocumentTagService(documentTagRepository, workspaceAccess)

    workspaceService = new WorkspaceService(workspaceRepository, workspaceAccess)

    const account = await accountService.registerAccount({ email: 'owner@example.com', password: 'Sup3rSecure!' })
    ownerId = account.id
    const workspace = await workspaceService.create(ownerId, { name: 'Docs' })
    await membershipRepository.create({
      workspaceId: workspace.id,
      accountId: ownerId,
      role: 'owner',
      status: 'active',
    })
  })

  afterEach(async () => {
    await prisma.$disconnect()
    dbHandle?.cleanup()
    dbHandle = null
  })

  it('adds and removes tags', async () => {
    const workspace = await workspaceService.create(ownerId, { name: 'Tagged' })
    await membershipRepository.create({
      workspaceId: workspace.id,
      accountId: ownerId,
      role: 'owner',
      status: 'active',
    })
    const document = await documentService.createDocument(ownerId, workspace.id, { title: 'Tagged doc' })
    const tag = await documentTagService.addTag(ownerId, workspace.id, document.id, { name: 'api' })
    expect(tag.name).toBe('api')
    await expect(documentTagService.addTag(ownerId, workspace.id, document.id, { name: 'api' })).rejects.toBeInstanceOf(
      DocumentTagAlreadyExistsError,
    )
    await documentTagService.removeTag(ownerId, workspace.id, document.id, 'api')
    await expect(documentTagService.removeTag(ownerId, workspace.id, document.id, 'api')).rejects.toBeInstanceOf(
      DocumentTagNotFoundError,
    )
  })

})
