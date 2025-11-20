import { AppBar, Box, Button, TextField, Toolbar, Typography } from '@mui/material';
import { RichTextEditorProvider } from 'mui-tiptap';
import EditorToolbar from '../editor/EditorToolbar';
import EditorWorkspace from '../editor/EditorWorkspace';
import EditorTableOfContents from '../editor/EditorTableOfContents';
import type { DocumentSummary } from '../../lib/api';
import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from '../../lib/useDebounce';

interface EditorLayoutProps {
    editor: Editor | null;
    document: DocumentSummary;
    onContentChange: () => void;
    onTitleChange: (newTitle: string) => void;
    onClose: () => void;
    saveStatus: 'saved' | 'unsaved' | 'saving';
}

const EditorLayout = ({ editor, document, onContentChange, onTitleChange, onClose, saveStatus }: EditorLayoutProps) => {
    const [tocOpen, setTocOpen] = useState(true);
    const [localTitle, setLocalTitle] = useState(document.title);

    useEffect(() => {
        setLocalTitle(document.title);
    }, [document.title]);

    useEffect(() => {
        if (editor) {
            editor.on('update', onContentChange);
            return () => {
                editor.off('update', onContentChange);
            };
        }
    }, [editor, onContentChange]);

    // Debounce title change to avoid calling onTitleChange on every keystroke
    const debouncedTitleChange = useDebouncedCallback((newTitle: string) => {
        if (newTitle.trim() && newTitle !== document.title) {
            onTitleChange(newTitle);
        }
    }, 500); // 500ms delay

    const getSaveStatusText = () => {
        switch (saveStatus) {
            case 'saving':
                return 'Saving...';
            case 'saved':
                return 'Saved';
            default:
                return 'Unsaved changes';
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;

        // Update local state immediately for responsive UI
        setLocalTitle(newTitle);

        // Debounced save
        debouncedTitleChange(newTitle);
    };

    const handleTitleBlur = () => {
        // If title is empty on blur, revert to document title
        if (!localTitle.trim()) {
            setLocalTitle(document.title);
        } else if (localTitle !== document.title) {
            // Save immediately on blur if changed
            onTitleChange(localTitle);
        }
    };

    return (
        <RichTextEditorProvider editor={editor}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <AppBar position="static" color="default" elevation={1}>
                    <Toolbar sx={{ px: { xs: 2, sm: 4, lg: 6 } }}>
                        <TextField
                            value={localTitle}
                            onChange={handleTitleChange}
                            onBlur={handleTitleBlur}
                            variant="standard"
                            InputProps={{
                                disableUnderline: true,
                                sx: {
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                }
                            }}
                            sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2" sx={{ mr: 1 }}>
                            {getSaveStatusText()}
                        </Typography>
                        <Button color="primary" variant="contained" onClick={onClose}>
                            Close
                        </Button>
                    </Toolbar>
                </AppBar>
                <EditorToolbar
                    showTableOfContentsToggle={true}
                    tableOfContentsOpen={tocOpen}
                    onToggleTableOfContents={() => setTocOpen(!tocOpen)}
                />
                <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                    <Box sx={{
                        width: tocOpen ? 280 : 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        transition: 'width 0.3s ease',
                        p: tocOpen ? 2 : 0,
                    }}>
                        {tocOpen && <EditorTableOfContents />}
                    </Box>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, px: { xs: 2, sm: 4, lg: 6 } }}>
                        <EditorWorkspace />
                    </Box>
                </Box>
            </Box>
        </RichTextEditorProvider>
    );
};

export default EditorLayout;