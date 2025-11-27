import { Box, CircularProgress, Link, List, ListItem, ListItemText, Popover, Typography } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import { useEffect, useState } from 'react';
import { getAuthorPublicDocuments, type AuthorDocument } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

interface AuthorInfoPopoverProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    token: string;
    authorName?: string;
    documentUpdatedAt: string;
}

const AuthorInfoPopover = ({ open, anchorEl, onClose, token, authorName, documentUpdatedAt }: AuthorInfoPopoverProps) => {
    const [documents, setDocuments] = useState<AuthorDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { strings } = useI18n();

    useEffect(() => {
        if (open && documents.length === 0) {
            fetchDocuments();
        }
    }, [open]);

    const fetchDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getAuthorPublicDocuments(token);
            setDocuments(result.documents);
        } catch (err: any) {
            console.error('Failed to fetch author documents:', err);
            setError(err.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const publicDocuments = documents.filter(doc => !doc.shareLink || !doc.shareLink.id);
    const currentDocument = documents.find(doc => doc.isCurrentDocument);

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            sx={{
                '& .MuiPopover-paper': {
                    width: 360,
                    maxHeight: 500,
                },
            }}
        >
            <Box sx={{ p: 2 }}>
                {/* Author Header */}
                <Box sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon />
                        {authorName || strings.editor?.author?.title || '작성자'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        마지막 업데이트: {formatDate(documentUpdatedAt)}
                    </Typography>
                </Box>

                {/* Loading State */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                {/* Error State */}
                {error && (
                    <Typography color="error" variant="body2" sx={{ py: 2 }}>
                        {error}
                    </Typography>
                )}

                {/* Documents List */}
                {!loading && !error && (
                    <>
                        {/* Current Document */}
                        {currentDocument && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LinkIcon fontSize="small" />
                                    {strings.editor?.author?.currentDocument || '현재 문서'}
                                </Typography>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        bgcolor: 'action.selected',
                                        borderRadius: 1,
                                        border: 1,
                                        borderColor: 'primary.main',
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={600}>
                                        {currentDocument.document.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {strings.editor?.author?.linkShared || '링크를 통해 공유됨'}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {/* Public Documents */}
                        {publicDocuments.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PublicIcon fontSize="small" />
                                    {strings.editor?.author?.publicDocuments || '공개 문서'} ({publicDocuments.length})
                                </Typography>
                                <List dense disablePadding>
                                    {publicDocuments.slice(0, 5).map((doc) => (
                                        <ListItem
                                            key={doc.document.id}
                                            disablePadding
                                            sx={{
                                                mb: 0.5,
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                },
                                            }}
                                        >
                                            <Link
                                                href={doc.shareLink.isPublic
                                                    ? `/public/${doc.shareLink.token}/${encodeURIComponent(doc.document.title.substring(0, 30))}`
                                                    : `/share/${doc.shareLink.token}/${encodeURIComponent(doc.document.title.substring(0, 30))}`
                                                }
                                                underline="none"
                                                color="inherit"
                                                sx={{
                                                    width: '100%',
                                                    p: 1,
                                                    borderRadius: 1,
                                                    display: 'block',
                                                }}
                                            >
                                                <ListItemText
                                                    primary={doc.document.title}
                                                    primaryTypographyProps={{
                                                        variant: 'body2',
                                                        noWrap: true,
                                                    }}
                                                    secondary={formatDate(doc.document.createdAt)}
                                                    secondaryTypographyProps={{
                                                        variant: 'caption',
                                                    }}
                                                />
                                            </Link>
                                        </ListItem>
                                    ))}
                                </List>
                                {publicDocuments.length > 5 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                        +{publicDocuments.length - 5} more documents
                                    </Typography>
                                )}
                            </Box>
                        )}

                        {/* No Public Documents */}
                        {publicDocuments.length === 0 && !currentDocument && (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                {strings.editor?.author?.noPublicDocuments || '공개 문서가 없습니다'}
                            </Typography>
                        )}
                    </>
                )}
            </Box>
        </Popover>
    );
};

export default AuthorInfoPopover;
