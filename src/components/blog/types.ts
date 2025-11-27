import type { MembershipSummary, DocumentSummary } from '../../lib/api';

export interface BlogThemeProps {
    profile: MembershipSummary;
    documents: DocumentSummary[];
    onDocumentClick: (doc: DocumentSummary) => void;
}
