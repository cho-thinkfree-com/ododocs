import { Alert, CircularProgress, Container } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getLatestRevision, type DocumentRevision, type DocumentSummary } from '../../lib/api';
import ConnectedEditor from './ConnectedEditor';

const EditorPage = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { tokens } = useAuth();
  const [document, setDocument] = useState<DocumentSummary | null>(null);
  const [revision, setRevision] = useState<DocumentRevision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokens && documentId) {
      setLoading(true);
      Promise.all([
        getDocument(documentId, tokens.accessToken),
        getLatestRevision(documentId, tokens.accessToken),
      ])
        .then(([docData, revData]) => {
          setDocument(docData);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <ConnectedEditor
        document={document}
        initialRevision={revision}
      />
    </Container>
  );
};

export default EditorPage;
