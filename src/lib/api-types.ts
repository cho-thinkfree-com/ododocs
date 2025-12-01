// Shared types between frontend and backend
// These should ideally be imported from a shared package

export interface FileSystemEntry {
    id: string
    name: string
    displayName: string | null
    type: 'file' | 'folder'
    workspaceId: string
    parentId: string | null
    mimeType: string | null
    extension: string | null
    size: bigint | null
    isStarred: boolean
    isShared: boolean
    description: string | null
    tags: string[]
    deletedAt: Date | null
    deletedBy: string | null
    originalParentId: string | null
    createdAt: Date
    updatedAt: Date
    createdBy: string
    lastModifiedBy: string | null
    currentRevisionId: string | null
}

export interface Account {
    id: string
    email: string
    legalName: string | null
    preferredLocale: string | null
    preferredTimezone: string | null
}

export interface Workspace {
    id: string
    name: string
    handle: string | null
    description: string | null
    visibility: 'public' | 'private'
    ownerAccountId: string
    blogHandle: string | null
    blogDescription: string | null
    blogTheme: string | null
    createdAt: Date
    updatedAt: Date
}

export interface WorkspaceMembership {
    id: string
    workspaceId: string
    accountId: string
    role: 'owner' | 'admin' | 'member'
    status: 'active' | 'suspended'
    displayName: string | null
    locale: string | null
    timezone: string | null
    blogHandle: string | null
    blogDescription: string | null
    blogTheme: string | null
    createdAt: Date
    updatedAt: Date
}

export type ShareLinkAccessType = 'private' | 'link' | 'public'

export interface ShareLink {
    id: string
    token: string
    fileId: string
    workspaceId: string
    access: 'view' | 'edit'
    accessType: ShareLinkAccessType
    expiresAt: Date | null
    passwordHash: string | null
    createdBy: string
    createdAt: Date
}

export interface DocumentContent {
    type: 'doc'
    content: any[]
}

export interface LoginResult {
    account: Account
    workspaces: Workspace[]
}

export interface ApiError {
    error: string
    stack?: string // Only in development
}
