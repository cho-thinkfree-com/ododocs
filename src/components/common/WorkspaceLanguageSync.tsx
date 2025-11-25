import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type Locale } from '../../lib/i18n';
import { getWorkspaceMemberProfile } from '../../lib/api';

const WorkspaceLanguageSync = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const { isAuthenticated } = useAuth();
    const { setLocale } = useI18n();
    const location = useLocation();

    useEffect(() => {
        // Skip language sync ONLY on global settings page (/settings)
        // All workspace pages including /workspace/:id/profile should use workspace language
        if (location.pathname === '/settings') {
            return;
        }

        // Only sync language when in a workspace context
        // For non-workspace pages (like /dashboard), LanguageSync component handles it
        if (!workspaceId) {
            return;
        }

        const syncLanguage = async () => {
            if (isAuthenticated) {
                try {
                    const profile = await getWorkspaceMemberProfile(workspaceId);
                    if (profile.preferredLocale) {
                        setLocale(profile.preferredLocale as Locale);
                    }
                } catch (error) {
                    console.error('Failed to fetch workspace profile language:', error);
                }
            }
        };

        syncLanguage();
    }, [workspaceId, isAuthenticated, setLocale, location.pathname]);

    return null;
};

export default WorkspaceLanguageSync;
