'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchApi } from '@/legacy/services/apiClient';
import { useWindowRealtimeEvent } from './useRealtimeRefresh';

export type PresenceMap = Map<string, boolean>;

/**
 * Targeted presence for the currently visible users only.
 *
 * We never subscribe to a global online/offline firehose. Instead we ask the
 * backend for the status of exactly the profiles on screen (conversation
 * list, search results, matches) via POST /api/v1/presence/bulk/, and then
 * patch the local map when a `presence.changed` event arrives for one of them.
 *
 * The backend only emits `presence.changed` to a user's own personal group, so
 * a member only learns about their own transitions unless the UI explicitly
 * queries the peers it is showing.
 */
export function usePresence(userIds: string[]) {
  const stableIds = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).slice(0, 200).sort(),
    // Re-fetch only when the actual set of ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userIds.join(',')],
  );

  const [presence, setPresence] = useState<PresenceMap>(new Map());
  const presenceRef = useRef<PresenceMap>(presence);
  presenceRef.current = presence;

  const applyStatus = useCallback((id: string, online: boolean) => {
    setPresence((prev) => {
      if (prev.get(id) === online) return prev;
      const next = new Map(prev);
      next.set(id, online);
      return next;
    });
  }, []);

  // Initial / on-change bulk fetch for the visible id set.
  useEffect(() => {
    if (stableIds.length === 0) {
      setPresence(new Map());
      return;
    }
    let cancelled = false;
    fetchApi<Record<string, 'ONLINE' | 'OFFLINE'>>('/presence/bulk/', {
      method: 'POST',
      body: JSON.stringify({ user_ids: stableIds }),
    })
      .then((data) => {
        if (cancelled) return;
        const next = new Map<string, boolean>();
        for (const id of stableIds) {
          next.set(id, data?.[id] === 'ONLINE');
        }
        setPresence(next);
      })
      .catch(() => {
        /* presence is best-effort; ignore failures */
      });
    return () => {
      cancelled = true;
    };
  }, [stableIds]);

  // Live patches from WebSocket presence.changed events.
  useWindowRealtimeEvent((event) => {
    const detail = event.detail as { type?: string; user_id?: string; status?: string };
    if (detail?.type !== 'presence.changed') return;
    const id = detail.user_id;
    if (!id) return;
    applyStatus(id, detail.status === 'ONLINE');
  });

  const isOnline = useCallback((id?: string) => (id ? presenceRef.current.get(id) === true : false), []);

  return { presence, isOnline };
}
