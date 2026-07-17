'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { supportService, type Notification } from '../services/supportService';

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await supportService.getNotifications(page); setRows(data.results); setCount(data.count); }
    catch (err) { setError(err instanceof Error ? err.message : 'Notifications could not be loaded.'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  const markRead = async (row: Notification) => {
    if (row.is_read) return;
    await supportService.markNotificationRead(row.id);
    setRows((items) => items.map((item) => item.id === row.id ? { ...item, is_read: true } : item));
  };
  const markAll = async () => { await supportService.markAllNotificationsRead(); setRows((items) => items.map((item) => ({ ...item, is_read: true }))); };
  return <main className="min-h-screen pt-24 pb-16"><div className="max-w-4xl mx-auto px-4">
    <div className="flex justify-between gap-4 items-center mb-6"><div><h1 className="text-2xl font-extrabold">Notifications</h1><p className="text-sm text-gray-500">Account, support, and membership updates.</p></div><div className="flex gap-2"><button type="button" onClick={load} className="btn-outline flex gap-2"><RefreshCw className="w-4" />Refresh</button><button type="button" onClick={markAll} className="btn-primary flex gap-2"><CheckCheck className="w-4" />Mark all read</button></div></div>
    {error && <div className="bg-red-50 text-red-800 p-4 rounded-xl">{error}</div>}
    {loading && !rows.length ? <p>Loading notificationsâ€¦</p> : <div className="space-y-3">{rows.map((row) => <button type="button" key={row.id} onClick={() => markRead(row)} className={`w-full text-left rounded-2xl border p-5 flex gap-4 ${row.is_read ? 'bg-white' : 'bg-[var(--theme-primary-50)] border-[var(--theme-primary-200)]'}`}><Bell className="w-5 shrink-0" /><span><strong className="block">{row.title}</strong><span className="text-sm text-gray-600">{row.message}</span><small className="block mt-2 text-gray-400">{new Date(row.created_at).toLocaleString()}</small></span></button>)}{!rows.length && <p className="text-gray-500">You have no notifications.</p>}</div>}
    {count > 15 && <div className="flex justify-between mt-6"><button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-outline">Previous</button><span>Page {page}</span><button type="button" disabled={page * 15 >= count} onClick={() => setPage((p) => p + 1)} className="btn-outline">Next</button></div>}
  </div></main>;
}
