import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, useTheme, useMediaQuery } from '@mui/material';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import { useI18n } from '../../lib/i18n';

const DRAWER_WIDTH = 240;

const WorkspaceLayout = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const location = useLocation();
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const { strings } = useI18n();

    if (!workspaceId) return null;

    const menuItems = [
        {
            text: strings.workspace.filesTitle || 'Files',
            icon: <FolderIcon />,
            path: `/workspace/${workspaceId}`,
            exact: true
        },
        {
            text: strings.workspace.trash || 'Trash',
            icon: <DeleteIcon />,
            path: `/workspace/${workspaceId}/trash`
        },
        {
            text: 'Members', // TODO: Add to i18n
            icon: <GroupIcon />,
            path: `/workspace/${workspaceId}/members`
        },
        {
            text: strings.workspace.settingsTitle || 'Settings',
            icon: <SettingsIcon />,
            path: `/workspace/${workspaceId}/settings`
        }
    ];

    const drawerContent = (
        <Box sx={{ overflow: 'auto', mt: 2 }}>
            <List>
                {menuItems.map((item) => {
                    const isSelected = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);

                    return (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                selected={isSelected}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    '&.Mui-selected': {
                                        bgcolor: 'primary.light',
                                        color: 'primary.contrastText',
                                        '&:hover': {
                                            bgcolor: 'primary.main',
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: 'inherit',
                                        }
                                    },
                                    borderRadius: 1,
                                    mx: 1,
                                    mb: 0.5
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'inherit' : 'text.secondary' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <Box
                component="nav"
                sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
            >
                <Drawer
                    variant={isMobile ? 'temporary' : 'permanent'}
                    open={!isMobile} // Always open on desktop for now
                    sx={{
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            top: 64, // Below AppBar
                            height: 'calc(100% - 64px)',
                            borderRight: `1px solid ${theme.palette.divider}`,
                            bgcolor: 'background.default'
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    minHeight: 'calc(100vh - 64px)',
                    bgcolor: 'background.default'
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default WorkspaceLayout;
