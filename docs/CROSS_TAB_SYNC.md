# Cross-Tab Synchronization

This document describes the real-time synchronization mechanism used to keep multiple browser tabs in sync.

## Overview

The application uses the **BroadcastChannel API** to enable real-time communication between browser tabs. When a user makes changes in one tab (e.g., creating a document, renaming a folder), other tabs viewing the same workspace/folder are automatically updated.

## Architecture

### Core Components

1. **`src/lib/syncEvents.ts`** - Event type definitions and broadcast helper
2. **`src/hooks/useSyncChannel.ts`** - Reusable React hook for listening to sync events
3. **Event Broadcasters** - Components that send sync events when changes occur
4. **Event Listeners** - Components that receive sync events and update their UI

### Event Types

```typescript
type SyncEventType = 
  | 'document-created'
  | 'document-updated'
  | 'document-deleted'
  | 'folder-created'
  | 'folder-renamed';
```

### Event Structure

```typescript
interface SyncEvent {
  type: SyncEventType;
  workspaceId: string;
  folderId?: string | null;
  documentId?: string;
  data?: any;
}
```

## How It Works

### Broadcasting Events

When a change occurs, call `broadcastSync()` with event details:

```typescript
import { broadcastSync } from '../lib/syncEvents';

// After successful operation
broadcastSync({
  type: 'document-created',
  workspaceId: 'workspace-123',
  folderId: 'folder-456', // or null for root
  documentId: 'doc-789',
  data: { title: 'New Document' }
});
```

### Listening for Events

Use the `useSyncChannel` hook to listen for events:

```typescript
import { useSyncChannel } from '../hooks/useSyncChannel';

useSyncChannel(useCallback((event) => {
  // Filter by workspace/folder
  if (event.workspaceId !== currentWorkspaceId) return;
  if (event.folderId !== currentFolderId) return;

  // Handle relevant events
  if (event.type === 'document-created') {
    refreshDocumentList();
  }
}, [currentWorkspaceId, currentFolderId, refreshDocumentList]));
```

## Current Implementation

### Event Broadcasters

| Location | Events | When |
|----------|--------|------|
| `ConnectedEditor.tsx` | `document-updated` | After successful title save |
| `WorkspacePage.tsx` | `document-created` | After creating new document |
| `WorkspacePage.tsx` | `document-deleted` | After deleting document |
| `WorkspacePage.tsx` | `folder-created` | After creating new folder |
| `WorkspacePage.tsx` | `folder-renamed` | After renaming folder |

### Event Listeners

| Location | Listens For | Action |
|----------|-------------|--------|
| `WorkspacePage.tsx` | All events | Refresh if `workspaceId` and `folderId` match |
| `WorkspaceDashboardPage.tsx` | Document events | Refresh recent documents list |

## Adding New Sync Events

When implementing new features that modify data, follow these steps:

### 1. Define Event Type (if needed)

Add new event type to `src/lib/syncEvents.ts`:

```typescript
export type SyncEventType = 
  | 'document-created'
  | 'document-moved'  // NEW
  | ...;
```

### 2. Broadcast Event

After successful operation, call `broadcastSync()`:

```typescript
// Example: Moving a document
const movedDoc = await moveDocument(docId, newFolderId, tokens);

broadcastSync({
  type: 'document-moved',
  workspaceId: movedDoc.workspaceId,
  folderId: newFolderId,
  documentId: docId,
  data: { 
    fromFolderId: oldFolderId,
    toFolderId: newFolderId 
  }
});
```

### 3. Handle Event in Listeners

Update existing listeners or add new ones:

```typescript
useSyncChannel(useCallback((event) => {
  // ... existing filters ...

  if (event.type === 'document-moved') {
    // Refresh if document moved from or to current folder
    if (event.data.fromFolderId === currentFolderId || 
        event.data.toFolderId === currentFolderId) {
      fetchContents();
    }
  }
}, [currentFolderId, fetchContents]));
```

## Best Practices

1. **Always filter events** - Only refresh when the event is relevant to the current view
2. **Include context** - Provide `workspaceId` and `folderId` for proper filtering
3. **Broadcast after success** - Only send events after the operation succeeds
4. **Use useCallback** - Wrap listener functions in `useCallback` to prevent unnecessary re-renders
5. **Keep data minimal** - Only include necessary information in the `data` field

## Browser Compatibility

- **Supported**: Chrome 54+, Firefox 38+, Safari 15.4+, Edge 79+
- **Not Supported**: Internet Explorer
- **Fallback**: The code includes a check for BroadcastChannel support and logs a warning if unavailable

## Limitations

- **Same origin only** - Events only work between tabs from the same domain and port
- **Same channel name** - All tabs must use the same channel name (`workspace-sync`)
- **No persistence** - Events are not stored; only active tabs receive them
- **No guaranteed delivery** - If a tab is busy or frozen, it may miss events

## Future Enhancements

Potential improvements for phase 2:

- `document-moved` - Document moved to different folder
- `folder-deleted` - Folder deletion (with cascade handling)
- `folder-moved` - Folder moved to different parent
- `workspace-updated` - Workspace settings changed
- `permission-changed` - Access permissions modified
- `share-link-created` - Share link generated
