import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import SharedFilePage from './SharedFilePage';
import ViewerPage from '../editor/ViewerPage';
import { resolveShareLink } from '../../lib/api';

/**
 * Universal share page that detects whether the token is for a Document or File
 * and renders the appropriate component.
 * 
 * Also handles accessType distinction:
 * - accessType='public': Searchable by search engines (open graph, etc)
 * - accessType='link': Link-only, not searchable
 * - accessType='private': Requires password
 */
const SharePage = ({ token: propToken }: { token?: string }) => {
    const params = useParams<{ token: string }>();
    const token = propToken || params.token;
    const location = useLocation();
    const navigate = useNavigate();
    const [contentType, setContentType] = useState<'document' | 'file' | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const detectContentType = async () => {
            if (!token) return;

            const publicUrlPath = location.pathname.startsWith('/public');
            const isBlogUrl = location.pathname.startsWith('/blog');

            try {
                // Use resolveShareLink for everything as it returns both file and shareLink info
                const result = await resolveShareLink(token);

                if (result.shareLink) {
                    const linkAccessType = result.shareLink.accessType;

                    // Redirect to correct URL if path doesn't match accessType
                    const publicUrlPath = location.pathname.startsWith('/public');
                    if (linkAccessType === 'public' && !publicUrlPath) {
                        // Link is public but accessed via /share - redirect to /public
                        const title = result.file?.name || 'document';
                        navigate(`/public/${token}/${encodeURIComponent(title)}`, { replace: true });
                        return;
                    } else if (linkAccessType !== 'public' && publicUrlPath) {
                        // Link is not public but accessed via /public - redirect to /share
                        const title = result.file?.name || 'document';
                        navigate(`/share/${token}/${encodeURIComponent(title)}`, { replace: true });
                        return;
                    }

                    // Skip strict check for blog routes as they are always considered public view
                    if (!isBlogUrl) {
                    }
                }

                // Determine content type based on file info
                if (result.file && result.file.type === 'file' && result.file.mimeType !== 'application/x-odocs') {
                    setContentType('file');
                } else {
                    setContentType('document');
                }
                setLoading(false);

            } catch (err: any) {
                // If password required, it's definitely not public (since public has no password)
                if (err.message === 'Share link password required or incorrect' || err.message?.includes('password')) {
                    if (publicUrlPath) {
                        setError('This link is not public. Please use the private share link.');
                        setLoading(false);
                        return;
                    }
                    setContentType('document'); // Allow viewer to handle password
                    setLoading(false);
                    return;
                }

                // Handle other errors (e.g. 404, Revoked)
                console.error('Share link error:', err);
                setError('Link not found or expired');
                setLoading(false);
            }
        };

        detectContentType();
    }, [token, location.pathname]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <div style={{ textAlign: 'center' }}>
                    <h2>Access Denied</h2>
                    <p>{error}</p>
                </div>
            </Box>
        );
    }

    if (contentType === 'file') {
        return <SharedFilePage />;
    }

    // Document sharing - use existing ViewerPage
    return <ViewerPage token={token} />;
};

export default SharePage;
