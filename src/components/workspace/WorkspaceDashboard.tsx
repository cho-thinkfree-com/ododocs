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
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import EditorLayout from '../layout/EditorLayout'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../lib/i18n'
import {
  closeWorkspace,
  DocumentSummary,
  getWorkspaceDocuments,
  getWorkspaceMembers,
  getWorkspaces,
  MembershipSummary,
  updateWorkspace,
  WorkspaceSummary,
} from '../../lib/api'

const WorkspaceDashboard = () => {
  const theme = useTheme()
  const { tokens } = useAuth()
  const { strings } = useI18n()
  const workspaceStrings = strings.workspace
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSummary | null>(null)
  const [members, setMembers] = useState<MembershipSummary[]>([])
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [memberMessage, setMemberMessage] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', description: '' })
  const [showEditor, setShowEditor] = useState(false)

  const accessToken = tokens?.accessToken
  const currentAccountId = tokens?.accountId

  const loadWorkspaces = useCallback(async () => {
    if (!accessToken) return
    setLoadingWorkspaces(true)
    try {
      const items = await getWorkspaces(accessToken)
      setWorkspaces(items)
      setSelectedWorkspace((prev) => {
        const matched = items.find((item) => item.id === prev?.id)
        return matched ?? items[0] ?? null
      })
    } finally {
      setLoadingWorkspaces(false)
    }
  }, [accessToken])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  useEffect(() => {
    if (!selectedWorkspace) {
      setWorkspaceForm({ name: '', description: '' })
      setMembers([])
      setDocuments([])
      return
    }
    setWorkspaceForm({
      name: selectedWorkspace.name,
      description: selectedWorkspace.description ?? '',
    })
    setShowEditor(false)
    const loadMembers = async () => {
      if (!accessToken) return
      setMembersLoading(true)
      setMemberMessage(null)
      try {
        const response = await getWorkspaceMembers(selectedWorkspace.id, accessToken)
        setMembers(response.items)
      } catch (error) {
        setMembers([])
        setMemberMessage(workspaceStrings.membersRestricted)
      } finally {
        setMembersLoading(false)
      }
    }
    loadMembers()
    const loadDocs = async () => {
      if (!accessToken) return
      setDocumentsLoading(true)
      try {
        const response = await getWorkspaceDocuments(selectedWorkspace.id, accessToken, docSearch)
        setDocuments(response.documents)
      } finally {
        setDocumentsLoading(false)
      }
    }
    loadDocs()
  }, [accessToken, selectedWorkspace, workspaceStrings.membersRestricted])

  const canUpdate =
    Boolean(selectedWorkspace) &&
    (selectedWorkspace.ownerAccountId === currentAccountId ||
      members.some((member) => member.accountId === currentAccountId && ['admin', 'owner'].includes(member.role)))
  const canClose = selectedWorkspace?.ownerAccountId === currentAccountId

  const handleSelectWorkspace = (workspace: WorkspaceSummary) => {
    setSelectedWorkspace(workspace)
    setMessage(null)
    setDocSearch('')
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedWorkspace) {
      return
    }
    if (!accessToken) return
    setDocumentsLoading(true)
    getWorkspaceDocuments(selectedWorkspace.id, accessToken, docSearch)
      .then((response) => setDocuments(response.documents))
      .finally(() => setDocumentsLoading(false))
  }

  const handleUpdate = async () => {
    if (!selectedWorkspace || !accessToken) {
      return
    }
    setUpdating(true)
    setMessage(null)
    try {
      const updated = await updateWorkspace(selectedWorkspace.id, accessToken, {
        name: workspaceForm.name.trim(),
        description: workspaceForm.description.trim() || '',
      })
      setSelectedWorkspace(updated)
      setWorkspaces((prev) => prev.map((ws) => (ws.id === updated.id ? updated : ws)))
      setMessage(workspaceStrings.updateSuccess)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update workspace')
    } finally {
      setUpdating(false)
    }
  }

  const handleClose = async () => {
    if (!selectedWorkspace || !accessToken) return
    const confirmed = window.confirm(`${workspaceStrings.closeWarning}`)
    if (!confirmed) return
    setClosing(true)
    try {
      await closeWorkspace(selectedWorkspace.id, accessToken)
      const remaining = workspaces.filter((ws) => ws.id !== selectedWorkspace.id)
      setWorkspaces(remaining)
      setSelectedWorkspace(remaining[0] ?? null)
      setShowEditor(false)
    } finally {
      setClosing(false)
    }
  }

  const handleFormChange = (field: 'name' | 'description') => (event: ChangeEvent<HTMLInputElement>) => {
    setWorkspaceForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  return (
    <Stack spacing={3} sx={{ px: 2, py: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6'>{workspaceStrings.selectorTitle}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {workspaceStrings.selectorHint}
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {loadingWorkspaces && (
                  <Typography variant='body2' color='text.secondary'>
                    {workspaceStrings.selectorHint}
                  </Typography>
                )}
                {workspaces.map((workspace) => (
                  <Button
                    key={workspace.id}
                    variant={selectedWorkspace?.id === workspace.id ? 'contained' : 'outlined'}
                    onClick={() => handleSelectWorkspace(workspace)}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <Box textAlign='left'>
                      <Typography variant='subtitle1'>{workspace.name}</Typography>
                      <Typography variant='caption'>{workspace.slug}</Typography>
                    </Box>
                    <Chip label={workspace.visibility} size='small' />
                  </Button>
                ))}
                {!loadingWorkspaces && workspaces.length === 0 && (
                  <Typography variant='body2'>{workspaceStrings.noWorkspaces}</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={8}>
          {selectedWorkspace ? (
            <Stack spacing={2}>
              <Card variant='outlined'>
                <CardContent>
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                    <Box>
                      <Typography variant='h6'>{workspaceStrings.workspaceOverview}</Typography>
                      <Typography variant='subtitle2'>{selectedWorkspace.slug}</Typography>
                    </Box>
                    <Chip label={`${workspaceStrings.ownerLabel}: ${selectedWorkspace.ownerAccountId}`} size='small' />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant='body2' color='text.secondary'>
                    {workspaceStrings.descriptionLabel}: {selectedWorkspace.description ?? '—'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {workspaceStrings.visibilityLabel}: {selectedWorkspace.visibility}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant='outlined'>
                <CardContent>
                  <Typography variant='h6'>{workspaceStrings.documentsTitle}</Typography>
                  <Box
                    component='form'
                    onSubmit={handleSearchSubmit}
                    sx={{ display: 'flex', gap: 1, mt: 1, mb: 2 }}
                  >
                    <TextField
                      placeholder={workspaceStrings.documentSearchPlaceholder}
                      value={docSearch}
                      onChange={(event) => setDocSearch(event.target.value)}
                      size='small'
                      fullWidth
                    />
                    <Button type='submit' variant='contained'>
                      {workspaceStrings.searchButton}
                    </Button>
                  </Box>
                  <Divider />
                  <List dense>
                    {documentsLoading && <Typography variant='body2'>Loading...</Typography>}
                    {!documentsLoading && documents.length === 0 && (
                      <Typography variant='body2'>{workspaceStrings.noDocuments}</Typography>
                    )}
                    {documents.map((doc) => (
                      <ListItem key={doc.id} disablePadding>
                        <ListItemText
                          primary={doc.title}
                          secondary={doc.summary ?? doc.visibility}
                          primaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
              <Card variant='outlined'>
                <CardContent>
                  <Typography variant='h6'>{workspaceStrings.membersTitle}</Typography>
                  {memberMessage ? (
                    <Typography variant='body2' color='text.secondary'>
                      {memberMessage}
                    </Typography>
                  ) : (
                    <List dense>
                      {membersLoading && (
                        <Typography variant='body2'>{workspaceStrings.membersRestricted}</Typography>
                      )}
                      {!membersLoading &&
                        members.map((member) => (
                          <ListItem key={member.id} disablePadding>
                            <ListItemText
                              primary={member.displayName ?? member.accountId}
                              secondary={`${member.role} · ${member.status}`}
                            />
                          </ListItem>
                        ))}
                    </List>
                  )}
                </CardContent>
              </Card>
              {canUpdate && (
                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h6'>{workspaceStrings.updateTitle}</Typography>
                    <TextField
                      label={workspaceStrings.descriptionLabel}
                      value={workspaceForm.description}
                      onChange={handleFormChange('description')}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                    <Box sx={{ mt: 2 }}>
                      <Button variant='contained' onClick={handleUpdate} disabled={updating}>
                        {workspaceStrings.updateButton}
                      </Button>
                      {message && (
                        <Typography variant='body2' color='primary' sx={{ ml: 2 }}>
                          {message}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}
              <Card variant='outlined'>
                <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant={showEditor ? 'outlined' : 'contained'}
                    onClick={() => setShowEditor((prev) => !prev)}
                  >
                    {workspaceStrings.openEditor}
                  </Button>
                  {canClose && (
                    <Button variant='outlined' color='error' onClick={handleClose} disabled={closing}>
                      {workspaceStrings.closeButton}
                    </Button>
                  )}
                </CardContent>
              </Card>
              {showEditor && (
                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h6'>{workspaceStrings.openEditor}</Typography>
                    <EditorLayout />
                  </CardContent>
                </Card>
              )}
            </Stack>
          ) : (
            <Typography variant='body2'>{workspaceStrings.noWorkspaces}</Typography>
          )}
        </Grid>
      </Grid>
    </Stack>
  )
}

export default WorkspaceDashboard
