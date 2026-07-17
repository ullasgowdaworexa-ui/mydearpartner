'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, LoaderCircle, Megaphone, RefreshCw, Send } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import {
  AdminErrorState, AdminLoading, AdminModal, AdminPageHeader, AdminPanel, AdminToast,
} from '../../components/admin/AdminUI';

interface Notification {
  id: string;
  title: string;
  message: string;
  audience: string;
  priority: string;
  recipient_count: number;
  created_at: string;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setNotifications(await fetchApi<Notification[]>('/admin/notifications/'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendNotification = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setToast({ message: 'Title and message are required.', tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await fetchApi('/admin/notifications/', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          message: form.body,
          audience: form.audience,
          priority: 'NORMAL',
        }),
      });
      setToast({ message: `Notification "${form.title}" sent successfully.`, tone: 'success' });
      setComposeOpen(false);
      setForm({ title: '', body: '', audience: 'all' });
      load();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Notification could not be sent.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AdminLoading label="Loading notificationsâ€¦" />;
  if (error) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Notifications"
        description="Send broadcast announcements to all platform members. All notifications are logged and controlled by the Super Admin."
        actions={(
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setComposeOpen(true)}><Send /> Compose notification</button>
          </div>
        )}
      />

      <AdminPanel title="Sent notifications" subtitle="Recent broadcast announcements recorded in the system">
        {notifications.length ? (
          <div className="admin-compact-list">
            {notifications.map((item) => (
              <div key={item.id}>
                <span className="admin-list-avatar" style={{ background: 'var(--admin-accent-light)' }}>
                  <Bell />
                </span>
                <p>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <small style={{ color: 'var(--admin-muted)' }}>Sent: {new Date(item.created_at).toLocaleString('en-IN')} Â· {item.recipient_count} recipients</small>
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', whiteSpace: 'nowrap' }}>
                  {item.audience}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-muted)' }}>
            <Megaphone style={{ width: 40, height: 40, opacity: 0.4, margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600 }}>No notifications sent yet</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Use the "Compose notification" button to send your first platform announcement.</p>
          </div>
        )}
      </AdminPanel>

      <AdminModal
        open={composeOpen}
        title="Compose notification"
        description="This message will be recorded and broadcast to the selected audience."
        onClose={() => { setComposeOpen(false); setForm({ title: '', body: '', audience: 'all' }); }}
      >
        <div className="admin-form-body">
          <label className="admin-form-field">
            <span>Notification title <span style={{ color: 'var(--admin-danger)' }}>*</span></span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., New features available"
              maxLength={100}
            />
          </label>
          <label className="admin-form-field">
            <span>Message body <span style={{ color: 'var(--admin-danger)' }}>*</span></span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write your announcement hereâ€¦"
              rows={4}
            />
          </label>
          <label className="admin-form-field">
            <span>Audience</span>
            <select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
              <option value="all">All members</option>
              <option value="premium">Premium members only</option>
              <option value="unverified">Unverified members</option>
            </select>
          </label>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => { setComposeOpen(false); setForm({ title: '', body: '', audience: 'all' }); }}>Cancel</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={sendNotification} disabled={busy || !form.title.trim() || !form.body.trim()}>
              {busy ? <LoaderCircle className="admin-spinner" /> : <Send />} Send notification
            </button>
          </div>
        </div>
      </AdminModal>

      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
