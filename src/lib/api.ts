const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

const buildQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return ''
  const entries = Object.entries(params)
    .map(([key, value]) => (value === undefined ? null : `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`))
    .filter((entry): entry is string => entry !== null)
  if (entries.length === 0) return ''
  return `?${entries.join('&')}`
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in (payload as Record<string, unknown>)
        ? (payload as Record<string, string>).message
        : response.statusText
    throw new Error(message || 'Request failed')
  }

  return payload as T
}

interface RequestOptions {
  method?: string
  token?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

const requestJSON = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', token, body, query } = options
  const url = `${API_BASE_URL}${path}${buildQuery(query)}`
  const headers = new Headers()
  if (body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput extends LoginInput {
  legalName?: string
}

export interface LoginResult {
  sessionId: string
  accountId: string
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

export interface AccountResponse {
  id: string
  email: string
  status: string
}

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  description?: string | null
  visibility: string
  ownerAccountId: string
  createdAt: string
  updatedAt: string
}

export interface MembershipSummary {
  id: string
  workspaceId: string
  accountId: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'invited' | 'pending' | 'removed'
  displayName?: string | null
  timezone?: string | null
  preferredLocale?: string | null
}

export interface DocumentSummary {
  id: string
  workspaceId: string
  title: string
  slug: string
  status: string
  visibility: string
  folderId?: string | null
  summary?: string | null
  createdAt: string
  updatedAt: string
}

export const login = (input: LoginInput) => requestJSON<LoginResult>('/api/auth/login', { method: 'POST', body: input })
export const signup = (input: SignupInput) => requestJSON<AccountResponse>('/api/auth/signup', { method: 'POST', body: input })

export const getWorkspaces = (token: string) => requestJSON<WorkspaceSummary[]>('/api/workspaces', { token })

export const getWorkspaceMembers = (workspaceId: string, token: string) =>
  requestJSON<{ items: MembershipSummary[] }>(`/api/workspaces/${workspaceId}/members`, { token })

export const getWorkspaceDocuments = (workspaceId: string, token: string, search?: string) =>
  requestJSON<{ documents: DocumentSummary[]; folders: unknown[] }>(`/api/workspaces/${workspaceId}/documents`, {
    token,
    query: search ? { search } : undefined,
  })

export const updateWorkspace = (workspaceId: string, token: string, body: { name?: string; description?: string }) =>
  requestJSON<WorkspaceSummary>(`/api/workspaces/${workspaceId}`, { method: 'PATCH', token, body })

export const closeWorkspace = (workspaceId: string, token: string) =>
  requestJSON<void>(`/api/workspaces/${workspaceId}`, { method: 'DELETE', token })
