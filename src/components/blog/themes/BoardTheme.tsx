import {
    Box,
    Container,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Link,
} from '@mui/material';
import { format } from 'date-fns';
import type { BlogThemeProps } from '../types';

const BoardTheme = ({ profile, documents, onDocumentClick }: BlogThemeProps) => {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff', py: 4 }}>
            <Container maxWidth="lg">
                {/* Header Section */}
                <Box sx={{ mb: 4, borderBottom: '2px solid #29364d', pb: 2, display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <Typography variant="h4" component="h1" sx={{ color: '#29364d', fontWeight: 'bold' }}>
                        {profile.displayName || 'Gallery'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {profile.blogDescription || 'Community Board'}
                    </Typography>
                </Box>

                {/* Board Table */}
                <TableContainer component={Paper} elevation={0} sx={{ borderTop: '1px solid #ccc', borderRadius: 0 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="board table">
                        <TableHead sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #ccc' }}>
                            <TableRow>
                                <TableCell sx={{ width: 60, textAlign: 'center', fontWeight: 'bold', color: '#333' }}>No.</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#333' }}>Title</TableCell>
                                <TableCell sx={{ width: 120, textAlign: 'center', fontWeight: 'bold', color: '#333' }}>Author</TableCell>
                                <TableCell sx={{ width: 100, textAlign: 'center', fontWeight: 'bold', color: '#333' }}>Date</TableCell>
                                <TableCell sx={{ width: 80, textAlign: 'center', fontWeight: 'bold', color: '#333' }}>Views</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                                        There are no posts yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc, index) => (
                                    <TableRow
                                        key={doc.id}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: '#f9f9f9' },
                                            borderBottom: '1px solid #eee'
                                        }}
                                        onClick={() => onDocumentClick(doc)}
                                    >
                                        <TableCell align="center" sx={{ color: '#666', fontSize: '0.9rem' }}>
                                            {documents.length - index}
                                        </TableCell>
                                        <TableCell component="th" scope="row" sx={{ fontSize: '0.95rem' }}>
                                            <Link
                                                component="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDocumentClick(doc);
                                                }}
                                                underline="hover"
                                                sx={{ color: '#333', textAlign: 'left' }}
                                            >
                                                {doc.title}
                                            </Link>
                                            {/* New badge logic could go here */}
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: '#666', fontSize: '0.9rem' }}>
                                            {profile.displayName}
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: '#666', fontSize: '0.85rem' }}>
                                            {format(new Date(doc.updatedAt), 'MM.dd')}
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: '#666', fontSize: '0.85rem' }}>
                                            {doc.viewCount || 0}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Footer / Pagination area (handled by parent, but we can add visual spacing) */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    {/* Write button placeholder if we were logged in as owner */}
                </Box>
            </Container>
        </Box>
    );
};

export default BoardTheme;
