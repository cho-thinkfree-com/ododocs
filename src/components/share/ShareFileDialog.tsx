import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Switch,
    Box,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface ShareFileDialogProps {
    open: boolean;
    onClose: () => void;
    fileName: string;
    onShare: (options: {
        password?: string;
        expiresAt?: string;
        isPublic?: boolean;
    }) => Promise<{ url: string; token: string }>;
}

const ShareFileDialog = ({ open, onClose, fileName, onShare }: ShareFileDialogProps) => {
    const [password, setPassword] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await onShare({
                password: password || undefined,
                expiresAt: expiresAt || undefined,
                isPublic,
            });

            const fullUrl = `${window.location.origin}${result.url}`;
            setShareUrl(fullUrl);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleClose = () => {
        setPassword('');
        setExpiresAt('');
        setIsPublic(false);
        setShareUrl(null);
        setError(null);
        setCopied(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Share "{fileName}"</DialogTitle>
            <DialogContent>
                {!shareUrl ? (
                    <Box sx={{ pt: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body1">Make Public</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Public files can be indexed by search engines
                                    </Typography>
                                </Box>
                            }
                            sx={{ mb: 3, alignItems: 'flex-start' }}
                        />

                        <TextField
                            fullWidth
                            label="Password (Optional)"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            helperText="Leave empty for no password protection"
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            fullWidth
                            label="Expires At (Optional)"
                            type="datetime-local"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            helperText="Leave empty for no expiration"
                            sx={{ mb: 2 }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ pt: 2 }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Share link created successfully!
                        </Alert>

                        <TextField
                            fullWidth
                            label="Share URL"
                            value={shareUrl}
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleCopy} edge="end">
                                            {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />

                        <Typography variant="caption" color="text.secondary">
                            Anyone with this link can {isPublic ? 'access (public)' : 'access'} this file
                            {password && ' with the password you set'}
                            {expiresAt && ` until ${new Date(expiresAt).toLocaleString()}`}.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    {shareUrl ? 'Close' : 'Cancel'}
                </Button>
                {!shareUrl && (
                    <Button
                        onClick={handleShare}
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        Create Link
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ShareFileDialog;
