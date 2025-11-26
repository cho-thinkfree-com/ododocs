import { Alert, Box, Breadcrumbs, CircularProgress, Container, Link, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Snackbar, TableSortLabel, IconButton } from '@mui/material';
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStarredDocuments, type DocumentSummary, type FolderSummary, toggleDocumentStarred, toggleFolderStarred } from '../../lib/api';
import { formatRelativeDate } from '../../lib/formatDate';
import HomeIcon from '@mui/icons-material/Home';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import StarIcon from '@mui/icons-material/Star';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useI18n } from '../../lib/i18n';
import SelectionToolbar from '../../components/workspace/SelectionToolbar';

const ImportantDocumentsPage = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<DocumentSummary[]>([]);
    const [folders, setFolders] = useState<FolderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    // Multi-select state
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Sorting state
    const [orderBy, setOrderBy] = useState<string>('name');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');

    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const { strings } = useI18n();

    usePageTitle('중요 문서함');

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
            const allItems = [...folders, ...documents];
            const allIds = allItems.map(i => i.id);
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

    const handleRowDoubleClick = (itemId: string, type: 'document' | 'folder') => {
        setSelectedItems(new Set());
        if (type === 'document') {
            window.open(`/document/${itemId}`, '_blank');
        } else {
            navigate(`/workspace/${workspaceId}?folderId=${itemId}`);
        }
    };

    const handleToggleImportant = async (itemId: string, type: 'document' | 'folder', event: React.MouseEvent) => {
        event.stopPropagation();
        if (!isAuthenticated || !workspaceId) return;

        try {
            if (type === 'document') {
                await toggleDocumentStarred(itemId, false); // Always unstar in this view
            } else {
                await toggleFolderStarred(itemId, false); // Always unstar in this view
            }
            fetchContents();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleStar = async () => {
        if (!isAuthenticated || !workspaceId) return;

        const itemsToUnstar = Array.from(selectedItems);

        try {
            await Promise.all(itemsToUnstar.map(async (itemId) => {
                const isDocument = documents.some(d => d.id === itemId);
                if (isDocument) {
                    await toggleDocumentStarred(itemId, false);
                } else {
                    await toggleFolderStarred(itemId, false);
                }
            }));

            fetchContents();
            setSnackbarMessage('Removed from Starred');
            setSnackbarOpen(true);
            setSelectedItems(new Set());
        } catch (err) {
            setError((err as Error).message);
        }
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

    const handleSelectAll = () => {
        const totalItems = folders.length + documents.length;
        if (selectedItems.size === totalItems && totalItems > 0) {
            setSelectedItems(new Set());
        } else {
            const newSelecteds = new Set([...folders.map(f => f.id), ...documents.map(d => d.id)]);
            setSelectedItems(newSelecteds);
        }
    };

    const sortedItems = useMemo(() => {
        type Item = (FolderSummary & { type: 'folder' }) | (DocumentSummary & { type: 'document' });

        const foldersWithType: Item[] = folders.map(f => ({ ...f, type: 'folder' as const }));
        const documentsWithType: Item[] = documents.map(d => ({ ...d, type: 'document' as const }));

        // Always keep folders first, then documents
        // Sort each group independently based on the current sort criteria
        if (orderBy === 'size') {
            // For size sorting, sort folders and documents separately
            const sortedFolders = [...foldersWithType].sort((a, b) => {
                // Folders don't have size, so always sort by name (A-Z)
                const aName = (a as FolderSummary).name.toLowerCase();
                const bName = (b as FolderSummary).name.toLowerCase();
                return aName.localeCompare(bName);
            });
            const sortedDocuments = [...documentsWithType].sort((a, b) => {
                const aSize = (a as DocumentSummary).contentSize || 0;
                const bSize = (b as DocumentSummary).contentSize || 0;
                return order === 'asc' ? aSize - bSize : bSize - aSize;
            });
            return [...sortedFolders, ...sortedDocuments];
        } else if (orderBy === 'name') {
            // For name sorting, sort folders and documents separately
            const sortedFolders = [...foldersWithType].sort((a, b) => {
                const aName = (a as FolderSummary).name.toLowerCase();
                const bName = (b as FolderSummary).name.toLowerCase();
                return order === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
            });
            const sortedDocuments = [...documentsWithType].sort((a, b) => {
                const aName = (a as DocumentSummary).title.toLowerCase();
                const bName = (b as DocumentSummary).title.toLowerCase();
                return order === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
            });
            return [...sortedFolders, ...sortedDocuments];
        } else if (orderBy === 'updatedAt') {
            // For date sorting, sort folders and documents separately
            const sortedFolders = [...foldersWithType].sort((a, b) => {
                const aDate = new Date(a.updatedAt).getTime();
                const bDate = new Date(b.updatedAt).getTime();
                return order === 'asc' ? aDate - bDate : bDate - aDate;
            });
            const sortedDocuments = [...documentsWithType].sort((a, b) => {
                const aDate = new Date(a.updatedAt).getTime();
                const bDate = new Date(b.updatedAt).getTime();
                return order === 'asc' ? aDate - bDate : bDate - aDate;
            });
            return [...sortedFolders, ...sortedDocuments];
        }

        // Default: just combine folders first, then documents
        return [...foldersWithType, ...documentsWithType];
    }, [folders, documents, orderBy, order]);

    const fetchContents = () => {
        if (isAuthenticated && workspaceId) {
            setLoading(true);
            getStarredDocuments(workspaceId)
                .then((data) => {
                    setDocuments(data.documents);
                    setFolders(data.folders);
                })
                .catch((err) => {
                    setError((err as Error).message);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    };

    useEffect(() => {
        fetchContents();
    }, [isAuthenticated, workspaceId]);

    const renderContents = () => {
        if (loading) return <CircularProgress />;
        if (error) return <Alert severity="error">{error}</Alert>;

        if (folders.length === 0 && documents.length === 0) {
            return (
                <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed', bgcolor: 'transparent' }}>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        중요 문서함이 비어있습니다.
                    </Typography>
                </Paper>
            );
        }

        return (
            <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell width="40%">
                                <TableSortLabel
                                    active={orderBy === 'name'}
                                    direction={orderBy === 'name' ? order : 'asc'}
                                    onClick={() => handleRequestSort('name')}
                                >
                                    {strings.workspace.nameColumn}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell width="15%">
                                <TableSortLabel
                                    active={orderBy === 'size'}
                                    direction={orderBy === 'size' ? order : 'asc'}
                                    onClick={() => handleRequestSort('size')}
                                >
                                    {strings.workspace.sizeColumn}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell width="20%">
                                <TableSortLabel
                                    active={orderBy === 'updatedAt'}
                                    direction={orderBy === 'updatedAt' ? order : 'asc'}
                                    onClick={() => handleRequestSort('updatedAt')}
                                >
                                    {strings.workspace.lastModifiedColumn}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell width="15%">{strings.workspace.modifiedByColumn}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedItems.map((item) => {
                            const isFolder = item.type === 'folder';
                            const itemId = item.id;
                            const itemName = isFolder ? (item as FolderSummary).name : (item as DocumentSummary).title;

                            return (
                                <TableRow
                                    key={itemId}
                                    hover
                                    selected={selectedItems.has(itemId)}
                                    onClick={(e) => handleRowClick(itemId, e)}
                                    onDoubleClick={() => handleRowDoubleClick(itemId, item.type)}
                                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {isFolder ? (
                                                <FolderIcon color="action" sx={{ mr: 1.5 }} />
                                            ) : (
                                                <ArticleIcon color="action" sx={{ mr: 1.5 }} />
                                            )}
                                            {itemName}
                                            <StarIcon
                                                sx={{
                                                    ml: 1,
                                                    fontSize: '1rem',
                                                    color: 'warning.main',
                                                    opacity: 0.6
                                                }}
                                            />
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {isFolder ? (
                                            <Typography variant="body2" color="text.secondary">-</Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {formatBytes((item as DocumentSummary).contentSize)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {formatRelativeDate(item.updatedAt)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {isFolder ? (
                                            '-'
                                        ) : (
                                            <Chip
                                                label={(item as DocumentSummary).lastModifiedBy || strings.workspace.ownerLabel}
                                                size="small"
                                                variant="outlined"
                                                sx={{ borderRadius: 1 }}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Container maxWidth="xl">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
                    <Link component={RouterLink} underline="hover" color="inherit" to={`/workspace/${workspaceId}`} sx={{ display: 'flex', alignItems: 'center' }}>
                        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                        Files
                    </Link>
                    <Typography color="text.primary" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                        중요 문서함
                    </Typography>
                </Breadcrumbs>
            </Box>

            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                    중요 문서함
                </Typography>
                <Box sx={{ height: 60, display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SelectionToolbar
                        selectedCount={selectedItems.size}
                        hasDocuments={true}
                        onDelete={() => { }} // Delete disabled in this view for now, or could implement unstar
                        onClearSelection={() => setSelectedItems(new Set())}
                        onStar={handleStar}
                        onPublish={handlePublish}
                        onSelectAll={handleSelectAll}
                        showDelete={false}
                    />
                </Box>
                {renderContents()}
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

export default ImportantDocumentsPage;
