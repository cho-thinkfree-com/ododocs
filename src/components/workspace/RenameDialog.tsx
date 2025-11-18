import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { useState, useEffect } from 'react';

interface RenameDialogProps {
  open: boolean;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  initialName: string;
  itemType: 'document' | 'folder';
}

const RenameDialog = ({ open, onClose, onRename, initialName, itemType }: RenameDialogProps) => {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  const handleRename = async () => {
    if (!name.trim()) {
      setError(`New ${itemType} name is required.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onRename(name);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Rename {itemType}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter a new name for the {itemType}.
        </DialogContentText>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="New Name"
          type="text"
          fullWidth
          variant="standard"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleRename} disabled={loading}>
          {loading ? 'Renaming...' : 'Rename'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameDialog;
