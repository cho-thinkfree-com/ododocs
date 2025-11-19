import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Tabs,
    Tab,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Avatar,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Grid
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { updateAccount, getWorkspaceMemberProfile, updateWorkspaceMemberProfile } from '../../lib/api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const SettingsPage = () => {
    const { user, tokens, refreshProfile } = useAuth();
    const { workspaceId } = useParams<{ workspaceId: string }>();
    // const navigate = useNavigate();
    // const location = useLocation();

    // Determine initial tab based on URL or context
    // 0 = Account, 1 = Workspace Profile
    const [tabValue, setTabValue] = useState(workspaceId ? 1 : 0);

    // Account State
    const [email, setEmail] = useState('');
    const [legalName, setLegalName] = useState('');
    const [preferredLocale, setPreferredLocale] = useState('en');
    const [preferredTimezone, setPreferredTimezone] = useState('UTC');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Workspace Profile State

    const [displayName, setDisplayName] = useState('');
    const [workspaceTimezone, setWorkspaceTimezone] = useState('UTC');
    const [workspaceLocale, setWorkspaceLocale] = useState('en');

    // UI State
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setEmail(user.email);
            setLegalName(user.legalName || '');
            setPreferredLocale(user.preferredLocale || 'en');
            setPreferredTimezone(user.preferredTimezone || 'UTC');
        }
    }, [user]);

    useEffect(() => {
        if (workspaceId && tokens) {
            setProfileLoading(true);
            getWorkspaceMemberProfile(workspaceId, tokens.accessToken)
                .then(profile => {
                    setDisplayName(profile.displayName || '');
                    setWorkspaceTimezone(profile.timezone || 'UTC');
                    setWorkspaceLocale(profile.preferredLocale || 'en');
                })
                .catch(err => {
                    console.error('Failed to load workspace profile', err);
                    // If we can't load workspace profile, maybe switch to account tab?
                    // But let's just show error in the tab
                })
                .finally(() => setProfileLoading(false));
        }
    }, [workspaceId, tokens]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setError(null);
        setSuccess(null);
    };

    const handleAccountSave = async () => {
        if (!tokens) return;
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const updates: any = {
                legalName,
                preferredLocale,
                preferredTimezone
            };

            // Only include email/password if changed/provided
            if (email !== user?.email) updates.email = email;
            if (newPassword) updates.newPassword = newPassword;
            if (currentPassword) updates.currentPassword = currentPassword;

            await updateAccount(tokens.accessToken, updates);
            await refreshProfile(); // Refresh global user data
            setSuccess('Account settings updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceProfileSave = async () => {
        if (!tokens || !workspaceId) return;
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const updated = await updateWorkspaceMemberProfile(workspaceId, tokens.accessToken, {
                displayName,
                timezone: workspaceTimezone,
                preferredLocale: workspaceLocale
            });

            setSuccess('Workspace profile updated successfully.');
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

    return (
        <Container maxWidth="md">
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Settings
            </Typography>

            <Paper sx={{ mt: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Account" />
                    {workspaceId && <Tab label="Workspace Profile" />}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                    <TabPanel value={tabValue} index={0}>
                        <Typography variant="h6" gutterBottom>Personal Information</Typography>
                        <Grid container spacing={3}>
                            <Grid size={12}>
                                <TextField
                                    label="Legal Name"
                                    fullWidth
                                    value={legalName}
                                    onChange={(e) => setLegalName(e.target.value)}
                                />
                            </Grid>
                            <Grid size={12}>
                                <TextField
                                    label="Email Address"
                                    fullWidth
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    helperText="Changing email requires current password"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Preferred Language</InputLabel>
                                    <Select
                                        value={preferredLocale}
                                        label="Preferred Language"
                                        onChange={(e) => setPreferredLocale(e.target.value)}
                                    >
                                        <MenuItem value="en">English</MenuItem>
                                        <MenuItem value="ko">Korean</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Timezone</InputLabel>
                                    <Select
                                        value={preferredTimezone}
                                        label="Timezone"
                                        onChange={(e) => setPreferredTimezone(e.target.value)}
                                    >
                                        <MenuItem value="UTC">UTC</MenuItem>
                                        <MenuItem value="Asia/Seoul">Seoul</MenuItem>
                                        <MenuItem value="America/New_York">New York</MenuItem>
                                        <MenuItem value="Europe/London">London</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 4 }} />

                        <Typography variant="h6" gutterBottom>Security</Typography>
                        <Grid container spacing={3}>
                            <Grid size={12}>
                                <TextField
                                    label="New Password"
                                    type="password"
                                    fullWidth
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    helperText="Leave blank to keep current password"
                                />
                            </Grid>
                            <Grid size={12}>
                                <TextField
                                    label="Current Password"
                                    type="password"
                                    fullWidth
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    helperText="Required for changing email or password"
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleAccountSave}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Save Account Changes'}
                            </Button>
                        </Box>
                    </TabPanel>

                    {workspaceId && (
                        <TabPanel value={tabValue} index={1}>
                            {profileLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <>
                                    <Typography variant="h6" gutterBottom>Workspace Profile</Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        These settings apply only to this workspace.
                                    </Typography>

                                    <Grid container spacing={3}>
                                        <Grid size={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                <Avatar
                                                    sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}
                                                >
                                                    {displayName ? displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Button variant="outlined" size="small">
                                                    Change Avatar
                                                </Button>
                                            </Box>
                                        </Grid>
                                        <Grid size={12}>
                                            <TextField
                                                label="Display Name"
                                                fullWidth
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                helperText="How you appear to others in this workspace"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FormControl fullWidth>
                                                <InputLabel>Language</InputLabel>
                                                <Select
                                                    value={workspaceLocale}
                                                    label="Language"
                                                    onChange={(e) => setWorkspaceLocale(e.target.value)}
                                                >
                                                    <MenuItem value="en">English</MenuItem>
                                                    <MenuItem value="ko">Korean</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FormControl fullWidth>
                                                <InputLabel>Timezone</InputLabel>
                                                <Select
                                                    value={workspaceTimezone}
                                                    label="Timezone"
                                                    onChange={(e) => setWorkspaceTimezone(e.target.value)}
                                                >
                                                    <MenuItem value="UTC">UTC</MenuItem>
                                                    <MenuItem value="Asia/Seoul">Seoul</MenuItem>
                                                    <MenuItem value="America/New_York">New York</MenuItem>
                                                    <MenuItem value="Europe/London">London</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={handleWorkspaceProfileSave}
                                            disabled={loading}
                                        >
                                            {loading ? <CircularProgress size={24} /> : 'Save Profile Changes'}
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </TabPanel>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default SettingsPage;
