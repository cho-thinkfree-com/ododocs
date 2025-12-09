import { API_BASE_URL } from '../lib/env';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
// import { useParams, useLocation } from 'react-router-dom'; // Temporarily removed if unused for simple connection logic

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Use refs to prevent dependency loops if necessary, or simplify
    const socketRef = useRef<Socket | null>(null);

    // Initialize socket connection
    useEffect(() => {
        if (isLoading || !user) {
            // Disconnect if not authenticated or loading
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Prevent duplicate connections if already connected and user didn't change (handled by effect dep)
        if (socketRef.current?.connected) {
            return;
        }

        const serverUrl = API_BASE_URL;
        const newSocket = io(serverUrl, {
            withCredentials: true,
            autoConnect: true,
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error(`Socket connection error: ${err.message}`);
            // console.error('Socket details:', newSocket);
            setIsConnected(false);
        });

        // Cleanup
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
        };
    }, [user, isLoading]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
