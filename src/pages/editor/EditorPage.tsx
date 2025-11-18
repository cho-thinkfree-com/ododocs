import { Alert, Box, CircularProgress, Container, Snackbar, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getLatestRevision, renameDocument, appendRevision, type DocumentSummary, type DocumentRevision } from '../../lib/api';
import EditorLayout from '../../components/layout/EditorLayout';
import useEditorInstance from '../../editor/useEditorInstance';
import { useDebouncedCallback } from '../../lib/useDebounce';

const EditorPage = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { tokens } = useAuth();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentSummary | null>(null);
  const [originalTitle, setOriginalTitle] = useState('');
  const [revision, setRevision] = useState<DocumentRevision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const editor = useEditorInstance({ content: revision?.content });

  const handleSave = useCallback(async () => {
    if (!editor || !document || !tokens || !documentId) {
      return;
    }

    setSaveStatus('saving');
    setError(null);

    try {
      const promises = [];

      // Save title if it has changed
      if (document.title !== originalTitle) {
        promises.push(renameDocument(documentId, tokens.accessToken, { title: document.title }));
      }

      // Save content
      const content = editor.getJSON();
      promises.push(appendRevision(documentId, tokens.accessToken, { content }));

      await Promise.all(promises);

      setOriginalTitle(document.title);
      setSaveStatus('saved');
      setSnackbarOpen(true);
    } catch (err) {
      setError((err as Error).message);
      setSaveStatus('unsaved');
    }
  }, [editor, document, tokens, documentId, originalTitle]);

  const debouncedSave = useDebouncedCallback(handleSave, 2000);

  useEffect(() => {
    if (tokens && documentId) {
      setLoading(true);
      Promise.all([
        getDocument(documentId, tokens.accessToken),
        getLatestRevision(documentId, tokens.accessToken),
      ])
        .then(([docData, revData]) => {
          setDocument(docData);
          setOriginalTitle(docData.title);
          setRevision(revData);
        })
        .catch((err) => {
          setError((err as Error).message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tokens, documentId]);

  const handleTitleChange = (newTitle: string) => {
    if (document) {
      setDocument({ ...document, title: newTitle });
      setSaveStatus('unsaved');
      debouncedSave();
    }
  };

  const handleContentChange = () => {
    setSaveStatus('unsaved');
    debouncedSave();
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!document) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">Document not found.</Alert>
      </Container>
    );
  }

  return (
    <>
      <EditorLayout
        editor={editor}
        document={document}
        onTitleChange={handleTitleChange}
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

export default EditorPage;
