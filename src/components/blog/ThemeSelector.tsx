import { useState } from 'react';
import {
    Box,
    Fab,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { BLOG_THEMES } from './themeRegistry';

interface ThemeSelectorProps {
    currentThemeId: string;
    ownerDefaultThemeId?: string;
    onThemeChange: (themeId: string) => void;
}

const ThemeSelector = ({ currentThemeId, ownerDefaultThemeId, onThemeChange }: ThemeSelectorProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleThemeSelect = (themeId: string) => {
        onThemeChange(themeId);
        handleClose();
    };

    const isOwnerDefault = ownerDefaultThemeId ? currentThemeId === ownerDefaultThemeId : true;

    return (
        <>
            <Tooltip title={isOwnerDefault ? "Change Theme" : "Theme Changed (Visitor Preview)"}>
                <Fab
                    size="small"
                    aria-label="change theme"
                    onClick={handleClick}
                    sx={{
                        position: 'fixed',
                        bottom: 32,
                        right: 32,
                        zIndex: 1000,
                        bgcolor: isOwnerDefault ? 'grey.500' : 'primary.light',
                        color: 'white',
                        '&:hover': {
                            bgcolor: isOwnerDefault ? 'grey.700' : 'primary.main',
                        }
                    }}
                >
                    <PaletteIcon />
                </Fab>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: { width: 240, maxHeight: 300 },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Select Theme
                    </Typography>
                </Box>
                {BLOG_THEMES.map((theme) => (
                    <MenuItem
                        key={theme.id}
                        selected={theme.id === currentThemeId}
                        onClick={() => handleThemeSelect(theme.id)}
                        sx={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                        <Typography variant="body2">{theme.name}</Typography>
                        {theme.id === ownerDefaultThemeId && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                (Default)
                            </Typography>
                        )}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default ThemeSelector;
