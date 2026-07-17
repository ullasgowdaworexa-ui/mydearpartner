'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { publicEnv } from '@/config/env';
import { getFreshAccessToken } from '@/legacy/services/apiClient';

type SocketState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

function websocketOrigin(baseUrl: string) {
  return baseUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:').replace(/\/$/, '');
}

export function useChatSocket({ partnerId, enabled, onMessage }: {
  partnerId?: string | null;
  enabled: boolean;
  onMessage: (payload: any) => void | Promise<void>;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlerRef = useRef(onMessage);
  const [state, setState] = useState<SocketState>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !partnerId) {
      socketRef.current?.close();
      socketRef.current = null;
      setState('idle');
      setError('');
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;

    const connect = async () => {
      setState('connecting');
      setError('');
      try {
        const accessToken = await getFreshAccessToken();
        if (disposed) return;

        const url = `${websocketOrigin(publicEnv.wsBaseUrl)}/ws/chat/${encodeURIComponent(partnerId)}/`;
        socket = new WebSocket(url, ['access_token', accessToken]);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!disposed) setState('open');
        };
        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            void messageHandlerRef.current(payload);
          } catch {
            // Ignore malformed real-time events. HTTP history remains the
            // source of truth and is used as a fallback by the messages page.
          }
        };
        socket.onerror = () => {
          if (!disposed) {
            setState('error');
            setError('Real-time chat is unavailable; using message sync instead.');
          }
        };
        socket.onclose = (event) => {
          if (!disposed) {
            setState('closed');
            if (event.code && event.code !== 1000) {
              setError('Real-time chat disconnected; using message sync instead.');
            }
          }
        };
      } catch {
        if (!disposed) {
          setState('error');
          setError('Real-time chat is unavailable; using message sync instead.');
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'Conversation changed');
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [enabled, partnerId]);

  const send = useCallback((payload: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  return {
    state,
    error,
    connected: state === 'open',
    send,
  };
}
