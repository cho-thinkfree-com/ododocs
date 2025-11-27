import {
    Box,
    Container,
    Typography,
    Avatar,
    Grid,
    Card,
    CardActionArea,
    Chip,
    useTheme,
    alpha,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import ArticleIcon from '@mui/icons-material/Article';
import type { BlogThemeProps } from '../types';

const ModernSimpleTheme = ({ profile, documents, onDocumentClick }: BlogThemeProps) => {
    const theme = useTheme();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Hero / Header Section */}
            <Box
                sx={{
                    bgcolor: 'background.paper',
                    pt: 12,
                    pb: 8,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative background elements */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 400,
                        height: 400,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                        zIndex: 0,
                    }}
                />

                <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <Avatar
                            src={profile.avatarUrl || undefined}
                            alt={profile.displayName || 'User'}
                            sx={{
                                width: 120,
                                height: 120,
                                mb: 3,
                                border: `4px solid ${theme.palette.background.paper}`,
                                boxShadow: theme.shadows[3],
                                fontSize: '3rem',
                                bgcolor: theme.palette.primary.main,
                            }}
                        >
                            {(profile.displayName || 'U').charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="h3" component="h1" fontWeight="800" gutterBottom>
                            {profile.displayName || 'Unknown User'}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: 600, mb: 2 }}>
                            Welcome to my digital garden. Here I share my thoughts, documents, and ideas.
                        </Typography>
                    </Box>
                </Container>
            </Box>

            {/* Content Section */}
            <Container maxWidth="md" sx={{ py: 8 }}>
                <Typography variant="h5" fontWeight="600" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArticleIcon color="primary" />
                    Published Documents
                </Typography>

                {documents.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Typography color="text.secondary">No public documents found.</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {documents.map((doc) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={doc.id}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: `1px solid ${theme.palette.divider}`,
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: theme.shadows[4],
                                            borderColor: theme.palette.primary.main,
                                        },
                                    }}
                                >
                                    <CardActionArea onClick={() => onDocumentClick(doc)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 3 }}>
                                        <Box sx={{ width: '100%', mb: 2 }}>
                                            <Chip
                                                label="Article"
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ borderRadius: 1, fontWeight: 600, fontSize: '0.7rem' }}
                                            />
                                        </Box>
                                        <Typography variant="h6" component="h2" fontWeight="700" gutterBottom sx={{ lineHeight: 1.3 }}>
                                            {doc.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {doc.summary || 'No summary available for this document.'}
                                        </Typography>
                                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="500">
                                                {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                                            </Typography>
                                        </Box>
                                    </CardActionArea>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>
        </Box>
    );
};

export default ModernSimpleTheme;
