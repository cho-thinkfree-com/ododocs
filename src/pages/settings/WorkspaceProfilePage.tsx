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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type Locale } from '../../lib/i18n';
import { getWorkspaceMemberProfile, updateWorkspaceMemberProfile, getWorkspace, checkBlogHandleAvailability } from '../../lib/api';
import { BLOG_THEMES } from '../../components/blog/themeRegistry';

const WorkspaceProfilePage = () => {
    const { user, isAuthenticated } = useAuth();
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const navigate = useNavigate();
    const { strings, locale, setLocale } = useI18n();

    // Workspace Profile State
    const [workspaceName, setWorkspaceName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [displayNameError, setDisplayNameError] = useState<string | null>(null);
    const [workspaceTimezone, setWorkspaceTimezone] = useState('UTC');
    const [workspaceLocale, setWorkspaceLocale] = useState('en-US');
    const [blogTheme, setBlogTheme] = useState('modern');
    const [blogHandle, setBlogHandle] = useState('');
    const [blogDescription, setBlogDescription] = useState('');
    const [initialBlogHandle, setInitialBlogHandle] = useState('');
    const [handleError, setHandleError] = useState<string | null>(null);
    const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
    const [membershipId, setMembershipId] = useState<string>('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (workspaceId && isAuthenticated) {
            setProfileLoading(true);
            Promise.all([
                getWorkspaceMemberProfile(workspaceId),
                getWorkspace(workspaceId)
            ])
                .then(([profile, workspace]) => {
                    setDisplayName(profile.displayName || '');
                    setWorkspaceTimezone(profile.timezone || 'UTC');
                    setWorkspaceLocale(profile.preferredLocale || 'en-US');
                    setBlogTheme(profile.blogTheme || 'modern');
                    setBlogHandle(profile.blogHandle || '');
                    setBlogDescription(profile.blogDescription || '');
                    setInitialBlogHandle(profile.blogHandle || '');
                    setMembershipId(profile.id);
                    setWorkspaceName(workspace.name);
                })
                .catch(err => {
                    console.error('Failed to load workspace profile', err);
                    setError(strings.settings.workspaceProfile.loadError);
                })
                .finally(() => setProfileLoading(false));
        }
    }, [workspaceId, isAuthenticated, locale, strings.settings.workspaceProfile.loadError]);

    const handleSave = async () => {
        if (!isAuthenticated || !workspaceId) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        setDisplayNameError(null);

        try {
            if (!displayName.trim()) {
                setDisplayNameError(strings.settings.workspaceProfile.displayNameRequired);
                setLoading(false);
                return;
            }
            await updateWorkspaceMemberProfile(workspaceId, {
                displayName: displayName.trim(),
                timezone: workspaceTimezone,
                preferredLocale: workspaceLocale,
                blogTheme,
                blogHandle: blogHandle.trim() || undefined,
                blogDescription: blogDescription.trim() || undefined
            });

            // Apply the new locale immediately after saving so the UI mirrors the selection
            setLocale(workspaceLocale as Locale);

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

    const subtitle = strings.settings.workspaceProfile.subtitle.replace('{workspaceName}', workspaceName)

    const languageOptions = strings.settings.languageOptions ?? {
        'en-US': 'English (English)',
        'ko-KR': '한국어 (한국어)',
        'ja-JP': '日本語 (日本語)',
    };
    const timezoneOptions = [
        'UTC',
        // Asia
        'Asia/Seoul',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Hong_Kong',
        'Asia/Taipei',
        'Asia/Singapore',
        'Asia/Bangkok',
        'Asia/Kolkata',
        'Asia/Dubai',
        'Asia/Kuala_Lumpur',
        'Asia/Jakarta',
        'Asia/Manila',
        // Europe
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Europe/Madrid',
        'Europe/Rome',
        'Europe/Amsterdam',
        'Europe/Stockholm',
        'Europe/Istanbul',
        'Europe/Moscow',
        'Europe/Warsaw',
        'Europe/Zurich',
        // Americas
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Toronto',
        'America/Vancouver',
        'America/Mexico_City',
        'America/Bogota',
        'America/Lima',
        'America/Sao_Paulo',
        'America/Argentina/Buenos_Aires',
        // Oceania
        'Australia/Sydney',
        'Australia/Melbourne',
        'Pacific/Auckland',
    ];
    const formatTzLabel = (tz: string) => {
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                timeZoneName: 'shortOffset',
            }).formatToParts(new Date());
            const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
            return `${tz} (${offset})`;
        } catch {
            return tz;
        }
    };
    const timezoneOptionsWithLabel = timezoneOptions
        .map((tz) => ({ value: tz, label: formatTzLabel(tz) }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return (
        <Container maxWidth="md">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="h4" fontWeight="bold">
                    {strings.settings.workspaceProfile.title.replace('{workspaceName}', workspaceName)}
                </Typography>
                {workspaceId && (
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(`/workspace/${workspaceId}`)}
                    >
                        {strings.workspace.backToFiles}
                    </Button>
                )}
            </Box>
            {subtitle.trim() && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {subtitle}
                </Typography>
            )}

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            <Alert severity="info" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2">
                    {strings.settings.workspaceProfile.workspaceSpecific}{' '}
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => navigate('/settings')}
                        sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {strings.settings.workspaceProfile.globalAccountSettings}
                    </Link>
                </Typography>
            </Alert>

            <Paper sx={{ p: 3, mb: 3 }}>
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
                            onChange={(e) => { setDisplayName(e.target.value); setDisplayNameError(null); }}
                            helperText={displayNameError ?? strings.settings.workspaceProfile.displayNameHelper}
                            error={Boolean(displayNameError)}
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
                                <option value="en-US">{languageOptions['en-US']}</option>
                                <option value="ko-KR">{languageOptions['ko-KR']}</option>
                                <option value="ja-JP">{languageOptions['ja-JP']}</option>
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
                                {timezoneOptionsWithLabel.map((tz) => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Blog Settings</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Customize your public blog appearance and URL.
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Note:</strong> Only documents with "Public" visibility will appear on your blog.
                    </Typography>
                    {blogHandle ? (
                        <Typography variant="body2">
                            Your blog URL: <Link href={`/blog/${blogHandle}`} target="_blank" rel="noopener" sx={{ fontWeight: 'bold' }}>
                                {window.location.origin}/blog/{blogHandle}
                            </Link>
                        </Typography>
                    ) : (
                        <Typography variant="body2">
                            Without a blog handle, your blog will be accessible at: <code>{window.location.origin}/blog/{workspaceId}/{membershipId}</code>
                        </Typography>
                    )}
                </Alert>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label="Blog Handle"
                            value={blogHandle}
                            onChange={(e) => {
                                const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                setBlogHandle(value);
                                setHandleError(null);
                                setHandleAvailable(null);
                            }}
                            onBlur={async () => {
                                if (!blogHandle || blogHandle.length < 4) return;
                                if (blogHandle === initialBlogHandle) {
                                    setHandleAvailable(null);
                                    setHandleError(null);
                                    return;
                                }
                                try {
                                    const { available } = await checkBlogHandleAvailability(blogHandle);
                                    if (available) {
                                        setHandleAvailable(true);
                                        setHandleError(null);
                                    } else {
                                        setHandleAvailable(false);
                                        setHandleError('This handle is already taken or reserved.');
                                    }
                                } catch (err) {
                                    console.error('Failed to check handle availability', err);
                                }
                            }}
                            error={Boolean(handleError)}
                            helperText={
                                handleError ||
                                (handleAvailable ? (
                                    <Typography component="span" variant="caption" color="success.main">
                                        Handle is available! Don't forget to save changes.
                                    </Typography>
                                ) : (
                                    "Unique URL for your blog (e.g., my-blog). 4-32 characters, alphanumeric and hyphens only."
                                ))
                            }
                            inputProps={{ minLength: 4, maxLength: 32 }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel shrink>Blog Theme</InputLabel>
                            <Select
                                native
                                value={blogTheme}
                                label="Blog Theme"
                                onChange={(e) => setBlogTheme(e.target.value)}
                            >
                                {BLOG_THEMES.map((theme) => (
                                    <option key={theme.id} value={theme.id}>
                                        {theme.name}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            fullWidth
                            label="Blog Description"
                            multiline
                            rows={3}
                            value={blogDescription}
                            onChange={(e) => setBlogDescription(e.target.value)}
                            inputProps={{ maxLength: 500 }}
                            helperText={`${blogDescription.length}/500 characters`}
                        />
                    </Grid>
                </Grid>
            </Paper>

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
        </Container>
    );
};

export default WorkspaceProfilePage;
