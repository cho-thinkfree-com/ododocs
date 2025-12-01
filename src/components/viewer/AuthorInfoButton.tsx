import { IconButton, Tooltip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useState } from 'react';
import AuthorInfoPopover from './AuthorInfoPopover';
import type { FileSystemEntry } from '../../lib/api';

interface AuthorInfoButtonProps {
    token: string;
    handle?: string;
    authorName?: string;
    document?: FileSystemEntry;
    accessType?: 'private' | 'link' | 'public';
}

const AuthorInfoButton = ({ token, handle, authorName, document, accessType }: AuthorInfoButtonProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    // Construct currentDocInfo from document prop
    const currentDocInfo = document ? {
        title: document.name,
        viewCount: (document as any).viewCount,
        createdAt: document.createdAt,
        accessType: accessType || (document.shareLinks?.find(l => l.token === token)?.accessType ?? 'link'),
        authorName: authorName
    } : undefined;

    return (
        <>
            <Tooltip title={authorName ? `작성자: ${authorName}` : '작성자 정보'}>
                <IconButton
                    onClick={handleClick}
                    sx={{
                        width: 32,
                        height: 32,
                        ml: 1,
                    }}
                    aria-label="작성자 정보"
                >
                    <PersonIcon />
                </IconButton>
            </Tooltip>
            <AuthorInfoPopover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                token={token}
                handle={handle}
                authorName={authorName}
                currentDocInfo={currentDocInfo}
            />
        </>
    );
};

export default AuthorInfoButton;
