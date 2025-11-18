import { Alert, Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getWorkspaces, updateWorkspace, type WorkspaceSummary } from '../../lib/api';

const WorkspaceSettingsPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { tokens } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (tokens && workspaceId) {
      setLoading(true);
      getWorkspaces(tokens.accessToken)
        .then((workspaces) => {
          const currentWorkspace = workspaces.find((ws) => ws.id === workspaceId);
          if (currentWorkspace) {
            setWorkspace(currentWorkspace);
            setName(currentWorkspace.name);
            setDescription(currentWorkspace.description || '');
          } else {
            setError('Workspace not found.');
          }
        })
        .catch((err) => {
          setError((err as Error).message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tokens, workspaceId]);

  const handleSave = async () => {
    if (!tokens || !workspaceId) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updateWorkspace(workspaceId, tokens.accessToken, { name, description });
      setSaveSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!workspace) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">Workspace not found.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Workspace Settings
      </Typography>

      <Box component="form" sx={{ mt: 3 }}>
        <TextField
          label="Workspace Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          disabled={isSaving}
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          disabled={isSaving}
        />
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          sx={{ mt: 2 }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        {saveSuccess && (
          <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
            Changes saved successfully!
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default WorkspaceSettingsPage;
