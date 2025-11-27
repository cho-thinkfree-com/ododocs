import { useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LinkIcon from '@mui/icons-material/Link';
import { getShareLinks } from '../../lib/api';
import { generateShareUrl } from '../../lib/shareUtils';

interface PublicDocumentIndicatorProps {
    documentId: string;
    title: string;
}

export default function PublicDocumentIndicator({ documentId, title }: PublicDocumentIndicatorProps) {
    const [hovered, setHovered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tooltipMessage, setTooltipMessage] = useState('Copy public link');
    const [tooltipOpen, setTooltipOpen] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (loading) return;

        setLoading(true);
        try {
            const links = await getShareLinks(documentId);
            const activeLink = links.find(l => !l.revokedAt);

            if (activeLink) {
                const url = generateShareUrl(activeLink.token, title);
                await navigator.clipboard.writeText(url);
                setTooltipMessage('Copied!');
                setTooltipOpen(true);

                // Reset tooltip after 2 seconds
                setTimeout(() => {
                    setTooltipOpen(false);
                    setTimeout(() => setTooltipMessage('Copy public link'), 200); // Wait for close animation
                }, 2000);
            } else {
                setTooltipMessage('No active link found');
                setTooltipOpen(true);
            }
        } catch (err) {
            console.error('Failed to copy link:', err);
            setTooltipMessage('Failed to copy link');
            setTooltipOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleMouseEnter = () => {
        setHovered(true);
        if (tooltipMessage === 'Copy public link') {
            setTooltipOpen(true);
        }
    };

    const handleMouseLeave = () => {
        setHovered(false);
        if (tooltipMessage === 'Copy public link') {
            setTooltipOpen(false);
        }
    };

    return (
        <Tooltip
            title={tooltipMessage}
            open={tooltipOpen}
            onClose={() => setTooltipOpen(false)}
            arrow
            placement="top"
        >
            <Box
                component="span"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    ml: 1,
                    verticalAlign: 'middle',
                    color: 'info.main',
                    opacity: hovered ? 1 : 0.6,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                        opacity: 1,
                    }
                }}
            >
                <PublicIcon sx={{ fontSize: '1rem' }} />
                {hovered && (
                    <LinkIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
                )}
            </Box>
        </Tooltip>
    );
}
