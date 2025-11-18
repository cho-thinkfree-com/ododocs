import { Alert, Box, Breadcrumbs, Button, CircularProgress, Container, Link, Typography, Menu, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getWorkspaceDocuments, getFolder, createFolder, createDocument, deleteDocument, deleteFolder, renameDocument, renameFolder, type DocumentSummary, type FolderSummary } from '../../lib/api';
import { formatRelativeDate } from '../../lib/formatDate';
import FolderIcon from '@mui/icons-material/Folder';
import ArticleIcon from '@mui/icons-material/Article';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CreateFolderDialog from '../../components/workspace/CreateFolderDialog';
import CreateDocumentDialog from '../../components/workspace/CreateDocumentDialog';
import RenameDialog from '../../components/workspace/RenameDialog';

const WorkspacePage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const { tokens } = useAuth();
  const navigate = useNavigate();
  const [currentFolder, setCurrentFolder] = useState<FolderSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [isCreateDocumentDialogOpen, setCreateDocumentDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: 'document' | 'folder' } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  const fetchContents = useCallback(() => {
    if (tokens && workspaceId) {
      setLoading(true);

      const folderDetailsPromise = folderId
        ? getFolder(folderId, tokens.accessToken)
        : Promise.resolve(null);

      Promise.all([
        folderDetailsPromise,
        getWorkspaceDocuments(workspaceId, tokens.accessToken, { folderId: folderId ?? undefined }),
      ])
        .then(([folderDetails, contents]) => {
          setCurrentFolder(folderDetails);
          setDocuments(contents.documents);
          setFolders(contents.folders);
        })
        .catch((err) => {
          setError((err as Error).message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tokens, workspaceId, folderId]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const handleCreateFolder = async (name: string) => {
    if (!tokens || !workspaceId) {
      throw new Error('Not authenticated or workspace not found');
    }
    await createFolder(workspaceId, tokens.accessToken, { name, parentId: folderId ?? undefined });
    fetchContents(); // Refetch contents after creation
  };

  const handleCreateDocument = async (title: string) => {
    if (!tokens || !workspaceId) {
      throw new Error('Not authenticated or workspace not found');
    }
    const newDoc = await createDocument(workspaceId, tokens.accessToken, { title, folderId: folderId ?? undefined });
    navigate(`/document/${newDoc.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: { id: string; name: string; type: 'document' | 'folder' }) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleRenameClick = () => {
    setRenameDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!tokens || !selectedItem) {
      return;
    }
    try {
      if (selectedItem.type === 'document') {
        await deleteDocument(selectedItem.id, tokens.accessToken);
      } else {
        await deleteFolder(selectedItem.id, tokens.accessToken);
      }
      fetchContents();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedItem(null);
    }
  };

  const handleRename = async (newName: string) => {
    if (!tokens || !selectedItem) {
      return;
    }
    try {
      if (selectedItem.type === 'document') {
        await renameDocument(selectedItem.id, tokens.accessToken, { title: newName });
      } else {
        await renameFolder(selectedItem.id, tokens.accessToken, { name: newName });
      }
      fetchContents();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRenameDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const breadcrumbPaths = useMemo(() => {
    const paths = [{ name: 'Workspace Root', path: `/workspace/${workspaceId}` }];
    if (currentFolder && currentFolder.pathCache) {
      const segments = currentFolder.pathCache.split('/').filter(Boolean); // Split by / and remove empty strings
      let currentPath = `/workspace/${workspaceId}`;
      segments.forEach((segment, index) => {
        // This assumes folder names are unique enough for pathing, or we need folder IDs in pathCache
        // For now, we'll just use the segment name.
        // A more robust solution would involve mapping segment names to folder IDs.
        currentPath += `?folderId=${currentFolder.id}`; // This is a simplification, ideally each segment would have its own folderId
        paths.push({ name: segment, path: currentPath });
      });
    }
    return paths;
  }, [currentFolder, workspaceId]);

  const renderFilesAndFolders = () => {
    if (loading) {
      return <CircularProgress />;
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (folders.length === 0 && documents.length === 0) {
      return (
        <Typography color="text.secondary">
          No files or folders in this location.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Last Modified</TableCell>
              <TableCell>Last Modified By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {folders.map((folder) => (
              <TableRow key={folder.id}>
                <TableCell>
                  <Link component={RouterLink} to={`?folderId=${folder.id}`} sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <FolderIcon sx={{ mr: 1.5 }} />
                    {folder.name}
                  </Link>
                </TableCell>
                <TableCell>{formatRelativeDate(folder.updatedAt)}</TableCell>
                <TableCell></TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label="more"
                    aria-controls="long-menu"
                    aria-haspopup="true"
                    onClick={(event) => handleMenuOpen(event, { id: folder.id, name: folder.name, type: 'folder' })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <Link component={RouterLink} to={`/document/${doc.id}`} sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <ArticleIcon sx={{ mr: 1.5 }} />
                    {doc.title}
                  </Link>
                </TableCell>
                <TableCell>{formatRelativeDate(doc.updatedAt)}</TableCell>
                <TableCell>{doc.lastModifiedBy}</TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label="more"
                    aria-controls="long-menu"
                    aria-haspopup="true"
                    onClick={(event) => handleMenuOpen(event, { id: doc.id, name: doc.title, type: 'document' })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderRecentDocuments = () => {
    if (loading) {
      return <CircularProgress />;
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (documents.length === 0) {
      return (
        <Typography color="text.secondary">
          No recent documents in this workspace.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Last Modified</TableCell>
              <TableCell>Last Modified By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <Link component={RouterLink} to={`/document/${doc.id}`} sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <ArticleIcon sx={{ mr: 1.5 }} />
                    {doc.title}
                  </Link>
                </TableCell>
                <TableCell>{formatRelativeDate(doc.updatedAt)}</TableCell>
                <TableCell>{doc.lastModifiedBy}</TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label="more"
                    aria-controls="long-menu"
                    aria-haspopup="true"
                    onClick={(event) => handleMenuOpen(event, { id: doc.id, name: doc.title, type: 'document' })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ flexGrow: 1 }}>
          {breadcrumbPaths.map((item, index) => (
            index === breadcrumbPaths.length - 1 ? (
              <Typography color="text.primary" key={item.name}>
                {item.name}
              </Typography>
            ) : (
              <Link component={RouterLink} underline="hover" color="inherit" to={item.path} key={item.name}>
                {item.name}
              </Link>
            )
          ))}
        </Breadcrumbs>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateDocumentDialogOpen(true)}>
          New Document
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateFolderDialogOpen(true)}>
          Create Folder
        </Button>
      </Box>


      {!folderId && (
        <Box sx={{ my: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Recent Documents
          </Typography>
          {renderRecentDocuments()}
        </Box>
      )}

      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Files & Folders
        </Typography>
        {renderFilesAndFolders()}
      </Box>

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        onCreate={handleCreateFolder}
      />
      <CreateDocumentDialog
        open={isCreateDocumentDialogOpen}
        onClose={() => setCreateDocumentDialogOpen(false)}
        onCreate={handleCreateDocument}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRenameClick}>Rename</MenuItem>
        <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
      </Menu>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {selectedItem && (
        <RenameDialog
          open={renameDialogOpen}
          onClose={() => setRenameDialogOpen(false)}
          onRename={handleRename}
          initialName={selectedItem.name}
          itemType={selectedItem.type}
        />
      )}
    </Container>
  );
};

export default WorkspacePage;
