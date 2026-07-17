'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit3, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminModal, AdminPageHeader, AdminPagination, AdminPanel, AdminToast,
} from '../../components/admin/AdminUI';

interface FAQ { id: string; question: string; answer: string; }

interface Paginated<T> {
  count: number; page: number; page_size: number; num_pages: number; results: T[];
}

const getFAQs = (p = 1, s = '') =>
  fetchApi<Paginated<FAQ>>(`/admin/faqs/?page=${p}&page_size=20${s ? `&search=${encodeURIComponent(s)}` : ''}`);

const saveFAQ = (data: Partial<FAQ> & { id?: string }) =>
  data.id
    ? fetchApi<FAQ>(`/admin/faqs/${data.id}/`, { method: 'PATCH', body: JSON.stringify(data) })
    : fetchApi<FAQ>('/admin/faqs/', { method: 'POST', body: JSON.stringify(data) });

const deleteFAQ = (id: string) => fetchApi<void>(`/admin/faqs/${id}/`, { method: 'DELETE' });

const emptyForm = { question: '', answer: '' };

export default function AdminFAQsPage() {
  const [items, setItems] = useState<FAQ[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFAQs(page, search);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FAQs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const handleSave = async () => {
    setBusy(true);
    try {
      const saved = await saveFAQ(editing ? { ...form, id: editing.id } : form);
      if (editing) setItems((rows) => rows.map((r) => r.id === saved.id ? saved : r));
      else { setItems((rows) => [...rows, saved]); setCount((c) => c + 1); }
      setToast({ message: `FAQ ${editing ? 'updated' : 'created'} successfully.`, tone: 'success' });
      setFormOpen(false);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Could not save.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteFAQ(deleteTarget.id);
      setItems((rows) => rows.filter((r) => r.id !== deleteTarget.id));
      setCount((c) => Math.max(0, c - 1));
      setToast({ message: 'FAQ deleted.', tone: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !items.length) return <AdminLoading label="Loading FAQsâ€¦" />;
  if (error && !items.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="FAQs & resources"
        description="Manage frequently asked questions displayed on the public website and support portal."
        actions={(
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); }}><Plus /> Add FAQ</button>
          </div>
        )}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questionsâ€¦" /></div>
        </div>
        {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}

        {items.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ padding: '1rem 1.25rem', background: 'var(--admin-bg-subtle)', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, color: 'var(--admin-accent)', minWidth: 28, fontSize: '0.85rem' }}>Q{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{item.question}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--admin-muted)', lineHeight: 1.5 }}>{item.answer}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  <button type="button" className="admin-icon-btn" onClick={() => { setEditing(item); setForm({ question: item.question, answer: item.answer }); setFormOpen(true); }}><Edit3 /></button>
                  <button type="button" className="admin-icon-btn" style={{ color: 'var(--admin-danger)' }} onClick={() => setDeleteTarget(item)}><Trash2 /></button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '0.5rem' }}>
              {count > 20 && <div className="admin-pagination"><p>Showing {items.length} of {count}</p></div>}
            </div>
          </div>
        ) : (
          <AdminEmptyState title="No FAQs yet" description="Add the first FAQ to help your members." action={<button type="button" className="admin-btn admin-btn-primary" onClick={() => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); }}><Plus /> Add FAQ</button>} />
        )}
      </AdminPanel>

      <AdminModal open={formOpen} title={editing ? 'Edit FAQ' : 'Add FAQ'} onClose={() => setFormOpen(false)}>
        <div className="admin-form-body">
          <label className="admin-form-field">
            <span>Question *</span>
            <input type="text" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="Enter the question" />
          </label>
          <label className="admin-form-field">
            <span>Answer *</span>
            <textarea value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} placeholder="Enter the detailed answerâ€¦" rows={5} />
          </label>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={busy || !form.question || !form.answer}>
              {busy ? <LoaderCircle className="admin-spinner" /> : null} {editing ? 'Save changes' : 'Add FAQ'}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this FAQ?"
        description="This FAQ will be permanently removed from the website."
        confirmLabel="Delete FAQ"
        dangerous
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
