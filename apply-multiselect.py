import re

# Read the file
with open('src/pages/workspace/WorkspacePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add Checkbox to imports (line 1)
content = content.replace(
    "Snackbar } from '@mui/material';",
    "Snackbar, Checkbox } from '@mui/material';"
)

# Step 2: Add SelectionToolbar import (after line 19)
content = content.replace(
    "import ShareDialog from '../../components/editor/ShareDialog';",
    "import ShareDialog from '../../components/editor/ShareDialog';\nimport SelectionToolbar from '../../components/workspace/SelectionToolbar';"
)

# Step 3: Add multi-select state (after snackbarMessage state)
content = content.replace(
    "const [snackbarMessage, setSnackbarMessage] = useState('');",
    """const [snackbarMessage, setSnackbarMessage] = useState('');

  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);"""
)

# Step 4: Add handlers after handleRename
handlers_code = """

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

# Find the end of handleRename and add handlers
pattern = r"(    } finally \{\r?\n      setRenameDialogOpen\(false\);\r?\n      setSelectedItem\(null\);\r?\n    }\r?\n  };)"
content = re.sub(pattern, r"\1" + handlers_code, content)

# Step 5: Add helper variables before renderFilesAndFolders
content = content.replace(
    "  const renderFilesAndFolders = () => {",
    """  const totalItems = folders.length + documents.length;
  const isAllSelected = selectedItems.size === totalItems && totalItems > 0;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < totalItems;

  const renderFilesAndFolders = () => {"""
)

# Step 6: Add checkbox column to table header
old_header = """          <TableHead>
            <TableRow>
              <TableCell width="40%">{strings.workspace.nameColumn}</TableCell>"""

new_header = """          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell width="35%">{strings.workspace.nameColumn}</TableCell>"""

content = content.replace(old_header, new_header)

# Step 7: Add checkbox to folder rows
# Add selected prop
content = re.sub(
    r"(<TableRow\r?\n                key=\{folder\.id\}\r?\n                hover)",
    r"\1\n                selected={selectedItems.has(folder.id)}",
    content
)

# Add checkbox cell for folders
old_folder_cell = """              >
                <TableCell>
                  <Link component={RouterLink} to={`?folderId=${folder.id}`}"""

new_folder_cell = """              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.has(folder.id)}
                    onChange={(e) => handleToggleItem(folder.id, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell>
                  <Link component={RouterLink} to={`?folderId=${folder.id}`}"""

content = content.replace(old_folder_cell, new_folder_cell)

# Step 8: Add checkbox to document rows
# Add selected prop
content = re.sub(
    r"(<TableRow key=\{doc\.id\} hover)>",
    r"\1 selected={selectedItems.has(doc.id)}>",
    content
)

# Add checkbox cell for documents
old_doc_cell = """              <TableRow key={doc.id} hover selected={selectedItems.has(doc.id)}>
                <TableCell>
                  <Link component={RouterLink} to={`/document/${doc.id}`}"""

new_doc_cell = """              <TableRow key={doc.id} hover selected={selectedItems.has(doc.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.has(doc.id)}
                    onChange={(e) => handleToggleItem(doc.id, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell>
                  <Link component={RouterLink} to={`/document/${doc.id}`}"""

content = content.replace(old_doc_cell, new_doc_cell)

# Step 9: Add bulk delete dialog and SelectionToolbar
old_end = """      </Snackbar>
    </Container >
  );
};

export default WorkspacePage;"""

new_end = """      </Snackbar>

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
    </Container >
  );
};

export default WorkspacePage;"""

content = content.replace(old_end, new_end)

# Write the modified content
with open('src/pages/workspace/WorkspacePage.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("✓ Multi-select functionality added to WorkspacePage.tsx")
