import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import SharedFilePage from './SharedFilePage';
import ViewerPage from '../editor/ViewerPage';
import { resolveShareLink } from '../../lib/api';

/**
 * Universal share page that detects whether the token is for a Document or File
 * and renders the appropriate component.
 * 
 * Also handles isPublic distinction:
 * - isPublic=true: Searchable by search engines (open graph, etc)
 * - isPublic=false: Link-only, not searchable
 */
const SharePage = ({ token: propToken }: { token?: string }) => {
    const params = useParams<{ token: string }>();
    const token = propToken || params.token;
    const location = useLocation();
    const [contentType, setContentType] = useState<'document' | 'file' | null>(null);
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const detectContentType = async () => {
            if (!token) return;

            const isPublicUrl = location.pathname.startsWith('/public');
            const isBlogUrl = location.pathname.startsWith('/blog');

            try {
                // Use resolveShareLink for everything as it returns both file and shareLink info
                const result = await resolveShareLink(token);

                if (result.shareLink) {
                    const linkIsPublic = result.shareLink.isPublic;

                    // Skip strict check for blog routes as they are always considered public view
                    if (!isBlogUrl) {
                        if (isPublicUrl && !linkIsPublic) {
                            setError('This link is not public. Please use the private share link.');
                            setLoading(false);
                            return;
                        }
                        if (!isPublicUrl && linkIsPublic) {
                            setError('This link is public. Please use the public link.');
                            setLoading(false);
                            return;
                        }
                    }

                    setIsPublic(linkIsPublic);
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
                    if (isPublicUrl) {
                        setError('This link is not public. Please use the private share link.');
                        setLoading(false);
                        return;
                    }
                    setIsPublic(false);
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
    // Pass isPublic flag (though ViewerPage might determine it independently)
    return <ViewerPage isPublic={isPublic} token={token} />;
};

export default SharePage;
