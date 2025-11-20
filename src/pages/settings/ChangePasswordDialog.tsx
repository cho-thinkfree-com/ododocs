import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Box
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { updateAccount } from '../../lib/api';

interface ChangePasswordDialogProps {
    open: boolean;
    onClose: () => void;
}

export const ChangePasswordDialog = ({ open, onClose }: ChangePasswordDialogProps) => {
    const { tokens } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleClose = () => {
        // Reset state on close
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tokens) return;

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await updateAccount(tokens.accessToken, {
                currentPassword,
                newPassword
            });
            setSuccess('Password changed successfully.');
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Change Password</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Current Password"
                            type="password"
                            fullWidth
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={loading || !!success}
                            autoFocus
                        />
                        <TextField
                            label="New Password"
                            type="password"
                            fullWidth
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading || !!success}
                            helperText="Minimum 8 characters"
                        />
                        <TextField
                            label="Confirm New Password"
                            type="password"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading || !!success}
                            error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                            helperText={confirmPassword.length > 0 && newPassword !== confirmPassword ? "Passwords do not match" : ""}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading || !!success}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Change Password'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
