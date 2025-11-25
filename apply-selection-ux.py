import re

# Read the file
with open('src/pages/workspace/WorkspacePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add new icon imports
content = content.replace(
    "import NavigateNextIcon from '@mui/icons-material/NavigateNext';",
    """import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PublicIcon from '@mui/icons-material/Public';"""
)

# Step 2: Add lastSelectedId state
content = content.replace(
    "const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());",
    """const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);"""
)

# Step 3: Update handleToggleItem to track lastSelectedId
old_toggle = """  const handleToggleItem = (itemId: string, event?: React.MouseEvent) => {
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
  };"""

new_toggle = """  const handleToggleItem = (itemId: string, event?: React.MouseEvent) => {
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
    setLastSelectedId(itemId);
  };"""

content = content.replace(old_toggle, new_toggle)

# Step 4: Add new handlers after handleBulkDeleteConfirm
new_handlers = """

  const handleRowClick = (itemId: string, event: React.MouseEvent) => {
    // Ignore clicks on links, buttons, and checkboxes
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input')) {
      return;
    }

    const newSelected = new Set(selectedItems);

    if (event.shiftKey && lastSelectedId) {
      // Shift+click: Range selection
      const allIds = [...folders.map(f => f.id), ...documents.map(d => d.id)];
      const lastIndex = allIds.indexOf(lastSelectedId);
      const currentIndex = allIds.indexOf(itemId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        for (let i = start; i <= end; i++) {
          newSelected.add(allIds[i]);
        }
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: Toggle selection
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
    } else {
      // Regular click: Select only this item
      newSelected.clear();
      newSelected.add(itemId);
    }

    setSelectedItems(newSelected);
    setLastSelectedId(itemId);
  };

  const handleRowDoubleClick = (itemId: string, itemType: 'document' | 'folder') => {
    if (itemType === 'document') {
      window.open(`/document/${itemId}`, '_blank');
    } else {
      navigate(`?folderId=${itemId}`);
    }
  };

  const handleStar = () => {
    // Placeholder for future implementation
    console.log('Star functionality to be implemented');
  };

  const handlePublish = async () => {
    const selectedDocs = documents.filter(d => selectedItems.has(d.id));
    
    if (selectedDocs.length === 0) {
      return;
    }

    // Copy document links to clipboard
    const links = selectedDocs.map(doc => {
      const url = `${window.location.origin}/document/${doc.id}`;
      return `[${doc.title}](${url})`;
    }).join('\\n');

    try {
      await navigator.clipboard.writeText(links);
      setSnackbarMessage(`Copied ${selectedDocs.length} link(s) to clipboard`);
      setSnackbarOpen(true);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };"""

# Find where to insert (after handleBulkDeleteConfirm)
pattern = r"(    } finally \{\s+setBulkDeleteConfirmOpen\(false\);\s+\}\s+\};)"
content = re.sub(pattern, r"\1" + new_handlers, content)

# Step 5: Update handleBulkDeleteConfirm to remove dialog and use toast only
old_bulk_delete = """  const handleBulkDeleteClick = () => {
    setBulkDeleteConfirmOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (!isAuthenticated || !workspaceId) return;
    
    const itemsToDelete = Array.from(selectedItems);
    const errors: string[] = [];
    
    try {
      await Promise.all(
        itemsToDelete.map(async (itemId) => {
          const isDocument = documents.some(d => d.id === itemId);
          try {
            if (isDocument) {
              await deleteDocument(itemId);
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
            console.error(`Failed to delete item ${itemId}:`, err);
          }
        })
      );
      
      const successCount = itemsToDelete.length - errors.length;
      setSnackbarMessage(`${successCount} item(s) moved to trash`);
      setSnackbarOpen(true);
      fetchContents();
      setSelectedItems(new Set());
      
      if (errors.length > 0) {
        setError(`Failed to delete ${errors.length} item(s)`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkDeleteConfirmOpen(false);
    }
  };"""

new_bulk_delete = """  const handleBulkDelete = async () => {
    if (!isAuthenticated || !workspaceId) return;
    
    const itemsToDelete = Array.from(selectedItems);
    const errors: string[] = [];
    
    try {
      await Promise.all(
        itemsToDelete.map(async (itemId) => {
          const isDocument = documents.some(d => d.id === itemId);
          try {
            if (isDocument) {
              await deleteDocument(itemId);
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
            console.error(`Failed to delete item ${itemId}:`, err);
          }
        })
      );
      
      const successCount = itemsToDelete.length - errors.length;
      setSnackbarMessage(`${successCount} item(s) moved to trash`);
      setSnackbarOpen(true);
      fetchContents();
      setSelectedItems(new Set());
      
      if (errors.length > 0) {
        setError(`Failed to delete ${errors.length} item(s)`);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };"""

content = content.replace(old_bulk_delete, new_bulk_delete)

# Step 6: Remove bulkDeleteConfirmOpen state
content = content.replace(
    "const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);",
    ""
)

# Step 7: Add selectedItemsData helper
content = content.replace(
    "const totalItems = folders.length + documents.length;",
    """const totalItems = folders.length + documents.length;
  const selectedItemsData = {
    hasDocuments: Array.from(selectedItems).some(id => documents.some(d => d.id === id)),
    hasFolders: Array.from(selectedItems).some(id => folders.some(f => f.id === id)),
  };
  """
)

# Step 8: Update folder row to add click handlers and cursor style
old_folder_row = """              <TableRow
                key={folder.id}
                hover
                selected={selectedItems.has(folder.id)}"""

new_folder_row = """              <TableRow
                key={folder.id}
                hover
                selected={selectedItems.has(folder.id)}
                onClick={(e) => handleRowClick(folder.id, e)}
                onDoubleClick={() => handleRowDoubleClick(folder.id, 'folder')}
                sx={{ cursor: 'pointer' }}"""

content = content.replace(old_folder_row, new_folder_row)

# Step 9: Update document row to add click handlers and cursor style
old_doc_row = """              <TableRow key={doc.id} hover selected={selectedItems.has(doc.id)}>"""

new_doc_row = """              <TableRow 
                key={doc.id} 
                hover 
                selected={selectedItems.has(doc.id)}
                onClick={(e) => handleRowClick(doc.id, e)}
                onDoubleClick={() => handleRowDoubleClick(doc.id, 'document')}
                sx={{ cursor: 'pointer' }}
              >"""

content = content.replace(old_doc_row, new_doc_row)

# Step 10: Move SelectionToolbar to between Files title and table
# First, remove it from the bottom
old_bottom_toolbar = """      </Snackbar>

      <Dialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Bulk Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selectedItems.size} item(s)? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <SelectionToolbar
        selectedCount={selectedItems.size}
        onDelete={handleBulkDeleteClick}
        onClearSelection={handleClearSelection}
      />
    </Container >"""

new_bottom = """      </Snackbar>
    </Container >"""

content = content.replace(old_bottom_toolbar, new_bottom)

# Add SelectionToolbar between Files title and table
old_files_section = """      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          {strings.workspace.filesTitle}
        </Typography>
        {renderFilesAndFolders()}
      </Box>"""

new_files_section = """      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          {strings.workspace.filesTitle}
        </Typography>
        <SelectionToolbar
          selectedCount={selectedItems.size}
          hasDocuments={selectedItemsData.hasDocuments}
          onDelete={handleBulkDelete}
          onClearSelection={handleClearSelection}
          onStar={handleStar}
          onPublish={handlePublish}
        />
        {renderFilesAndFolders()}
      </Box>"""

content = content.replace(old_files_section, new_files_section)

# Write the modified content
with open('src/pages/workspace/WorkspacePage.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("✓ Selection UX enhancements applied to WorkspacePage.tsx")
