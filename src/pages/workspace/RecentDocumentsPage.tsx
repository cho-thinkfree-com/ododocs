import { Alert, Box, Breadcrumbs, CircularProgress, Container, Link, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRecentDocuments, type DocumentSummary } from '../../lib/api';
import { formatRelativeDate } from '../../lib/formatDate';
import HomeIcon from '@mui/icons-material/Home';
import ArticleIcon from '@mui/icons-material/Article';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useI18n } from '../../lib/i18n';
import SelectionToolbar from '../../components/workspace/SelectionToolbar';
import { useNavigate } from 'react-router-dom';

const RecentDocumentsPage = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<DocumentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    // Multi-select state
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const { strings } = useI18n();

    usePageTitle('최근 문서함');

    const formatBytes = (bytes?: number) => {
        if (bytes === undefined || bytes === null) return '-';
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
    };

    const handleRowClick = (itemId: string, event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('a, button, input')) {
            return;
        }

        if (event.shiftKey) {
            event.preventDefault();
        }

        const newSelected = new Set(selectedItems);

        if (event.shiftKey && lastSelectedId) {
            const allIds = documents.map(d => d.id);
            const lastIndex = allIds.indexOf(lastSelectedId);
            const currentIndex = allIds.indexOf(itemId);
            
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                
                for (let i = start; i <= end; i++) {
                    newSelected.add(allIds[i]);
                }
            }
        } else if (event.ctrlKey || event.metaKey) {
            if (newSelected.has(itemId)) {
                newSelected.delete(itemId);
            } else {
                newSelected.add(itemId);
            }
        } else {
            newSelected.clear();
            newSelected.add(itemId);
        }

        setSelectedItems(newSelected);
        setLastSelectedId(itemId);
    };

    const handleRowDoubleClick = (itemId: string) => {
        setSelectedItems(new Set());
        window.open(`/document/${itemId}`, '_blank');
    };

    const handleClearSelection = () => {
        setSelectedItems(new Set());
    };

    const handleStar = () => {
        console.log('Star functionality to be implemented');
    };

    const handlePublish = async () => {
        const selectedDocs = documents.filter(d => selectedItems.has(d.id));
        
        if (selectedDocs.length === 0) {
            return;
        }

        const links = selectedDocs.map(doc => {
            const url = `${window.location.origin}/document/${doc.id}`;
            return `[${doc.title}](${url})`;
        }).join('\n');

        try {
            await navigator.clipboard.writeText(links);
            setSnackbarMessage(`Copied ${selectedDocs.length} link(s) to clipboard`);
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Failed to copy to clipboard');
        }
    };

    const handleDelete = () => {
        // Delete is disabled for recent documents
    };

    useEffect(() => {
        if (isAuthenticated && workspaceId) {
            setLoading(true);
            getRecentDocuments(workspaceId)
                .then((docs) => {
                    setDocuments(docs);
                })
                .catch((err) => {
                    setError((err as Error).message);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [isAuthenticated, workspaceId]);

    const renderDocuments = () => {
        if (loading) return <CircularProgress />;
        if (error) return <Alert severity="error">{error}</Alert>;

        if (documents.length === 0) {
            return (
                <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed', bgcolor: 'transparent' }}>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        최근 수정된 문서가 없습니다.
                    </Typography>
                </Paper>
            );
        }

        return (
            <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell width="40%">{strings.workspace.nameColumn}</TableCell>
                            <TableCell width="15%">{strings.workspace.sizeColumn}</TableCell>
                            <TableCell width="20%">{strings.workspace.lastModifiedColumn}</TableCell>
                            <TableCell width="15%">{strings.workspace.modifiedByColumn}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {documents.map((doc) => (
                            <TableRow 
                                key={doc.id} 
                                hover
                                selected={selectedItems.has(doc.id)}
                                onClick={(e) => handleRowClick(doc.id, e)}
                                onDoubleClick={() => handleRowDoubleClick(doc.id)}
                                sx={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <ArticleIcon color="action" sx={{ mr: 1.5 }} />
                                        {doc.title}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">{formatBytes(doc.contentSize)}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">{formatRelativeDate(doc.updatedAt)}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip label={doc.lastModifiedBy || strings.workspace.ownerLabel} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ minHeight: 'calc(100vh - 64px)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
                    <Link component={RouterLink} underline="hover" color="inherit" to={`/workspace/${workspaceId}`} sx={{ display: 'flex', alignItems: 'center' }}>
                        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                        Files
                    </Link>
                    <Typography color="text.primary" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                        최근 문서함
                    </Typography>
                </Breadcrumbs>
            </Box>

            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                    최근 문서함
                </Typography>
                <SelectionToolbar
                    selectedCount={selectedItems.size}
                    hasDocuments={true}
                    onDelete={handleDelete}
                    onClearSelection={handleClearSelection}
                    onStar={handleStar}
                    onPublish={handlePublish}
                    showDelete={false}
                />
                {renderDocuments()}
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
            />
        </Container>
    );
};

export default RecentDocumentsPage;
