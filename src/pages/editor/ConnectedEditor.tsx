import { Snackbar, Alert, Box, Button } from '@mui/material';
import { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appendRevision, renameDocument, type DocumentRevision, type DocumentSummary } from '../../lib/api';
import EditorLayout from '../../components/layout/EditorLayout';
import useEditorInstance from '../../editor/useEditorInstance';
import { useDebouncedCallback } from '../../lib/useDebounce';
import { broadcastSync } from '../../lib/syncEvents';
import { usePageTitle } from '../../hooks/usePageTitle';

type ConnectedEditorProps = {
    document: DocumentSummary;
    initialRevision: DocumentRevision | null;
};

const ConnectedEditor = ({ document, initialRevision }: ConnectedEditorProps) => {
    const { tokens } = useAuth();
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(document);
    const [editorError, setEditorError] = useState<string | null>(null);

    // Update page title when document title changes
    usePageTitle(currentDocument.title);

    // This hook is now called ONLY when ConnectedEditor mounts, which happens after data is loaded.
    const editor = useEditorInstance({
        content: initialRevision?.content,
        onError: () => {
            setEditorError('The document content is invalid or corrupted.');
        }
    });

    const handleSave = useCallback(async () => {
        if (!editor || !tokens) {
            return;
        }

        setSaveStatus('saving');

        try {
            // Save content
            const content = editor.getJSON();
            await appendRevision(currentDocument.id, tokens.accessToken, { content });

            setSaveStatus('saved');
            setSnackbarOpen(true);

            // Broadcast document update so lists (size/modified) refresh
            broadcastSync({
                type: 'document-updated',
                workspaceId: currentDocument.workspaceId,
                folderId: currentDocument.folderId,
                documentId: currentDocument.id,
                data: { source: 'content-save' }
            });
        } catch (err) {
            console.error(err);
            setSaveStatus('unsaved');
        }
    }, [editor, currentDocument, tokens]);

    const handleTitleSave = useCallback(async (newTitle: string) => {
        if (!tokens || !newTitle.trim()) {
            return;
        }

        setSaveStatus('saving');

        try {
            const updatedDoc = await renameDocument(currentDocument.id, tokens.accessToken, { title: newTitle });
            setCurrentDocument(updatedDoc);
            setSaveStatus('saved');
            setSnackbarOpen(true);

            // Broadcast document update to other tabs
            broadcastSync({
                type: 'document-updated',
                workspaceId: updatedDoc.workspaceId,
                folderId: updatedDoc.folderId,
                documentId: updatedDoc.id,
                data: { title: newTitle }
            });
        } catch (err) {
            console.error(err);
            setSaveStatus('unsaved');
        }
    }, [currentDocument, tokens]);

    const debouncedSave = useDebouncedCallback(handleSave, 2000);
    const debouncedTitleSave = useDebouncedCallback(handleTitleSave, 2000);

    const handleContentChange = () => {
        setSaveStatus('unsaved');
        debouncedSave();
    };

    const handleTitleChange = (newTitle: string) => {
        setSaveStatus('unsaved');
        debouncedTitleSave(newTitle);
    };

    const handleClose = () => {
        window.close();
    };

    if (editorError) {
        return (
            <Box sx={{ height: '100dvh', minHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Alert severity="error">{editorError}</Alert>
                <Button variant="contained" onClick={handleClose}>
                    Close
                </Button>
            </Box>
        );
    }

    return (
        <>
            <EditorLayout
                editor={editor}
                document={currentDocument}
                onContentChange={handleContentChange}
                onTitleChange={handleTitleChange}
                onClose={handleClose}
                saveStatus={saveStatus}
            />
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message="Document saved"
            />
        </>
    );
};

export default ConnectedEditor;
