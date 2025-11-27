import {
    Box,
    Container,
    Typography,
    Avatar,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider,
    Paper,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import type { BlogThemeProps } from '../types';

const ClassicTheme = ({ profile, documents, onDocumentClick }: BlogThemeProps) => {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
            <Container maxWidth="md">
                <Paper elevation={1} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
                    <Avatar
                        src={profile.avatarUrl || undefined}
                        alt={profile.displayName || 'User'}
                        sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
                    >
                        {(profile.displayName || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h4" gutterBottom>
                        {profile.displayName || 'Unknown User'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {profile.blogDescription || 'My Personal Blog'}
                    </Typography>
                </Paper>

                <Paper elevation={1}>
                    <List>
                        {documents.length === 0 ? (
                            <ListItem>
                                <ListItemText primary="No public documents found." />
                            </ListItem>
                        ) : (
                            documents.map((doc, index) => (
                                <Box key={doc.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton onClick={() => onDocumentClick(doc)} alignItems="flex-start">
                                            <ListItemText
                                                primary={
                                                    <Typography variant="h6" color="primary">
                                                        {doc.title}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <>
                                                        <Typography component="span" variant="body2" color="text.primary">
                                                            {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                                                        </Typography>
                                                        {" — "}
                                                        {doc.summary || 'No summary'}
                                                    </>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {index < documents.length - 1 && <Divider variant="inset" component="li" />}
                                </Box>
                            ))
                        )}
                    </List>
                </Paper>
            </Container>
        </Box>
    );
};

export default ClassicTheme;
