import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Box } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckIcon from '@mui/icons-material/Check';

type EditorWidthSelectorProps = {
    editor: Editor | null;
    onContentChange?: () => void;
    initialWidth?: string;
};

const EditorWidthSelector = ({ editor, onContentChange, initialWidth = '950px' }: EditorWidthSelectorProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    if (!editor) {
        return null;
    }

    const VALID_WIDTHS = ['780px', '950px', '1200px', '100%'];

    const getClosestWidth = (width: any) => {
        if (!width) return '950px';
        if (VALID_WIDTHS.includes(width)) return width;
        if (width === '100%') return '100%';

        // Parse pixel value
        const pixelValue = parseInt(width, 10);
        if (isNaN(pixelValue)) return '950px';

        // Find closest option among pixel values
        const pixelOptions = [780, 950, 1200];
        const closest = pixelOptions.reduce((prev, curr) => {
            return (Math.abs(curr - pixelValue) < Math.abs(prev - pixelValue) ? curr : prev);
        });

        return `${closest}px`;
    };

    const [width, setWidth] = useState(getClosestWidth(editor.state.doc.attrs['x-odocs-layoutWidth'] || initialWidth));

    useEffect(() => {
        const updateWidth = () => {
            const currentAttr = editor.state.doc.attrs['x-odocs-layoutWidth'];
            setWidth(getClosestWidth(currentAttr || initialWidth));
        };

        updateWidth();
        editor.on('transaction', updateWidth);
        return () => {
            editor.off('transaction', updateWidth);
        };
    }, [editor, initialWidth]);

    const handleWidthChange = (newWidth: string) => {
        if (newWidth !== width) {
            const json = editor.getJSON();
            if (!json.attrs) {
                json.attrs = {};
            }
            json.attrs['x-odocs-layoutWidth'] = newWidth;
            editor.commands.setContent(json, { emitUpdate: true });

            editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));

            if (onContentChange) {
                onContentChange();
            }
        }
        handleClose();
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const options = [
        { value: '780px', label: 'Narrow', icon: '/document-width-narrow.png' },
        { value: '950px', label: 'Standard', icon: '/document-width-normal.png' },
        { value: '1200px', label: 'Wide', icon: '/document-width-wide.png' },
        { value: '100%', label: 'Full Width', icon: '/document-width-full.png' },
    ];

    return (
        <>
            <Tooltip title="Page Width">
                <IconButton
                    onClick={handleClick}
                    size="small"
                    aria-controls={open ? 'width-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    sx={{ ml: 1 }}
                >
                    <SwapHorizIcon />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                id="width-menu"
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
                        onClick={() => handleWidthChange(option.value)}
                        selected={width === option.value}
                    >
                        <ListItemIcon>
                            <Box component="img" src={option.icon} alt={option.label} sx={{ width: 24, height: 24, objectFit: 'contain' }} />
                        </ListItemIcon>
                        <ListItemText primary={option.label} />
                        {width === option.value && (
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

export default EditorWidthSelector;
