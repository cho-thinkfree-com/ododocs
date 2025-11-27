import ModernSimpleTheme from './themes/ModernSimpleTheme';
import ClassicTheme from './themes/ClassicTheme';
import type { BlogThemeProps } from './types';

export interface ThemeDefinition {
    id: string;
    name: string;
    component: React.ComponentType<BlogThemeProps>;
}

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
];

export const DEFAULT_THEME_ID = 'modern';

export const getThemeById = (id?: string | null): ThemeDefinition => {
    return BLOG_THEMES.find((theme) => theme.id === id) || BLOG_THEMES[0];
};
