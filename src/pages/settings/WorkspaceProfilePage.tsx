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
    Link,
    Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type Locale } from '../../lib/i18n';
import { isReservedHandle } from '../../lib/reservedHandles';
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


    // Initial State for Change Detection
    const [initialDisplayName, setInitialDisplayName] = useState('');
    const [initialTimezone, setInitialTimezone] = useState('UTC');
    const [initialLocale, setInitialLocale] = useState('en-US');
    const [initialBlogTheme, setInitialBlogTheme] = useState('modern');
    const [initialBlogHandle, setInitialBlogHandle] = useState('');
    const [initialBlogDescription, setInitialBlogDescription] = useState('');

    const [handleError, setHandleError] = useState<string | null>(null);
    const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
    const [handleChecking, setHandleChecking] = useState(false);
    const [membershipId, setMembershipId] = useState<string>('');


    // UI State
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

    const [blogLoading, setBlogLoading] = useState(false);
    const [blogError, setBlogError] = useState<string | null>(null);
    const [blogSuccess, setBlogSuccess] = useState<string | null>(null);

    const [initialLoading, setInitialLoading] = useState(false);

    // Debounced blog handle validation
    useEffect(() => {
        const checkHandle = async () => {
            if (!blogHandle || blogHandle.length < 4) {
                setHandleChecking(false);
                setHandleAvailable(null);
                setHandleError(null);
                return;
            }

            if (blogHandle === initialBlogHandle) {
                setHandleChecking(false);
                setHandleAvailable(null);
                setHandleError(null);
                return;
            }

            // Check reserved words locally first
            if (isReservedHandle(blogHandle)) {
                setHandleAvailable(false);
                setHandleError('This handle is reserved and cannot be used');
                setHandleChecking(false);
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
                setHandleError('Failed to check availability');
            } finally {
                setHandleChecking(false);
            }
        };

        // Show checking state immediately when handle changes (and is different from initial)
        if (blogHandle && blogHandle.length >= 4 && blogHandle !== initialBlogHandle) {
            setHandleChecking(true);
            setHandleAvailable(null);
            setHandleError(null);
        }

        const timeoutId = setTimeout(checkHandle, 2000);
        return () => clearTimeout(timeoutId);
    }, [blogHandle, initialBlogHandle]);

    useEffect(() => {
        if (workspaceId && isAuthenticated) {
            setInitialLoading(true);
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

                    // Set initial values for change detection
                    setInitialDisplayName(profile.displayName || '');
                    setInitialTimezone(profile.timezone || 'UTC');
                    setInitialLocale(profile.preferredLocale || 'en-US');
                    setInitialBlogTheme(profile.blogTheme || 'modern');
                    setInitialBlogDescription(profile.blogDescription || '');
                    setWorkspaceName(workspace.name);
                })
                .catch(err => {
                    console.error('Failed to load workspace profile', err);
                    setProfileError(strings.settings.workspaceProfile.loadError);
                })
                .finally(() => setInitialLoading(false));
        }
    }, [workspaceId, isAuthenticated, locale, strings.settings.workspaceProfile.loadError]);

    const handleSaveProfile = async () => {
        if (!isAuthenticated || !workspaceId) return;
        setProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(null);
        setDisplayNameError(null);

        try {
            if (!displayName.trim()) {
                setDisplayNameError(strings.settings.workspaceProfile.displayNameRequired);
                setProfileLoading(false);
                return;
            }
            await updateWorkspaceMemberProfile(workspaceId, {
                displayName: displayName.trim(),
                timezone: workspaceTimezone,
                preferredLocale: workspaceLocale,
            });

            // Apply the new locale immediately after saving so the UI mirrors the selection
            setLocale(workspaceLocale as Locale);

            setProfileSuccess('Profile settings saved successfully');

            // Update initial values
            setInitialDisplayName(displayName.trim());
            setInitialTimezone(workspaceTimezone);
            setInitialLocale(workspaceLocale);
        } catch (err) {
            setProfileError((err as Error).message);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleSaveBlog = async () => {
        if (!isAuthenticated || !workspaceId) return;
        setBlogLoading(true);
        setBlogError(null);
        setBlogSuccess(null);

        try {
            // Validate blog handle if provided
            if (blogHandle.trim()) {
                const trimmedHandle = blogHandle.trim();

                // Check length
                if (trimmedHandle.length < 4 || trimmedHandle.length > 32) {
                    setBlogError('Blog handle must be between 4 and 32 characters');
                    setBlogLoading(false);
                    return;
                }

                // Check format (only lowercase letters, numbers, and hyphens)
                if (!/^[a-z0-9-]+$/.test(trimmedHandle)) {
                    setBlogError('Blog handle can only contain lowercase letters, numbers, and hyphens');
                    setBlogLoading(false);
                    return;
                }

                // Check if it starts or ends with hyphen
                if (trimmedHandle.startsWith('-') || trimmedHandle.endsWith('-')) {
                    setBlogError('Blog handle cannot start or end with a hyphen');
                    setBlogLoading(false);
                    return;
                }

                // Check reserved words
                if (isReservedHandle(trimmedHandle)) {
                    setBlogError('This handle is reserved and cannot be used');
                    setBlogLoading(false);
                    return;
                }
            }

            await updateWorkspaceMemberProfile(workspaceId, {
                blogTheme,
                blogHandle: blogHandle.trim() || undefined,
                blogDescription: blogDescription.trim() || undefined
            });

            setBlogSuccess('Blog settings saved successfully');
            setInitialBlogHandle(blogHandle.trim());
            setInitialBlogTheme(blogTheme);
            setInitialBlogDescription(blogDescription.trim());
        } catch (err) {
            setBlogError((err as Error).message);
        } finally {
            setBlogLoading(false);
        }
    };

    if (!user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (initialLoading) {
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, minHeight: 40 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">{strings.settings.workspaceProfile.profileInfo}</Typography>
                        <Box sx={{ minWidth: 80, display: 'flex', justifyContent: 'center' }}>
                            {profileSuccess && (
                                <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Saved"
                                    color="success"
                                    size="small"
                                />
                            )}
                            {profileError && (
                                <Chip
                                    icon={<ErrorIcon />}
                                    label="Error"
                                    color="error"
                                    size="small"
                                />
                            )}
                        </Box>
                    </Box>
                    <Button
                        variant="contained"
                        onClick={handleSaveProfile}
                        disabled={profileLoading || (
                            displayName === initialDisplayName &&
                            workspaceTimezone === initialTimezone &&
                            workspaceLocale === initialLocale
                        )}
                        size="small"
                        sx={{ minWidth: 120 }}
                    >
                        {profileLoading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                Saving...
                            </Box>
                        ) : 'Save Profile'}
                    </Button>
                </Box>


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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, minHeight: 40 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">Blog Settings</Typography>
                        <Box sx={{ minWidth: 80, display: 'flex', justifyContent: 'center' }}>
                            {blogSuccess && (
                                <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Saved"
                                    color="success"
                                    size="small"
                                />
                            )}
                            {blogError && (
                                <Chip
                                    icon={<ErrorIcon />}
                                    label="Error"
                                    color="error"
                                    size="small"
                                />
                            )}
                        </Box>
                    </Box>
                    <Button
                        variant="contained"
                        onClick={handleSaveBlog}
                        disabled={blogLoading || !!handleError || (
                            blogTheme === initialBlogTheme &&
                            blogHandle === initialBlogHandle &&
                            blogDescription === initialBlogDescription
                        )}
                        size="small"
                        sx={{ minWidth: 160 }}
                    >
                        {blogLoading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                Saving...
                            </Box>
                        ) : 'Save Blog Settings'}
                    </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Customize your public blog appearance and URL.
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Note:</strong> Only documents with "Public" visibility will appear on your blog.
                    </Typography>
                    {handleChecking && blogHandle && blogHandle !== initialBlogHandle ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">
                                Checking handle availability...
                            </Typography>
                        </Box>
                    ) : blogHandle && !handleError && !isReservedHandle(blogHandle) ? (
                        <Typography variant="body2">
                            Your blog URL: <Link href={`/blog/${blogHandle}`} target="_blank" rel="noopener" sx={{ fontWeight: 'bold' }}>
                                {window.location.origin}/blog/{blogHandle}
                            </Link>
                        </Typography>
                    ) : blogHandle ? (
                        <Typography variant="body2" color="error">
                            Your blog URL: <span style={{ textDecoration: 'line-through' }}>{window.location.origin}/blog/{blogHandle}</span> (Invalid)
                        </Typography>
                    ) : (
                        <Typography variant="body2">
                            Without a blog handle, your blog will be accessible at:{' '}
                            <Link href={`/blog/${workspaceId}/${membershipId}`} target="_blank" rel="noopener" sx={{ fontWeight: 'bold' }}>
                                {window.location.origin}/blog/{workspaceId}/{membershipId}
                            </Link>
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
                            }}
                            error={Boolean(handleError)}
                            helperText={
                                handleError ||
                                (handleChecking ? (
                                    <Typography component="span" variant="caption" color="text.secondary">
                                        Checking availability...
                                    </Typography>
                                ) : handleAvailable ? (
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
        </Container>
    );
};

export default WorkspaceProfilePage;
