import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { RichTextEditorProvider } from 'mui-tiptap';
import EditorHeader from '../editor/EditorHeader';
import EditorToolbar from '../editor/EditorToolbar';
import EditorWorkspace from '../editor/EditorWorkspace';
import EditorTableOfContents from '../editor/EditorTableOfContents';
import type { DocumentSummary } from '../../lib/api';
import type { Editor } from '@tiptap/react';
import { useEffect } from 'react';

interface EditorLayoutProps {
    editor: Editor | null;
    document: DocumentSummary;
    onTitleChange: (title: string) => void;
    onContentChange: () => void;
    onClose: () => void;
    saveStatus: 'saved' | 'unsaved' | 'saving';
}

const EditorLayout = ({ editor, document, onTitleChange, onContentChange, onClose, saveStatus }: EditorLayoutProps) => {
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
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            {document.title}
                        </Typography>
                        <Typography variant="body2" sx={{ mr: 2 }}>
                            {getSaveStatusText()}
                        </Typography>
                        <Button color="primary" variant="contained" onClick={onClose}>
                            Close
                        </Button>
                    </Toolbar>
                </AppBar>
                <EditorToolbar />
                <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                        <EditorHeader value={document.title} onChange={onTitleChange} />
                        <EditorWorkspace />
                    </Box>
                    <Box sx={{ width: 280, borderLeft: '1px solid #ddd', p: 2, overflowY: 'auto' }}>
                        <EditorTableOfContents />
                    </Box>
                </Box>
            </Box>
        </RichTextEditorProvider>
    );
};

export default EditorLayout;