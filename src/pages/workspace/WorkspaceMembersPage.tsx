import { Alert, Box, Button, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Select, TextField, Typography, Tooltip, Breadcrumbs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { getWorkspaceMembers, inviteWorkspaceMember, changeWorkspaceMemberRole, removeWorkspaceMember, type MembershipSummary } from '../../lib/api';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const WorkspaceMembersPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [members, setMembers] = useState<MembershipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchMembers = async () => {
    if (isAuthenticated && workspaceId) {
      setLoading(true);
      try {
        const members = await getWorkspaceMembers(workspaceId);
        setMembers(members);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [isAuthenticated, workspaceId]);

  const handleInviteMember = async () => {
    if (!isAuthenticated || !workspaceId || !inviteEmail) {
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    try {
      await inviteWorkspaceMember(workspaceId, inviteEmail, 'member');
      setInviteDialogOpen(false);
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      setInviteError((err as Error).message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'owner' | 'admin' | 'member') => {
    if (!isAuthenticated || !workspaceId) {
      return;
    }
    try {
      await changeWorkspaceMemberRole(workspaceId, memberId, newRole);
      fetchMembers();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (!isAuthenticated || !workspaceId) {
      return;
    }

    // Check if trying to remove self
    if (memberId === user?.id) {
      setError('자기 자신은 삭제할 수 없습니다.');
      return;
    }

    // Check if this is the last owner
    const ownerCount = members.filter(m => m.role === 'owner').length;
    if (memberRole === 'owner' && ownerCount <= 1) {
      setError('최소 1명의 Owner가 필요합니다. 다른 멤버를 Owner로 지정한 후 삭제해주세요.');
      return;
    }

    try {
      await removeWorkspaceMember(workspaceId, memberId);
      fetchMembers();
    } catch (err) {
      setError((err as Error).message);
    }
  };



  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, height: 40 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Typography color="text.primary" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
            Members
          </Typography>
        </Breadcrumbs>

        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setComingSoonOpen(true)}
        >
          Invite Member
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 1 }}>
          Workspace Members
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Manage members and their roles in this workspace.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="40%">Name</TableCell>
                <TableCell width="20%">Role</TableCell>
                <TableCell width="15%">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {member.displayName || member.accountId}
                      </Typography>
                      {member.accountId === user?.id && (
                        <Typography variant="caption" color="text.secondary" sx={{ bgcolor: 'action.hover', px: 1, borderRadius: 1 }}>
                          You
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.accountId, e.target.value as 'owner' | 'admin' | 'member')}
                      disabled={member.accountId === user?.id}
                      size="small"
                      variant="standard"
                      disableUnderline
                      sx={{ fontSize: '0.875rem' }}
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="member">Member</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={
                        member.accountId === user?.id
                          ? "Cannot remove yourself"
                          : member.role === 'owner' && members.filter(m => m.role === 'owner').length <= 1
                            ? "At least one owner required"
                            : "Remove member"
                      }
                    >
                      <span>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleRemoveMember(member.accountId, member.role)}
                          disabled={
                            member.accountId === user?.id ||
                            (member.role === 'owner' && members.filter(m => m.role === 'owner').length <= 1)
                          }
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
        <DialogTitle>Invite New Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Member Email or Account ID"
            type="email"
            fullWidth
            variant="standard"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={inviteLoading}
          />
          {inviteError && <Alert severity="error" sx={{ mt: 2 }}>{inviteError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)} disabled={inviteLoading}>Cancel</Button>
          <Button onClick={handleInviteMember} disabled={inviteLoading}>
            {inviteLoading ? 'Inviting...' : 'Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Coming Soon Dialog */}
      <Dialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Coming Soon</DialogTitle>
        <DialogContent>
          <Typography>
            멤버 초대 기능은 곧 제공될 예정입니다.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            The member invitation feature will be available soon.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComingSoonOpen(false)} variant="contained">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkspaceMembersPage;
