import { AppBar, Box, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Menu, MenuItem } from '@mui/material';
import { Outlet, useNavigate, useParams, Link as RouterLink, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useAuth } from '../context/AuthContext';
import { getWorkspaces, type WorkspaceSummary } from '../lib/api';

const drawerWidth = 240;

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState<null | HTMLElement>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const currentWorkspace = workspaces.find(ws => ws.id === workspaceId);
  const isDashboard = location.pathname === '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      setWorkspacesLoading(true);
      getWorkspaces()
        .then(setWorkspaces)
        .catch(console.error)
        .finally(() => setWorkspacesLoading(false));
    }
  }, [isAuthenticated]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleWorkspaceMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setWorkspaceMenuAnchor(event.currentTarget);
  };

  const handleWorkspaceMenuClose = () => {
    setWorkspaceMenuAnchor(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Box
          onClick={handleWorkspaceMenuOpen}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%' }}
        >
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {workspacesLoading ? 'Loading...' : (currentWorkspace?.name || 'Select Workspace')}
          </Typography>
          <ArrowDropDownIcon />
        </Box>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/dashboard">
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        {workspaceId && (
          <>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to={`/workspace/${workspaceId}`}>
                <ListItemIcon>
                  <FolderIcon />
                </ListItemIcon>
                <ListItemText primary="Documents" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to={`/workspace/${workspaceId}/members`}>
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Members" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to={`/workspace/${workspaceId}/settings`}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleProfileMenuOpen}>
            <ListItemIcon>
              <AccountCircleIcon />
            </ListItemIcon>
            <ListItemText primary="My Profile" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {isDashboard ? 'Dashboard' : (workspacesLoading ? 'Loading...' : (currentWorkspace?.name || 'Workspace'))}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant={isMobile ? 'persistent' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
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
          p: 3,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: { xs: `-${drawerWidth}px`, md: 0 },
          ...(mobileOpen && {
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* Workspace Switcher Menu */}
      <Menu
        anchorEl={workspaceMenuAnchor}
        open={Boolean(workspaceMenuAnchor)}
        onClose={handleWorkspaceMenuClose}
      >
        <MenuItem component={RouterLink} to="/dashboard" onClick={handleWorkspaceMenuClose}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Workspace Dashboard</ListItemText>
        </MenuItem>
        <Divider />
        {workspaces.map(ws => (
          <MenuItem
            key={ws.id}
            component={RouterLink}
            to={`/workspace/${ws.id}`}
            selected={ws.id === workspaceId}
            onClick={handleWorkspaceMenuClose}
          >
            {ws.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Profile Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MainLayout;
