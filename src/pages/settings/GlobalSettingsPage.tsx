import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    Select,
    Paper,
    Grid
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../lib/i18n';
import { updateAccount } from '../../lib/api';
import { ChangePasswordDialog } from './ChangePasswordDialog';

const GlobalSettingsPage = () => {
    const { user, tokens, refreshProfile } = useAuth();
    const { strings } = useI18n();

    // Account State
    const [email, setEmail] = useState('');
    const [legalName, setLegalName] = useState('');
    const [preferredLocale, setPreferredLocale] = useState('en-US');
    const [preferredTimezone, setPreferredTimezone] = useState('UTC');
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setEmail(user.email);
            setLegalName(user.legalName || '');
            setPreferredLocale(user.preferredLocale || 'en-US');
            setPreferredTimezone(user.preferredTimezone || 'UTC');
        }
    }, [user]);

    const handleSave = async () => {
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

            await updateAccount(tokens.accessToken, updates);
            await refreshProfile(); // Refresh global user data
            setSuccess(strings.settings.global.updateSuccess);
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
                {strings.settings.global.title}
            </Typography>

            <Paper sx={{ p: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                <Typography variant="h6" gutterBottom>{strings.settings.global.personalInfo}</Typography>

                <Grid container spacing={3}>
                    <Grid size={12}>
                        <TextField
                            label={strings.settings.global.legalName}
                            fullWidth
                            value={legalName}
                            onChange={(e) => setLegalName(e.target.value)}
                        />
                    </Grid>
                    <Grid size={12}>
                        <TextField
                            label={strings.settings.global.email}
                            fullWidth
                            value={email}
                            disabled
                            helperText="Email cannot be changed"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel shrink>{strings.settings.global.preferredLanguage}</InputLabel>
                            <Select
                                native
                                value={preferredLocale}
                                label={strings.settings.global.preferredLanguage}
                                onChange={(e) => setPreferredLocale(e.target.value)}
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
                                value={preferredTimezone}
                                label={strings.settings.global.timezone}
                                onChange={(e) => setPreferredTimezone(e.target.value)}
                            >
                                <option value="UTC">UTC</option>
                                <option value="Asia/Seoul">Seoul</option>
                                <option value="America/New_York">New York</option>
                                <option value="Europe/London">London</option>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" gutterBottom>{strings.settings.global.security}</Typography>

                <Grid container spacing={3}>
                    <Grid size={12}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {strings.settings.global.password}
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={() => setIsPasswordDialogOpen(true)}
                            >
                                {strings.settings.global.changePassword}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : strings.settings.global.saveChanges}
                    </Button>
                </Box>
            </Paper>

            <ChangePasswordDialog
                open={isPasswordDialogOpen}
                onClose={() => setIsPasswordDialogOpen(false)}
            />
        </Container>
    );
};

export default GlobalSettingsPage;
