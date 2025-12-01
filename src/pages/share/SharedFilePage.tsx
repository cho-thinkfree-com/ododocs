import { Box, Button, Typography, Paper, CircularProgress, Alert, TextField, Container, Chip } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { formatRelativeDate } from '../../lib/formatDate';

interface SharedFileInfo {
    file: {
        id: string;
        name: string;
        size: string;
        mimeType: string;
        extension: string;
        createdAt: string;
    };
    shareLink: {
        accessType: 'private' | 'link' | 'public';
        requiresPassword: boolean;
        expiresAt: string | null;
    };
}

const SharedFilePage = () => {
    const { token } = useParams<{ token: string }>();
    const [fileInfo, setFileInfo] = useState<SharedFileInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [canPreview, setCanPreview] = useState(false);

    const fetchFileInfo = async (pwd?: string) => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const queryParams = pwd ? `?password=${encodeURIComponent(pwd)}` : '';
            const response = await fetch(`/api/share/${token}/file${queryParams}`);

            if (response.status === 401) {
                const data = await response.json();
                if (data.code === 'PASSWORD_REQUIRED') {
                    setPasswordRequired(true);
                    setLoading(false);
                    return;
                }
            }

            if (!response.ok) {
                throw new Error('Failed to load file');
            }

            const data: SharedFileInfo = await response.json();
            setFileInfo(data);
            setPasswordRequired(false);

            // Check if preview is supported
            const mimeType = data.file.mimeType.toLowerCase();
            const isPreviewable =
                mimeType.startsWith('image/') ||
                mimeType.startsWith('video/') ||
                mimeType === 'application/pdf' ||
                mimeType.startsWith('text/');

            setCanPreview(isPreviewable);

            if (isPreviewable) {
                // Get preview URL
                setPreviewUrl(`/api/share/${token}/file/view${queryParams}`);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFileInfo();
    }, [token]);

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchFileInfo(password);
    };

    const handleDownload = () => {
        const queryParams = password ? `?password=${encodeURIComponent(password)}` : '';
        window.open(`/api/share/${token}/file/download${queryParams}`, '_blank');
    };

    const formatSize = (sizeStr: string) => {
        const bytes = parseInt(sizeStr, 10);
        if (isNaN(bytes)) return '-';
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (passwordRequired) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        Password Required
                    </Typography>
                    <Typography color="text.secondary" paragraph>
                        This file is password protected. Please enter the password to continue.
                    </Typography>
                    <Box component="form" onSubmit={handlePasswordSubmit} sx={{ mt: 3 }}>
                        <TextField
                            fullWidth
                            type="password"
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={!password}
                        >
                            Submit
                        </Button>
                    </Box>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </Paper>
            </Container>
        );
    }

    if (error || !fileInfo) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Alert severity="error">
                    {error || 'File not found or access denied'}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper sx={{ p: 4 }}>
                {/* Header */}
                <Box display="flex" alignItems="flex-start" gap={2} mb={3}>
                    <InsertDriveFileIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Box flex={1}>
                        <Typography variant="h4" gutterBottom>
                            {fileInfo.file.name}
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                {formatSize(fileInfo.file.size)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                •
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {fileInfo.file.extension.toUpperCase()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                •
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatRelativeDate(fileInfo.file.createdAt)}
                            </Typography>
                            {fileInfo.shareLink.accessType === 'public' && (
                                <Chip label="Public" size="small" color="success" />
                            )}
                        </Box>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownload}
                        size="large"
                    >
                        Download
                    </Button>
                </Box>

                {/* Preview */}
                {canPreview && previewUrl ? (
                    <Box sx={{ mt: 4, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100' }}>
                        {fileInfo.file.mimeType.startsWith('image/') && (
                            <img
                                src={previewUrl}
                                alt={fileInfo.file.name}
                                style={{ maxWidth: '100%', display: 'block' }}
                            />
                        )}
                        {fileInfo.file.mimeType.startsWith('video/') && (
                            <video
                                src={previewUrl}
                                controls
                                style={{ maxWidth: '100%', display: 'block' }}
                            />
                        )}
                        {fileInfo.file.mimeType === 'application/pdf' && (
                            <iframe
                                src={previewUrl}
                                style={{ width: '100%', height: '800px', border: 'none' }}
                                title="PDF Preview"
                            />
                        )}
                        {fileInfo.file.mimeType.startsWith('text/') && (
                            <Box sx={{ p: 2, bgcolor: 'white' }}>
                                <Typography
                                    component="pre"
                                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}
                                >
                                    {/* Text content would be loaded separately */}
                                    Preview available - click Download to view full content
                                </Typography>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Alert severity="info" sx={{ mt: 4 }}>
                        Preview not available for this file type. Click Download to view the file.
                    </Alert>
                )}

                {/* Expiry Warning */}
                {fileInfo.shareLink.expiresAt && (
                    <Alert severity="warning" sx={{ mt: 3 }}>
                        This link expires {formatRelativeDate(fileInfo.shareLink.expiresAt)}
                    </Alert>
                )}
            </Paper>
        </Container>
    );
};

export default SharedFilePage;
