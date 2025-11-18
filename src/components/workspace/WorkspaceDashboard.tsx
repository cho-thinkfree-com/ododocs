import {
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
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../lib/i18n'
import {
  addDocumentTag,
  createDocument,
  createFolder,
  createShareLink,
  createWorkspace,
  getWorkspaceDocuments,
  getWorkspaceMembers,
  getWorkspaces,
  renameDocument,
  removeDocumentTag,
} from '../../lib/api'
import type { DocumentSummary, FolderSummary, MembershipSummary, WorkspaceSummary } from '../../lib/api'

const formatDate = (value: string) => new Date(value).toLocaleString()

const WorkspaceDashboard = () => {
  const theme = useTheme()
  const { strings } = useI18n()
  const workspaceStrings = strings.workspace
  const { tokens } = useAuth()
  const accessToken = tokens?.accessToken
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSummary | null>(null)
  const [members, setMembers] = useState<MembershipSummary[]>([])
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [folders, setFolders] = useState<FolderSummary[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
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
  const [showEditor, setShowEditor] = useState(false)

  const membershipById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members])
  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)
  }, [documents])

  const canManageWorkspace = Boolean(
    selectedWorkspace &&
      (selectedWorkspace.ownerAccountId === tokens?.accountId ||
        members.some((member) => member.accountId === tokens?.accountId && ['admin', 'owner'].includes(member.role))),
  )

  const loadWorkspaces = useCallback(async () => {
    if (!accessToken) return
    const items = await getWorkspaces(accessToken)
    setWorkspaces(items)
    setSelectedWorkspace((prev) => {
      if (prev && items.some((item) => item.id === prev.id)) {
        return items.find((item) => item.id === prev.id) ?? null
      }
      return items[0] ?? null
    })
  }, [accessToken])

  const loadMembers = useCallback(async () => {
    if (!accessToken || !selectedWorkspace) {
      setMembers([])
      return
    }
    setMembersLoading(true)
    try {
      const payload = await getWorkspaceMembers(selectedWorkspace.id, accessToken)
      setMembers(payload.items)
    } finally {
      setMembersLoading(false)
    }
  }, [accessToken, selectedWorkspace])

  const loadDocuments = useCallback(async () => {
    if (!accessToken || !selectedWorkspace) {
      setDocuments([])
      setFolders([])
      return
    }
    setDocumentsLoading(true)
    try {
      const { documents: docs, folders: folderList } = await getWorkspaceDocuments(selectedWorkspace.id, accessToken, {
        search: docSearch || undefined,
        folderId: selectedFolderId ?? undefined,
      })
      setDocuments(docs)
      setFolders(folderList)
      setMessage(null)
    } catch (error) {
      setMessage('Unable to load documents.')
    } finally {
      setDocumentsLoading(false)
    }
  }, [accessToken, selectedWorkspace, docSearch, selectedFolderId])

  const handleLogout = () => {
    logout()
  }

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  useEffect(() => {
    if (!selectedWorkspace) {
      setDocuments([])
      setFolders([])
      setMembers([])
      return
    }
    setSelectedFolderId(null)
    setDocSearch('')
    loadDocuments()
    loadMembers()
  }, [selectedWorkspace, loadDocuments, loadMembers])

  const handleSelectWorkspace = (workspace: WorkspaceSummary) => {
    setSelectedWorkspace(workspace)
  }

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId)
  }

  useEffect(() => {
    loadDocuments()
  }, [selectedFolderId, docSearch, loadDocuments])

  const handleCreateDocument = async () => {
    if (!selectedWorkspace || !accessToken || !newDocTitle.trim()) return
    setCreatingDoc(true)
    try {
      await createDocument(selectedWorkspace.id, accessToken, { title: newDocTitle.trim(), folderId: selectedFolderId ?? undefined })
      setNewDocTitle('')
      setDocMessage('Document created')
      await loadDocuments()
    } catch (error) {
      setDocMessage(error instanceof Error ? error.message : 'Failed to create document')
    } finally {
      setCreatingDoc(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!selectedWorkspace || !accessToken || !newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      await createFolder(selectedWorkspace.id, accessToken, { name: newFolderName.trim(), parentId: selectedFolderId ?? undefined })
      setNewFolderName('')
      await loadDocuments()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!accessToken || !newWorkspaceName.trim()) return
    try {
      const created = await createWorkspace(accessToken, { name: newWorkspaceName.trim() })
      setWorkspaces((prev) => [...prev, created])
      setSelectedWorkspace(created)
      setNewWorkspaceName('')
      setMessage('Workspace created')
      await loadMembers()
      await loadDocuments()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create workspace')
    }
  }

  const handleRenameDocument = async (document: DocumentSummary) => {
    if (!accessToken) return
    const nextTitle = window.prompt('New document title', document.title)
    if (!nextTitle || nextTitle.trim() === document.title) return
    try {
      await renameDocument(document.id, accessToken, { title: nextTitle.trim() })
      await loadDocuments()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to rename document')
    }
  }

  const handleShareDocument = async (document: DocumentSummary) => {
    if (!accessToken) return
    try {
      const result = await createShareLink(document.id, accessToken)
      alert(`Share link: ${window.location.origin}/share/${result.shareLink.token}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to create share link')
    }
  }

  const handleAddTag = async (document: DocumentSummary) => {
    if (!accessToken) return
    const tag = window.prompt('Tag name')
    if (!tag) return
    try {
      await addDocumentTag(document.id, accessToken, tag.trim())
      await loadDocuments()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to add tag')
    }
  }

  const handleClearTag = async (document: DocumentSummary, tag: string) => {
    if (!accessToken) return
    try {
      await removeDocumentTag(document.id, tag, accessToken)
      await loadDocuments()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to remove tag')
    }
  }

  const renderFolders = () => (
    <List dense>
      {folders.map((folder) => (
        <ListItem
          key={folder.id}
          button
          selected={selectedFolderId === folder.id}
          onClick={() => handleSelectFolder(folder.id)}
        >
          <ListItemText primary={folder.name} secondary={folder.pathCache} />
        </ListItem>
      ))}
      <ListItem button selected={selectedFolderId === null} onClick={() => handleSelectFolder(null)}>
        <ListItemText primary='All documents' />
      </ListItem>
    </List>
  )

  return (
    <Stack spacing={3} sx={{ px: 2, py: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Typography variant='h4'>{workspaceStrings.workspaceOverview}</Typography>
            <Button variant='outlined' onClick={handleLogout}>
              {workspaceStrings.logoutLabel}
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} lg={4}>
          {workspaces.length === 0 && (
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6'>{workspaceStrings.createWorkspaceTitle}</Typography>
                <TextField
                  fullWidth
                  placeholder={workspaceStrings.createWorkspacePlaceholder}
                  value={newWorkspaceName}
                  onChange={(event) => setNewWorkspaceName(event.target.value)}
                  sx={{ mt: 2 }}
                />
                <Button variant='contained' onClick={handleCreateWorkspace} sx={{ mt: 2 }}>
                  {workspaceStrings.createWorkspaceButton}
                </Button>
              </CardContent>
            </Card>
          )}
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6'>{workspaceStrings.selectorTitle}</Typography>
              <Typography variant='body2' color='text.secondary' gutterBottom>
                {workspaceStrings.selectorHint}
              </Typography>
              <Stack spacing={1}>
                {workspaces.map((workspace) => (
                  <Button
                    key={workspace.id}
                    variant={workspace.id === selectedWorkspace?.id ? 'contained' : 'outlined'}
                    onClick={() => handleSelectWorkspace(workspace)}
                    fullWidth
                  >
                    <Stack direction='column' alignItems='flex-start'>
                      <Typography variant='subtitle1'>{workspace.name}</Typography>
                      <Typography variant='caption'>{workspace.slug}</Typography>
                    </Stack>
                    <Chip label={workspace.visibility} size='small' sx={{ ml: 'auto' }} />
                  </Button>
                ))}
                {!workspaces.length && <Typography>{workspaceStrings.noWorkspaces}</Typography>}
              </Stack>
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6'>{workspaceStrings.workspaceOverview}</Typography>
              {selectedWorkspace ? (
                <>
                  <Typography variant='body2' color='text.secondary'>
                    {workspaceStrings.descriptionLabel}: {selectedWorkspace.description ?? '—'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {workspaceStrings.visibilityLabel}: {selectedWorkspace.visibility}
                  </Typography>
                </>
              ) : (
                <Typography variant='body2'>{workspaceStrings.noWorkspaces}</Typography>
              )}
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6'>Folders</Typography>
              {folders.length === 0 ? <Typography variant='body2'>No folders yet.</Typography> : renderFolders()}
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6'>Recent updates</Typography>
              <List dense>
                {recentDocuments.length === 0 && <Typography variant='body2'>No recent updates.</Typography>}
                {recentDocuments.map((document) => (
                  <ListItem key={document.id}>
                    <ListItemText primary={document.title} secondary={formatDate(document.updatedAt)} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6'>{workspaceStrings.membersTitle}</Typography>
              {membersLoading ? (
                <Typography variant='body2'>Loading members...</Typography>
              ) : (
                <List dense>
                  {members.map((member) => (
                    <ListItem key={member.id}>
                      <ListItemText
                        primary={member.displayName ?? member.accountId}
                        secondary={[member.role, member.status].join(' · ')}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={8}>
          <Card variant='outlined'>
            <CardContent>
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                <Typography variant='h6'>{workspaceStrings.documentsTitle}</Typography>
                <TextField
                  value={docSearch}
                  onChange={(event) => setDocSearch(event.target.value)}
                  placeholder={workspaceStrings.documentSearchPlaceholder}
                  size='small'
                />
                <TextField
                  value={newDocTitle}
                  onChange={(event) => setNewDocTitle(event.target.value)}
                  placeholder='New document title'
                  size='small'
                />
                <Button variant='contained' onClick={handleCreateDocument} disabled={creatingDoc}>
                  New doc
                </Button>
                <TextField
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  placeholder='New folder name'
                  size='small'
                />
                <Button variant='outlined' onClick={handleCreateFolder} disabled={creatingFolder}>
                  New folder
                </Button>
                <Button variant='text' onClick={() => setShowEditor((prev) => !prev)}>
                  {workspaceStrings.openEditor}
                </Button>
              </Stack>
              {docMessage && (
                <Typography variant='body2' color='primary'>
                  {docMessage}
                </Typography>
              )}
              {message && (
                <Typography variant='body2' color='error'>
                  {message}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              {documentsLoading && <Typography>Loading documents...</Typography>}
              {!documentsLoading && documents.length === 0 && (
                <List dense>
                  {documents.map((document) => (
                    <ListItem key={document.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ListItemText
                          primary={document.title}
                          secondary={`${formatDate(document.updatedAt)} · ${
                            membershipById.get(document.ownerMembershipId)?.displayName ??
                            document.ownerMembershipId
                          }`}
                          sx={{ flex: '1 1 auto' }}
                        />
                        <Stack direction='row' spacing={1}>
                          <Button size='small' onClick={() => handleRenameDocument(document)}>
                            Rename
                          </Button>
                          <Button size='small' onClick={() => handleShareDocument(document)}>
                            Share
                          </Button>
                          <Button size='small' onClick={() => handleAddTag(document)}>
                            Tag
                          </Button>
                        </Stack>
                      </Box>
                      <Typography variant='body2' color='text.secondary'>
                        {document.summary ?? 'No summary'}
                      </Typography>
                      <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                        {document.tags.map((tag) => (
                          <Chip key={tag} label={tag} onDelete={() => handleClearTag(document, tag)} />
                        ))}
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
          {showEditor && (
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6'>{workspaceStrings.openEditor}</Typography>
                <Typography variant='body2'>Editor appears here.</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Stack>
  )
}

export default WorkspaceDashboard
