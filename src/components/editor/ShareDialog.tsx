import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    Alert,
    CircularProgress,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
} from '@mui/material'
import { useEffect, useState } from 'react'
import {
    createShareLink,
    getShareLinks,
    revokeShareLink,
    updateDocument,
    updateShareLink,
    type ShareLinkResponse,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { generateShareUrl } from '../../lib/shareUtils'

interface ShareDialogProps {
    open: boolean
    onClose: () => void
    documentId: string
    document?: { title: string } // Add document prop for title
    onVisibilityChange?: (visibility: string) => void
}

export default function ShareDialog({ open, onClose, documentId, document, onVisibilityChange }: ShareDialogProps) {
    const { isAuthenticated } = useAuth()
    const [loading, setLoading] = useState(false)
    const [shareLink, setShareLink] = useState<ShareLinkResponse['shareLink'] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [updating, setUpdating] = useState(false)

    const fetchLink = async () => {
        if (!isAuthenticated) return
        setLoading(true)
        try {
            const links = await getShareLinks(documentId)
            // For now, we assume one active link per document for simplicity in this UI
            const activeLink = links.find(l => !l.revokedAt)
            setShareLink(activeLink || null)
        } catch (err) {
            console.error(err)
            setError('Failed to load share link')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchLink()
            setError(null)
            setCopied(false)
        }
    }, [open, documentId, isAuthenticated])

    const handleCreate = async () => {
        if (!isAuthenticated) return
        setLoading(true)
        try {
            // Create with default link-only access (isPublic=false)
            const result = await createShareLink(documentId, { isPublic: false })
            setShareLink(result.shareLink)
            // Automatically make public when sharing
            await updateDocument(documentId, { visibility: 'public' })
            onVisibilityChange?.('public')
        } catch (err) {
            setError('Failed to create share link')
        } finally {
            setLoading(false)
        }
    }

    const handleRevoke = async () => {
        if (!isAuthenticated || !shareLink) return
        setLoading(true)
        try {
            await revokeShareLink(shareLink.id)
            setShareLink(null)
            // Revert to private when unpublishing
            await updateDocument(documentId, { visibility: 'private' })
            onVisibilityChange?.('private')
        } catch (err) {
            setError('Failed to revoke link')
        } finally {
            setLoading(false)
        }
    }

    const handlePublicLevelChange = async (newIsPublic: boolean) => {
        if (!shareLink || updating) return
        setUpdating(true)
        try {
            const updated = await updateShareLink(shareLink.id, { isPublic: newIsPublic })
            setShareLink(updated)
        } catch (err) {
            setError('Failed to update public level')
        } finally {
            setUpdating(false)
        }
    }

    const handleCopy = () => {
        if (!shareLink || !document) return
        const url = generateShareUrl(shareLink.token, document.title, shareLink.isPublic)
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shareUrl = shareLink && document ? generateShareUrl(shareLink.token, document.title, shareLink.isPublic) : ''

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Share Document</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {loading && !shareLink ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : !shareLink ? (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Publish this document to the web to share it with others.
                        </Typography>
                        <Button variant="contained" onClick={handleCreate}>
                            Publish to Web
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ pt: 1 }}>
                        {/* Public Level Selector */}
                        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
                            <FormLabel component="legend" sx={{ mb: 1.5 }}>
                                공개 수준
                            </FormLabel>
                            <RadioGroup
                                value={shareLink.isPublic ? 'public' : 'link-only'}
                                onChange={(e) => handlePublicLevelChange(e.target.value === 'public')}
                            >
                                <FormControlLabel
                                    value="link-only"
                                    control={<Radio />}
                                    disabled={updating}
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                                링크만 공유
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                링크를 아는 사람만 접근할 수 있으며 검색엔진에 노출되지 않습니다
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="public"
                                    control={<Radio />}
                                    disabled={updating}
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                                완전 공개
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                검색엔진에 노출되며 누구나 찾을 수 있습니다
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                        </FormControl>

                        {/* Share URL */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {shareLink.isPublic
                                ? '이 링크는 검색엔진에 노출되며 누구나 접근할 수 있습니다.'
                                : '이 링크를 아는 사람만 문서를 볼 수 있습니다.'}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                                fullWidth
                                value={shareUrl}
                                InputProps={{
                                    readOnly: true,
                                }}
                                size="small"
                                onClick={(e) => {
                                    const input = e.currentTarget.querySelector('input');
                                    if (input) {
                                        input.select();
                                        navigator.clipboard.writeText(shareUrl);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }
                                }}
                                sx={{ cursor: 'pointer' }}
                            />
                            <Button variant="outlined" onClick={handleCopy}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </Box>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button color="error" onClick={handleRevoke}>
                                Unpublish
                            </Button>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}
