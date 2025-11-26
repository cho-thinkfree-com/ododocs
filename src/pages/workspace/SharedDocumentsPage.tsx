import { Alert, Box, Breadcrumbs, CircularProgress, Container, Link, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Snackbar, TableSortLabel } from '@mui/material';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPublicDocuments, type DocumentSummary, toggleDocumentStarred } from '../../lib/api';
import { formatRelativeDate } from '../../lib/formatDate';
import HomeIcon from '@mui/icons-material/Home';
import ArticleIcon from '@mui/icons-material/Article';
import StarIcon from '@mui/icons-material/Star';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useI18n } from '../../lib/i18n';
import SelectionToolbar from '../../components/workspace/SelectionToolbar';
import PublicDocumentIndicator from '../../components/workspace/PublicDocumentIndicator';

const SharedDocumentsPage = () => {
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

    // Sorting state
    const [orderBy, setOrderBy] = useState<string>('createdAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const { strings } = useI18n();

    usePageTitle('공유 문서함');

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

    const fetchDocuments = useCallback(async () => {
        if (!isAuthenticated || !workspaceId) return;
        setLoading(true);
        setError(null);
        try {
            const docs = await getPublicDocuments(workspaceId, { sortBy: orderBy, sortOrder: order });
            setDocuments(docs);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, workspaceId, orderBy, order]);

    const handleStar = async () => {
        if (!isAuthenticated) return;

        const itemsToStar = Array.from(selectedItems);

        // Check if all selected items are already starred
        let allStarred = true;
        for (const itemId of itemsToStar) {
            const doc = documents.find(d => d.id === itemId);
            if (doc && !doc.isImportant) {
                allStarred = false;
                break;
            }
        }

        const newImportantStatus = !allStarred;

        try {
            await Promise.all(itemsToStar.map(async (itemId) => {
                await toggleDocumentStarred(itemId, newImportantStatus);
            }));

            fetchDocuments();
            setSnackbarMessage(newImportantStatus ? 'Added to Starred' : 'Removed from Starred');
            const handleSelectAll = () => {
                if (selectedItems.size === documents.length && documents.length > 0) {
                    setSelectedItems(new Set());
                    autoHideDuration = { 3000}
                    onClose = {() => setSnackbarOpen(false)}
message = { snackbarMessage }
    />
                </Container >
            );
        };

export default SharedDocumentsPage;
