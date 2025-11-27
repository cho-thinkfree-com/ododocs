import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Skeleton,
    Grid,
} from '@mui/material';
import {
    getWorkspaceMemberPublicProfile,
    getWorkspaceMemberPublicDocuments,
    getBlogByHandle,
    type MembershipSummary,
    type DocumentSummary,
} from '../../lib/api';
import { getThemeById, DEFAULT_THEME_ID } from '../../components/blog/themeRegistry';
import ThemeSelector from '../../components/blog/ThemeSelector';

const BlogLandingPage = () => {
    const { workspaceId, profileId, handle } = useParams<{ workspaceId: string; profileId: string; handle: string }>();
    const [profile, setProfile] = useState<MembershipSummary | null>(null);
    const [documents, setDocuments] = useState<DocumentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeThemeId, setActiveThemeId] = useState<string>(DEFAULT_THEME_ID);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                let profileData: MembershipSummary;
                let docsData: DocumentSummary[];

                if (handle) {
                    const data = await getBlogByHandle(handle);
                    profileData = data.profile;
                    docsData = data.documents;
                } else if (workspaceId && profileId) {
                    // Legacy route support
                    const [pData, dData] = await Promise.all([
                        getWorkspaceMemberPublicProfile(workspaceId, profileId),
                        getWorkspaceMemberPublicDocuments(workspaceId, profileId)
                    ]);
                    profileData = pData;
                    docsData = dData.items;
                } else {
                    throw new Error('Invalid blog URL');
                }

                setProfile(profileData);
                setDocuments(docsData);
                if (profileData.blogTheme) {
                    setActiveThemeId(profileData.blogTheme);
                }
            } catch (err) {
                console.error('Failed to load blog data', err);
                setError('Failed to load blog. The user may not exist or has no public profile.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [workspaceId, profileId, handle]);

    const handleDocumentClick = (doc: DocumentSummary) => {
        console.log('Navigate to document:', doc.id);
        // TODO: Implement navigation to public viewer
        // For now, we can redirect to the public viewer URL if we have a share token,
        // but the document summary might not have it.
        // If it's a public document, we might need a different route or way to access it.
        // Assuming public documents are accessible via /public/:token, but we need the token.
        // If the document is public, it should be accessible.
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 8 }}>
                <Container maxWidth="md">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 8 }}>
                        <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
                        <Skeleton variant="text" width={200} height={40} />
                        <Skeleton variant="text" width={300} height={20} />
                    </Box>
                    <Grid container spacing={3}>
                        {[1, 2, 3, 4].map((i) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={i}>
                                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
        );
    }

    if (error || !profile) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="error">{error || 'Profile not found'}</Typography>
            </Box>
        );
    }

    const ActiveThemeComponent = getThemeById(activeThemeId).component;

    return (
        <>
            <ActiveThemeComponent
                profile={profile}
                documents={documents}
                onDocumentClick={handleDocumentClick}
            />
            <ThemeSelector
                currentThemeId={activeThemeId}
                onThemeChange={setActiveThemeId}
            />
        </>
    );
};

export default BlogLandingPage;
