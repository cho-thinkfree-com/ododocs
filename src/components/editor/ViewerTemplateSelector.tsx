import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import type { ViewerTemplate } from '../../lib/viewerTemplates';
import { useI18n } from '../../lib/i18n';

type ViewerTemplateSelectorProps = {
    value: ViewerTemplate;
    onChange: (template: ViewerTemplate) => void;
};

const ViewerTemplateSelector = ({ value, onChange }: ViewerTemplateSelectorProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const { strings } = useI18n();

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleTemplateChange = (template: ViewerTemplate) => {
        onChange(template);
        handleClose();
    };

    const options: Array<{ value: ViewerTemplate; label: string }> = [
        { value: 'original', label: strings.editor.viewerTemplate.original },
        { value: 'large', label: strings.editor.viewerTemplate.large },
        { value: 'article', label: strings.editor.viewerTemplate.article },
    ];

    return (
        <>
            <Tooltip title={strings.editor.viewerTemplate.label}>
                <IconButton
                    onClick={handleClick}
                    size="small"
                    aria-controls={open ? 'template-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    sx={{ ml: 1 }}
                >
                    <PaletteIcon />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                id="template-menu"
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            ml: -0.5,
                            mr: 1,
                        },
                        '&:before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 14,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                        },
                    },
                }}
            >
                {options.map((option) => (
                    <MenuItem
                        key={option.value}
                        onClick={() => handleTemplateChange(option.value)}
                        selected={value === option.value}
                    >
                        <ListItemText primary={option.label} />
                        {value === option.value && (
                            <ListItemIcon sx={{ minWidth: 'auto !important', ml: 2 }}>
                                <CheckIcon fontSize="small" />
                            </ListItemIcon>
                        )}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default ViewerTemplateSelector;
