import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { RichTextEditorProvider } from 'mui-tiptap';
import EditorToolbar from '../editor/EditorToolbar';
import EditorWorkspace from '../editor/EditorWorkspace';
import EditorTableOfContents from '../editor/EditorTableOfContents';
import type { DocumentSummary } from '../../lib/api';
import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';

interface EditorLayoutProps {
    editor: Editor | null;
    document: DocumentSummary;
    onContentChange: () => void;
    onClose: () => void;
    saveStatus: 'saved' | 'unsaved' | 'saving';
}

const EditorLayout = ({ editor, document, onContentChange, onClose, saveStatus }: EditorLayoutProps) => {
    const [tocOpen, setTocOpen] = useState(true);

    useEffect(() => {
        if (editor) {
            editor.on('update', onContentChange);
            return () => {
                editor.off('update', onContentChange);
            };
        }
    }, [editor, onContentChange]);

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

    return (
        <RichTextEditorProvider editor={editor}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <AppBar position="static" color="default" elevation={1}>
                    <Toolbar sx={{ px: { xs: 2, sm: 4, lg: 6 } }}>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '2rem', fontWeight: 700 }}>
                            {document.title}
                        </Typography>
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