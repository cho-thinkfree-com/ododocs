import ModernSimpleTheme from './themes/ModernSimpleTheme';
import ClassicTheme from './themes/ClassicTheme';
import type { BlogThemeProps } from './types';

export interface ThemeDefinition {
    id: string;
    name: string;
    component: React.ComponentType<BlogThemeProps>;
}

import BoardTheme from './themes/BoardTheme';
import WikiTheme from './themes/WikiTheme';

export const BLOG_THEMES: ThemeDefinition[] = [
    {
        id: 'modern',
        name: 'Modern Simple',
        component: ModernSimpleTheme,
    },
    {
        id: 'classic',
        name: 'Classic List',
        component: ClassicTheme,
    },
    {
        id: 'board',
        name: 'Community Board',
        component: BoardTheme,
    },
    {
        id: 'wiki',
        name: 'Wiki Style',
        component: WikiTheme,
    },
];

export const DEFAULT_THEME_ID = 'modern';

export const getThemeById = (id?: string | null): ThemeDefinition => {
    return BLOG_THEMES.find((theme) => theme.id === id) || BLOG_THEMES[0];
};
