import { Alert, Box, Button, Card, CardActionArea, CardContent, CircularProgress, Container, Grid, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createWorkspace, getWorkspaces, getRecentDocuments, type WorkspaceSummary, type DocumentSummary } from '../../lib/api';
import AddIcon from '@mui/icons-material/Add';
import CreateWorkspaceDialog from '../../components/workspace/CreateWorkspaceDialog';
import ArticleIcon from '@mui/icons-material/Article';

const WorkspaceDashboardPage = () => {
  const { tokens } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<DocumentSummary[]>([]);
  const [recentDocumentsLoading, setRecentDocumentsLoading] = useState(true);
  const [recentDocumentsError, setRecentDocumentsError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(() => {
    if (tokens) {
      setLoading(true);
      getWorkspaces(tokens.accessToken)
        .then((data) => {
          setWorkspaces(data);
        })
        .catch((err) => {
          setError((err as Error).message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tokens]);

  const fetchRecentDocuments = useCallback(() => {
    if (tokens) {
      setRecentDocumentsLoading(true);
      getRecentDocuments(tokens.accessToken)
        .then((data) => {
          setRecentDocuments(data);
        })
        .catch((err) => {
          setRecentDocumentsError((err as Error).message);
        })
        .finally(() => {
          setRecentDocumentsLoading(false);
        });
    }
  }, [tokens]);

  useEffect(() => {
    fetchWorkspaces();
    fetchRecentDocuments();
  }, [fetchWorkspaces, fetchRecentDocuments]);

  const handleCreateWorkspace = async (name: string) => {
    if (!tokens) {
      throw new Error('Not authenticated');
    }
    await createWorkspace(tokens.accessToken, { name });
    fetchWorkspaces(); // Refetch workspaces after creation
  };

  const renderWorkspaces = () => {
    if (loading) {
      return <CircularProgress />;
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (workspaces.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            No workspaces found.
          </Typography>
          <Typography color="text.secondary" paragraph>
            Get started by creating your first workspace.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Create Workspace
          </Button>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {workspaces.map((ws) => (
          <Grid item xs={12} sm={6} md={4} key={ws.id}>
            <Card>
              <CardActionArea component={RouterLink} to={`/workspace/${ws.id}`}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {ws.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ws.description || 'No description'}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
         <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardActionArea onClick={() => setCreateDialogOpen(true)} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AddIcon fontSize="large" color="action" />
                <Typography variant="h6" color="text.secondary">
                  Create new workspace
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderRecentDocuments = () => {
    if (recentDocumentsLoading) {
      return <CircularProgress />;
    }

    if (recentDocumentsError) {
      return <Alert severity="error">{recentDocumentsError}</Alert>;
    }

    if (recentDocuments.length === 0) {
      return (
        <Typography color="text.secondary">
          No recent documents. Create a new document to see it here.
        </Typography>
      );
    }

    return (
      <Grid container spacing={2}>
        {recentDocuments.map((doc) => (
          <Grid item xs={12} sm={6} md={3} key={doc.id}>
            <Card>
              <CardActionArea component={RouterLink} to={`/document/${doc.id}`}>
                <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArticleIcon sx={{ mr: 1.5 }} />
                  <Typography variant="body1">{doc.title}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Workspace Dashboard
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Welcome back!
      </Typography>

      <Box sx={{ my: 4 }}>
        <TextField
          fullWidth
          label="Search documents across all workspaces..."
          variant="outlined"
        />
      </Box>

      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Your Workspaces
        </Typography>
        {renderWorkspaces()}
      </Box>

      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Recent Documents
        </Typography>
        {renderRecentDocuments()}
      </Box>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </Container>
  );
};

export default WorkspaceDashboardPage;
