import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { useState } from 'react';

interface CreateDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const CreateDocumentDialog = ({ open, onClose, onCreate }: CreateDocumentDialogProps) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Document title is required.');
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
      <DialogTitle>Create a new document</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Give your new document a title.
        </DialogContentText>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Document Title"
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

export default CreateDocumentDialog;
