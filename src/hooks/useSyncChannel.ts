import { useEffect, useRef } from 'react';
import { SYNC_CHANNEL_NAME, type SyncEvent } from '../lib/syncEvents';

type SyncEventHandler = (event: SyncEvent) => void;

export const useSyncChannel = (onMessage: SyncEventHandler): void => {
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') {
            console.warn('BroadcastChannel not supported');
            return;
        }

        const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent<SyncEvent>) => {
            onMessage(event.data);
        };

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [onMessage]);
};
