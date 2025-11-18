import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../lib/i18n'
import {
  addDocumentTag,
  changeWorkspaceMemberRole,
  createDocument,
  createFolder,
  createShareLink,
  createWorkspace,
  getWorkspaceDocuments,
  getWorkspaceMembers,
  getWorkspaces,
  inviteWorkspaceMember,
  removeDocumentTag,
  removeWorkspaceMember,
  renameDocument,
} from '../../lib/api'
import type {
  DocumentSummary,
  FolderSummary,
  MembershipSummary,
  WorkspaceSummary,
} from '../../lib/api'

const formatDate = (value: string) => new Date(value).toLocaleString()

type ViewMode = 'center' | 'detail'

const WorkspaceDashboard = () => {
  const theme = useTheme()
  const { strings } = useI18n()
  const workspaceStrings = strings.workspace
  const { tokens, logout } = useAuth()
  const accessToken = tokens?.accessToken

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('center')
  const [members, setMembers] = useState<MembershipSummary[]>([])
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [folders, setFolders] = useState<FolderSummary[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [docMessage, setDocMessage] = useState<string | null>(null)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creatingDoc, setCreatingDoc] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [workspaceCreating, setWorkspaceCreating] = useState(false)
  const [inviteAccountId, setInviteAccountId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null)

  const membershipById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members])

  const loadWorkspaces = useCallback(async () => {
    if (!accessToken) return
    const items = await getWorkspaces(accessToken)
    setWorkspaces(items)
    if (!activeWorkspace && items.length > 0) {
      setActiveWorkspace(items[0])
    }
  }, [accessToken, activeWorkspace])

  const loadMembers = useCallback(async () => {
    if (!accessToken || !activeWorkspace) {
      setMembers([])
      return
    }
    setMembersLoading(true)
    try {
      const payload = await getWorkspaceMembers(activeWorkspace.id, accessToken)
      setMembers(payload.items)
    } finally {
      setMembersLoading(false)
    }
  }, [accessToken, activeWorkspace])

  const loadDocuments = useCallback(async () => {
    if (!accessToken || !activeWorkspace) {
      setDocuments([])
      setFolders([])
      return
    }
    setDocumentsLoading(true)
    try {
      const { documents: docs, folders: folderList } = await getWorkspaceDocuments(activeWorkspace.id, accessToken)
      setDocuments(docs)
      setFolders(folderList)
      setMessage(null)
    } catch (error) {
      setMessage('Unable to load documents.')
    } finally {
      setDocumentsLoading(false)
    }
  }, [accessToken, activeWorkspace])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  useEffect(() => {
    if (viewMode === 'detail') {
      loadMembers()
      loadDocuments()
    }
  }, [viewMode, loadMembers, loadDocuments])

  const handleLogout = () => {
    logout().catch(() => {})
  }

  const handleCreateWorkspace = async () => {
    if (!accessToken || !newWorkspaceName.trim()) return
    setWorkspaceCreating(true)
    try {
      const created = await createWorkspace(accessToken, { name: newWorkspaceName.trim() })
      setWorkspaces((prev) => [...prev, created])
      setActiveWorkspace(created)
      setNewWorkspaceName('')
      setViewMode('detail')
    } finally {
      setWorkspaceCreating(false)
    }
  }

  const handleSelectWorkspace = (workspace: WorkspaceSummary) => {
    setActiveWorkspace(workspace)
    setViewMode('detail')
  }

  const handleBackToCenter = () => {
    setViewMode('center')
  }

  const handleCreateDocument = async () => {
    if (!accessToken || !activeWorkspace || !newDocTitle.trim()) return
    setCreatingDoc(true)
    try {
      await createDocument(activeWorkspace.id, accessToken, { title: newDocTitle.trim() })
      setNewDocTitle('')
      await loadDocuments()
      setDocMessage('Document created')
    } finally {
      setCreatingDoc(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!accessToken || !activeWorkspace || !newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      await createFolder(activeWorkspace.id, accessToken, { name: newFolderName.trim() })
      setNewFolderName('')
      await loadDocuments()
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleInviteMember = async () => {
    if (!accessToken || !activeWorkspace || !inviteAccountId.trim()) return
    setInviting(true)
    try {
      await inviteWorkspaceMember(activeWorkspace.id, accessToken, { accountId: inviteAccountId.trim() })
      setInviteAccountId('')
      await loadMembers()
    } finally {
      setInviting(false)
    }
  }

  const handleChangeMemberRole = async (member: MembershipSummary, newRole: MembershipSummary['role']) => {
    if (!accessToken || !activeWorkspace || member.role === 'owner' || member.role === newRole) return
    setMemberActionLoading(member.accountId)
    try {
      await changeWorkspaceMemberRole(activeWorkspace.id, member.accountId, accessToken, newRole)
      await loadMembers()
    } finally {
      setMemberActionLoading(null)
    }
  }

  const handleRemoveMember = async (member: MembershipSummary) => {
    if (!accessToken || !activeWorkspace || member.role === 'owner') return
    setMemberActionLoading(member.accountId)
    try {
      await removeWorkspaceMember(activeWorkspace.id, member.accountId, accessToken)
      await loadMembers()
    } finally {
      setMemberActionLoading(null)
    }
  }

  const handleRenameDocument = async (document: DocumentSummary) => {
    if (!accessToken) return
    const nextTitle = window.prompt('New document title', document.title)
    if (!nextTitle || !activeWorkspace) return
    try {
      await renameDocument(document.id, accessToken, { title: nextTitle.trim() })
      await loadDocuments()
    } finally {
      setDocMessage('Document renamed')
    }
  }

  const hero = (
    <Stack spacing={2}>
      <Typography variant='h4'>{workspaceStrings.heroTitle}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {workspaceStrings.heroSubtitle}
      </Typography>
    </Stack>
  )

  const renderCenter = () => (
    <Stack spacing={3} sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      {hero}
      <Grid container spacing={3}>
        {workspaces.map((workspace) => (
          <Grid item key={workspace.id} xs={12} sm={6} md={4}>
            <Card
              variant='outlined'
              sx={{ cursor: 'pointer', border: `1px solid ${theme.palette.divider}` }}
              onClick={() => handleSelectWorkspace(workspace)}
            >
              <CardContent>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.8) }}>
                    {workspace.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Stack>
                    <Typography variant='subtitle1'>{workspace.name}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {workspace.visibility}
                    </Typography>
                  </Stack>
                </Stack>
                <Typography variant='body2' sx={{ mt: 1 }}>
                  {workspace.description ?? 'No description provided.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )

  const renderDetail = () => (
    <Grid container spacing={0} sx={{ minHeight: '100vh' }}>
      <Grid
        item
        xs={12}
        md={3}
        sx={{
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          p: 2,
          minHeight: '100vh',
        }}
      >
        <Stack spacing={3}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='subtitle2'>{workspaceStrings.selectedWorkspaceTitle}</Typography>
              <Typography variant='h6'>{activeWorkspace?.name ?? '—'}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                {workspaceStrings.selectedWorkspaceHint}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.8) }}>
                  {activeWorkspace?.name.charAt(0).toUpperCase()}
                </Avatar>
                <Stack spacing={0.5}>
                  <Typography variant='body2'>{activeWorkspace?.slug}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {activeWorkspace?.visibility}
                  </Typography>
                </Stack>
              </Box>
              <Button fullWidth sx={{ mt: 2 }} onClick={handleBackToCenter}>
                {workspaceStrings.viewAllWorkspaces}
              </Button>
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='subtitle1'>{workspaceStrings.workspaceListTitle}</Typography>
              <List dense>
                {workspaces.map((workspace) => (
                  <ListItem key={workspace.id} disableGutters>
                    <Button
                      fullWidth
                      variant={workspace.id === activeWorkspace?.id ? 'contained' : 'text'}
                      onClick={() => handleSelectWorkspace(workspace)}
                      sx={{ justifyContent: 'space-between' }}
                    >
                      <Typography variant='body2'>{workspace.name}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {workspace.visibility}
                      </Typography>
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6'>{workspaceStrings.profileTitle}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {workspaceStrings.profileSubtitle}
              </Typography>
              <Typography variant='body2'>{tokens?.accountId ?? '—'}</Typography>
              <Stack direction='row' spacing={1} sx={{ mt: 2 }}>
                <Button size='small' variant='outlined'>
                  {workspaceStrings.profileEditLabel}
                </Button>
                <Button size='small' variant='text'>
                  {workspaceStrings.workspaceSettingsLabel}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
      <Grid item xs={12} md={9} sx={{ p: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card variant='outlined'>
              <CardContent>
                <Stack direction='row' alignItems='center' spacing={2}>
                  <Typography variant='h6'>{workspaceStrings.documentsTitle}</Typography>
                  <TextField
                    value={docSearch}
                    onChange={(event) => setDocSearch(event.target.value)}
                    placeholder={workspaceStrings.documentSearchPlaceholder}
                    size='small'
                  />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {documents.map((document) => (
                    <Grid item key={document.id} xs={12} sm={6}>
                      <Card variant='outlined' sx={{ p: 2 }}>
                        <Typography variant='subtitle1'>{document.title}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {formatDate(document.updatedAt)}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6'>{workspaceStrings.foldersTitle}</Typography>
                <List dense>
                  {folders.map((folder) => (
                    <ListItem key={folder.id} disableGutters>
                      <ListItemText primary={folder.name} secondary={folder.pathCache} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )

  return viewMode === 'detail' && activeWorkspace ? renderDetail() : renderCenter()
}

export default WorkspaceDashboard
