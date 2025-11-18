import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { useState } from 'react';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const CreateWorkspaceDialog = ({ open, onClose, onCreate }: CreateWorkspaceDialogProps) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(name);
      onClose();
      setName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    setName('');
    setError(null);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Create a new workspace</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Give your new workspace a name. You can change this later.
        </DialogContentText>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Workspace Name"
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
        <Button onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateWorkspaceDialog;
