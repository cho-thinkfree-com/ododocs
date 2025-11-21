import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    Paper,
    Grid,
    Link
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../lib/i18n';
import { getWorkspaceMemberProfile, updateWorkspaceMemberProfile, getWorkspace } from '../../lib/api';

const WorkspaceProfilePage = () => {
    const { user, tokens } = useAuth();
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const navigate = useNavigate();
    const { strings, locale } = useI18n();

    // Workspace Profile State
    const [workspaceName, setWorkspaceName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [workspaceTimezone, setWorkspaceTimezone] = useState('UTC');
    const [workspaceLocale, setWorkspaceLocale] = useState('en-US');

    // UI State
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (workspaceId && tokens) {
            setProfileLoading(true);
            Promise.all([
                getWorkspaceMemberProfile(workspaceId, tokens.accessToken),
                getWorkspace(workspaceId, tokens.accessToken)
            ])
                .then(([profile, workspace]) => {
                    setDisplayName(profile.displayName || '');
                    setWorkspaceTimezone(profile.timezone || 'UTC');
                    setWorkspaceLocale(profile.preferredLocale || 'en-US');
                    setWorkspaceName(workspace.name);
                })
                .catch(err => {
                    console.error('Failed to load workspace profile', err);
                    setError(strings.settings.workspaceProfile.loadError);
                })
                .finally(() => setProfileLoading(false));
        }
    }, [workspaceId, tokens, locale, strings.settings.workspaceProfile.loadError]);

    const handleSave = async () => {
        if (!tokens || !workspaceId) return;
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await updateWorkspaceMemberProfile(workspaceId, tokens.accessToken, {
                displayName,
                timezone: workspaceTimezone,
                preferredLocale: workspaceLocale
            });

            setSuccess(strings.settings.workspaceProfile.updateSuccess);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (profileLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                {strings.settings.workspaceProfile.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {strings.settings.workspaceProfile.subtitle.replace('{workspaceName}', workspaceName)}
            </Typography>

            <Paper sx={{ p: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                <Alert severity="info" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                    <Box>
                        <strong>{strings.settings.workspaceProfile.workspaceSpecific}</strong>
                        <br />
                        {strings.settings.workspaceProfile.workspaceSpecificDesc.replace('{workspaceName}', workspaceName)}
                        <br />
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <InfoOutlinedIcon fontSize="small" />
                            <Typography variant="body2">
                                {strings.settings.workspaceProfile.emailPasswordHint}{' '}
                                <Link
                                    component="button"
                                    variant="body2"
                                    onClick={() => navigate('/settings')}
                                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    {strings.settings.workspaceProfile.globalAccountSettings}
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </Alert>

                <Typography variant="h6" gutterBottom>{strings.settings.workspaceProfile.profileInfo}</Typography>

                <Grid container spacing={3}>
                    <Grid size={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar
                                sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}
                            >
                                {displayName ? displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </Avatar>
                            <Button variant="outlined" size="small">
                                {strings.settings.workspaceProfile.changeAvatar}
                            </Button>
                        </Box>
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            label={strings.settings.workspaceProfile.displayName}
                            fullWidth
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            helperText={strings.settings.workspaceProfile.displayNameHelper}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel shrink>{strings.settings.workspaceProfile.language}</InputLabel>
                            <Select
                                native
                                value={workspaceLocale}
                                label={strings.settings.workspaceProfile.language}
                                onChange={(e) => setWorkspaceLocale(e.target.value)}
                            >
                                <option value="en-US">English</option>
                                <option value="ko-KR">Korean</option>
                                <option value="ja-JP">Japanese</option>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel shrink>{strings.settings.global.timezone}</InputLabel>
                            <Select
                                native
                                value={workspaceTimezone}
                                label={strings.settings.global.timezone}
                                onChange={(e) => setWorkspaceTimezone(e.target.value)}
                            >
                                <option value="UTC">UTC</option>
                                <option value="Asia/Seoul">Seoul</option>
                                <option value="America/New_York">New York</option>
                                <option value="Europe/London">London</option>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : strings.settings.workspaceProfile.saveProfile}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default WorkspaceProfilePage;
