'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { publicEnv } from '@/config/env';
import { getFreshAccessToken } from '@/legacy/services/apiClient';

type RealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'unauthorized';

export type RealtimeEvent = {
  type: string;
  entity: string;
  entity_id: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: string;
};

type RealtimeContextValue = {
  status: RealtimeStatus;
  lastEvent: RealtimeEvent | null;
  subscribe: (eventType: string, handler: (event: RealtimeEvent) => void) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'disconnected',
  lastEvent: null,
  subscribe: () => () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manuallyClosedRef = useRef(false);
  const handlersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map());
  const isAuthenticatedRef = useRef(true);
  const connectInstanceRef = useRef(0);

  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const subscribe = useCallback((eventType: string, handler: (event: RealtimeEvent) => void) => {
    const handlers = handlersRef.current;
    if (!handlers.has(eventType)) {
      handlers.set(eventType, new Set());
    }
    handlers.get(eventType)!.add(handler);

    return () => {
      handlers.get(eventType)?.delete(handler);
      if (handlers.get(eventType)?.size === 0) {
        handlers.delete(eventType);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    const instanceId = ++connectInstanceRef.current;
    if (manuallyClosedRef.current) return;
    clearReconnectTimer();

    const token = await getFreshAccessToken().catch(() => null);
    if (!token) {
      setStatus('unauthorized');
      return;
    }

    const existing = socketRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');

    const baseUrl = publicEnv.wsBaseUrl.replace(/\/$/, '');
    const wsBase = baseUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');

    const socket = new WebSocket(`${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setStatus('connected');
    };

    socket.onmessage = (messageEvent) => {
      try {
        const realtimeEvent: RealtimeEvent = JSON.parse(messageEvent.data);
        setLastEvent(realtimeEvent);

        window.dispatchEvent(
          new CustomEvent('realtime-event', { detail: realtimeEvent }),
        );

        const handlers = handlersRef.current;
        const wildcardHandlers = handlers.get('*');
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler(realtimeEvent));
        }

        const typeHandlers = handlers.get(realtimeEvent.type);
        if (typeHandlers) {
          typeHandlers.forEach((handler) => handler(realtimeEvent));
        }
      } catch {
        /* ignore malformed payloads */
      }
    };

    socket.onerror = () => {
      /* onclose will handle reconnection */
    };

    socket.onclose = (closeEvent) => {
      socketRef.current = null;

      if (instanceId !== connectInstanceRef.current) return;

      if (manuallyClosedRef.current) {
        setStatus('disconnected');
        return;
      }

      if (closeEvent.code === 4401 || closeEvent.code === 4403) {
        setStatus('unauthorized');
        return;
      }

      const attempt = reconnectAttemptsRef.current++;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

      setStatus('reconnecting');
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    manuallyClosedRef.current = false;
    isAuthenticatedRef.current = true;
    connect();

    return () => {
      manuallyClosedRef.current = true;
      isAuthenticatedRef.current = false;
      clearReconnectTimer();

      const socket = socketRef.current;
      socketRef.current = null;

      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, 'Provider unmounted');
        }
      }
    };
  }, [connect, clearReconnectTimer]);

  return (
    <RealtimeContext.Provider value={{ status, lastEvent, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}
