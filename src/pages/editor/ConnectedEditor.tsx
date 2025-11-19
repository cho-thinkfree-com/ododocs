import { Snackbar } from '@mui/material';
import { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appendRevision, type DocumentRevision, type DocumentSummary } from '../../lib/api';
import EditorLayout from '../../components/layout/EditorLayout';
import useEditorInstance from '../../editor/useEditorInstance';
import { useDebouncedCallback } from '../../lib/useDebounce';

type ConnectedEditorProps = {
    document: DocumentSummary;
    initialRevision: DocumentRevision | null;
};

const ConnectedEditor = ({ document, initialRevision }: ConnectedEditorProps) => {
    const { tokens } = useAuth();
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // This hook is now called ONLY when ConnectedEditor mounts, which happens after data is loaded.
    const editor = useEditorInstance({ content: initialRevision?.content });

    const handleSave = useCallback(async () => {
        if (!editor || !tokens) {
            return;
        }

        setSaveStatus('saving');

        try {
            // Save content
            const content = editor.getJSON();
            await appendRevision(document.id, tokens.accessToken, { content });

            setSaveStatus('saved');
            setSnackbarOpen(true);
        } catch (err) {
            console.error(err);
            setSaveStatus('unsaved');
        }
    }, [editor, document, tokens]);

    const debouncedSave = useDebouncedCallback(handleSave, 2000);

    const handleContentChange = () => {
        setSaveStatus('unsaved');
        debouncedSave();
    };

    const handleClose = () => {
        window.close();
    };

    return (
        <>
            <EditorLayout
                editor={editor}
                document={document}
                onContentChange={handleContentChange}
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
