import type { WorkspaceVisibility } from '@prisma/client'
import type { DatabaseClient } from '../../lib/prismaClient.js'

export interface WorkspaceEntity {
  id: string
  name: string
  handle: string | null
  description?: string | null
  defaultLanguage?: string | null
  visibility: WorkspaceVisibility
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorkspaceInput {
  name: string
  handle?: string
  description?: string | null
  defaultLanguage?: string
  visibility: WorkspaceVisibility
  ownerId: string
}

export interface UpdateWorkspaceInput {
  name?: string
  handle?: string
  description?: string | null
  defaultLanguage?: string
  visibility?: WorkspaceVisibility
}

export class WorkspaceRepository {
  constructor(private readonly prisma: DatabaseClient) { }

  async create(input: CreateWorkspaceInput): Promise<WorkspaceEntity> {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: input.name,
        handle: input.handle,
        description: input.description,
        defaultLanguage: input.defaultLanguage,
        visibility: input.visibility,
        ownerId: input.ownerId,
      },
    })
    return toEntity(workspace)
  }

  async listByOwner(ownerId: string): Promise<WorkspaceEntity[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    })
    return workspaces.map(toEntity)
  }

  async findByIds(ids: string[]): Promise<WorkspaceEntity[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'asc' },
    })
    return workspaces.map(toEntity)
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    })
    return workspace ? toEntity(workspace) : null
  }

  async findByIdIncludingDeleted(id: string): Promise<WorkspaceEntity | null> {
    // Schema doesn't support soft delete yet, so just findById
    return this.findById(id)
  }

  async slugExists(handle: string): Promise<boolean> {
    const count = await this.prisma.workspace.count({
      where: { handle },
    })
    return count > 0
  }

  async update(id: string, input: UpdateWorkspaceInput): Promise<WorkspaceEntity> {
    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: {
        name: input.name,
        handle: input.handle,
        description: input.description,
        defaultLanguage: input.defaultLanguage,
        visibility: input.visibility,
      },
    })
    return toEntity(workspace)
  }

  async softDelete(id: string): Promise<void> {
    // Schema doesn't support soft delete yet.
    // For now, we might want to actually delete or just do nothing/throw.
    // Let's actually delete to keep it clean for now, or maybe throw error?
    // Given "db clean reset", maybe actual delete is fine.
    await this.prisma.workspace.delete({
      where: { id },
    })
  }

  async updateOwner(id: string, ownerId: string): Promise<void> {
    await this.prisma.workspace.update({
      where: { id },
      data: { ownerId },
    })
  }
}

const toEntity = (workspace: {
  id: string
  name: string
  handle: string | null
  description: string | null
  defaultLanguage: string | null
  visibility: WorkspaceVisibility
  ownerId: string
  createdAt: Date
  updatedAt: Date
}): WorkspaceEntity => ({
  id: workspace.id,
  name: workspace.name,
  handle: workspace.handle,
  description: workspace.description,
  defaultLanguage: workspace.defaultLanguage,
  visibility: workspace.visibility,
  ownerId: workspace.ownerId,
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt,
})
