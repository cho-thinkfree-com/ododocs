import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    CircularProgress,
} from '@mui/material'
import RestoreIcon from '@mui/icons-material/Restore'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { useAuth } from '../../context/AuthContext'
import { listTrash, restoreDocument, permanentlyDeleteDocument } from '../../lib/api'

interface TrashDocument {
    id: string
    title: string
    deletedAt: string
    ownerMembershipId: string
    originalFolderId?: string | null
    contentSize: number
}

export default function TrashPage() {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const { tokens } = useAuth()
    const [documents, setDocuments] = useState<TrashDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadTrash = async () => {
        if (!workspaceId || !tokens?.accessToken) return

        try {
            setLoading(true)
            setError(null)
            const data = await listTrash(workspaceId, tokens.accessToken) as { documents: TrashDocument[] }
            setDocuments(data.documents || [])
        } catch (err) {
            setError('Failed to load trash')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTrash()
    }, [workspaceId, tokens?.accessToken])

    const handleRestore = async (documentId: string) => {
        if (!tokens?.accessToken) return

        try {
            await restoreDocument(documentId, tokens.accessToken)
            await loadTrash()
        } catch (err) {
            console.error('Failed to restore:', err)
        }
    }

    const handlePermanentDelete = async (documentId: string) => {
        if (!tokens?.accessToken) return
        if (!confirm('Are you sure you want to permanently delete this document? This cannot be undone.')) {
            return
        }

        try {
            await permanentlyDeleteDocument(documentId, tokens.accessToken)
            await loadTrash()
        } catch (err) {
            console.error('Failed to delete:', err)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString()
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    if (error) {
        return (
            <Box p={3}>
                <Typography color="error">{error}</Typography>
            </Box>
        )
    }

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                Trash
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Items in trash are permanently deleted after 7 days
            </Typography>

            {documents.length === 0 ? (
                <Box mt={4}>
                    <Typography color="text.secondary">Trash is empty</Typography>
                </Box>
            ) : (
                <TableContainer component={Paper} sx={{ mt: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Deleted</TableCell>
                                <TableCell>Size</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>{doc.title}</TableCell>
                                    <TableCell>{formatDate(doc.deletedAt)}</TableCell>
                                    <TableCell>{formatSize(doc.contentSize)}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Restore">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRestore(doc.id)}
                                                color="primary"
                                            >
                                                <RestoreIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Forever">
                                            <IconButton
                                                size="small"
                                                onClick={() => handlePermanentDelete(doc.id)}
                                                color="error"
                                            >
                                                <DeleteForeverIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    )
}
