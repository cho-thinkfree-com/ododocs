export type SyncEventType =
    | 'document-created'
    | 'document-updated'
    | 'document-deleted'
    | 'folder-created'
    | 'folder-renamed';

export interface SyncEvent {
    type: SyncEventType;
    workspaceId: string;
    folderId?: string | null;
    documentId?: string;
    data?: any;
}

const CHANNEL_NAME = 'workspace-sync';

export const broadcastSync = (event: SyncEvent): void => {
    if (typeof BroadcastChannel === 'undefined') {
        console.warn('BroadcastChannel not supported');
        return;
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
};

export const SYNC_CHANNEL_NAME = CHANNEL_NAME;
