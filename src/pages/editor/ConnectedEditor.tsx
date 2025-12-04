import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateDocumentContent, renameFileSystemEntry, type FileSystemEntry } from '../../lib/api';
import EditorLayout from '../../components/layout/EditorLayout';
import useEditorInstance from '../../editor/useEditorInstance';
import { useDebouncedCallback } from '../../lib/useDebounce';
import { broadcastSync } from '../../lib/syncEvents';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useI18n } from '../../lib/i18n';
import CloseOverlay from '../../components/editor/CloseOverlay';
import { processContentForLoad, processContentForSave } from '../../lib/editorUtils';

type ConnectedEditorProps = {
    document: FileSystemEntry;
    initialContent: any;
};

type CloseFlowState = null | 'saving' | 'success' | 'error';

const ConnectedEditor = ({ document, initialContent }: ConnectedEditorProps) => {
    const { isAuthenticated } = useAuth();
    const { strings } = useI18n();
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

    const [currentDocument, setCurrentDocument] = useState(document);
    const [editorError, setEditorError] = useState<string | null>(null);
    const [closeFlowState, setCloseFlowState] = useState<CloseFlowState>(null);
    const [resolvedContent, setResolvedContent] = useState<any>(null);
    const [isResolving, setIsResolving] = useState(true);

    // Update page title when document name changes
    usePageTitle(currentDocument.name, saveStatus === 'unsaved' || saveStatus === 'saving');

    // Resolve assets on mount
    useEffect(() => {
        const resolve = async () => {
            if (initialContent) {
                const resolved = await processContentForLoad(initialContent, document.workspaceId, document.id);
                setResolvedContent(resolved);
            } else {
                setResolvedContent(undefined); // Let editor use default
            }
            setIsResolving(false);
        };
        resolve();
    }, [initialContent, document.workspaceId, document.id]);

    // This hook is now called ONLY when ConnectedEditor mounts, which happens after data is loaded.
    const editor = useEditorInstance({
        content: resolvedContent,
        waitForContent: true,
        onError: () => {
            setEditorError('The document content is invalid or corrupted.');
        }
    });

    const handleSave = useCallback(async (isImmediateSave = false) => {
        if (!editor || !isAuthenticated) {
            return { success: false, error: null };
        }

        setSaveStatus('saving');

        try {
            // Save content
            const rawContent = editor.getJSON();
            const contentToSave = processContentForSave(rawContent);

            await updateDocumentContent(currentDocument.id, contentToSave);

            setSaveStatus('saved');
            if (!isImmediateSave) {
                // setSnackbarOpen(true);
            }

            // Broadcast document update so lists (size/modified) refresh
            broadcastSync({
                type: 'document-updated',
                workspaceId: currentDocument.workspaceId,
                folderId: currentDocument.parentId,
                documentId: currentDocument.id,
                data: { source: 'content-save' }
            });

            return { success: true, error: null };
        } catch (err) {
            console.error(err);
            setSaveStatus('unsaved');
            return { success: false, error: err };
        }
    }, [editor, currentDocument, isAuthenticated]);

    const handleTitleSave = useCallback(async (newTitle: string) => {
        if (!isAuthenticated || !newTitle.trim()) {
            return;
        }

        setSaveStatus('saving');

        try {
            await renameFileSystemEntry(currentDocument.id, newTitle);
            setCurrentDocument({ ...currentDocument, name: newTitle });
            setSaveStatus('saved');

            // Broadcast document update to other tabs
            broadcastSync({
                type: 'document-updated',
                workspaceId: currentDocument.workspaceId,
                folderId: currentDocument.parentId,
                documentId: currentDocument.id,
                data: { title: newTitle }
            });
        } catch (err) {
            console.error(err);
            setSaveStatus('unsaved');
        }
    }, [currentDocument, isAuthenticated]);

    const debouncedSave = useDebouncedCallback(() => handleSave(false), 2000);
    const debouncedTitleSave = useDebouncedCallback(handleTitleSave, 2000);

    const handleContentChange = () => {
        setSaveStatus('unsaved');
        debouncedSave();
    };

    const handleTitleChange = (newTitle: string) => {
        setSaveStatus('unsaved');
        debouncedTitleSave(newTitle);
    };

    const handleClose = async () => {
        // If already saved, close immediately
        if (saveStatus === 'saved') {
            window.close();
            return;
        }

        // If unsaved or saving, start close flow
        setCloseFlowState('saving');

        // Trigger immediate save
        const result = await handleSave(true);

        if (result.success) {
            setCloseFlowState('success');
        } else {
            setCloseFlowState('error');
        }
    };

    const handleCloseNow = () => {
        window.close();
    };

    const handleCloseDismiss = () => {
        setCloseFlowState(null);
    };

    // Auto-close timer after successful save
    useEffect(() => {
        if (closeFlowState === 'success') {
            const timer = setTimeout(() => {
                window.close();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [closeFlowState]);

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

    if (isResolving) {
        return (
            <Box sx={{ height: '100dvh', minHeight: '100dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Extract initial width from content to prevent layout shift
    const getInitialWidth = () => {
        if (!initialContent) return '950px';
        try {
            // content is Tiptap JSON
            const content = initialContent as any;
            return content.attrs?.['x-odocs-layoutWidth'] || '950px';
        } catch (e) {
            return '950px';
        }
    };

    const initialWidth = getInitialWidth();

    return (
        <>
            <EditorLayout
                editor={editor}
                document={currentDocument}
                onContentChange={handleContentChange}
                onTitleChange={handleTitleChange}
                onClose={handleClose}
                saveStatus={saveStatus}
                initialWidth={initialWidth}
            />

            <CloseOverlay
                open={closeFlowState !== null}
                state={closeFlowState || 'saving'}
                onCloseNow={handleCloseNow}
                onDismiss={handleCloseDismiss}
            />
        </>
    );
};

export default ConnectedEditor;
