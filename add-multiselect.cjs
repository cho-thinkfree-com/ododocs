// This script adds multi-select functionality to WorkspacePage.tsx
// Run with: node add-multiselect.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'workspace', 'WorkspacePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Checkbox to imports
content = content.replace(
    "import { Alert, Box, Breadcrumbs, Button, CircularProgress, Container, Link, Typography, Menu, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, useTheme, Snackbar } from '@mui/material';",
    "import { Alert, Box, Breadcrumbs, Button, CircularProgress, Container, Link, Typography, Menu, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, useTheme, Snackbar, Checkbox } from '@mui/material';"
);

// 2. Add SelectionToolbar import
content = content.replace(
    "import ShareDialog from '../../components/editor/ShareDialog';",
    "import ShareDialog from '../../components/editor/ShareDialog';\nimport SelectionToolbar from '../../components/workspace/SelectionToolbar';"
);

// 3. Add multi-select state after snackbarMessage state
content = content.replace(
    "const [snackbarMessage, setSnackbarMessage] = useState('');",
    `const [snackbarMessage, setSnackbarMessage] = useState('');

  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);`
);

// 4. Add multi-select handlers after handleRename function
const handleRenameEnd = `    } finally {
      setRenameDialogOpen(false);
      setSelectedItem(null);
    }
  };`;

const multiSelectHandlers = `    } finally {
      setRenameDialogOpen(false);
      setSelectedItem(null);
    }
  };

  // Multi-select handlers
  const handleToggleItem = (itemId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = [
      ...folders.map(f => f.id),
      ...documents.map(d => d.id)
    ];
    
    if (selectedItems.size === allIds.length && allIds.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleBulkDeleteClick = () => {
    setBulkDeleteConfirmOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (!isAuthenticated || !workspaceId) return;
    
    const itemsToDelete = Array.from(selectedItems);
    const errors: string[] = [];
    
    try {
      // Delete items in parallel
      await Promise.all(
        itemsToDelete.map(async (itemId) => {
          const isDocument = documents.some(d => d.id === itemId);
          try {
            if (isDocument) {
              await deleteDocument(itemId);
              // Broadcast document deletion
              broadcastSync({
                type: 'document-deleted',
                workspaceId,
                folderId: folderId ?? null,
                documentId: itemId
              });
            } else {
              await deleteFolder(itemId);
            }
          } catch (err) {
            errors.push(itemId);
            console.error(\`Failed to delete item \${itemId}:\`, err);
          }
        })
      );
      
      const successCount = itemsToDelete.length - errors.length;
      setSnackbarMessage(\`\${successCount} item(s) moved to trash\`);
      setSnackbarOpen(true);
      fetchContents();
      setSelectedItems(new Set());
      
      if (errors.length > 0) {
        setError(\`Failed to delete \${errors.length} item(s)\`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkDeleteConfirmOpen(false);
    }
  };`;

content = content.replace(handleRenameEnd, multiSelectHandlers);

// 5. Add totalItems calculation before renderFilesAndFolders
content = content.replace(
    "const renderFilesAndFolders = () => {",
    `const totalItems = folders.length + documents.length;
  const isAllSelected = selectedItems.size === totalItems && totalItems > 0;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < totalItems;

  const renderFilesAndFolders = () => {`
);

// Write the modified content back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Multi-select state and handlers added to WorkspacePage.tsx');
