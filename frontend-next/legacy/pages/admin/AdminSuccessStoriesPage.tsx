'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit3, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminModal, AdminPageHeader, AdminPagination, AdminPanel, AdminToast,
} from '../../components/admin/AdminUI';

interface SuccessStory {
  id: string;
  couple_names: string;
  story: string;
  date: string;
  location: string;
  rating: number;
  photo?: string | null;
}

interface Paginated<T> {
  count: number; page: number; page_size: number; num_pages: number; results: T[];
}

const getStories = (p = 1, s = '') =>
  fetchApi<Paginated<SuccessStory>>(`/admin/success-stories/?page=${p}&page_size=20${s ? `&search=${encodeURIComponent(s)}` : ''}`);

const saveStory = (data: Partial<SuccessStory> & { id?: string }) =>
  data.id
    ? fetchApi<SuccessStory>(`/admin/success-stories/${data.id}/`, { method: 'PATCH', body: JSON.stringify(data) })
    : fetchApi<SuccessStory>('/admin/success-stories/', { method: 'POST', body: JSON.stringify(data) });

const deleteStory = (id: string) =>
  fetchApi<void>(`/admin/success-stories/${id}/`, { method: 'DELETE' });

const emptyForm = { couple_names: '', story: '', date: '', location: '', rating: 5 };

export default function AdminSuccessStoriesPage() {
  const [items, setItems] = useState<SuccessStory[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SuccessStory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<SuccessStory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStories(page, search);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Success stories could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); };
  const openEdit = (item: SuccessStory) => { setEditing(item); setForm({ couple_names: item.couple_names, story: item.story, date: item.date, location: item.location, rating: item.rating }); setFormOpen(true); };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload = editing ? { ...form, id: editing.id } : form;
      const saved = await saveStory(payload);
      if (editing) setItems((rows) => rows.map((r) => r.id === saved.id ? saved : r));
      else { setItems((rows) => [saved, ...rows]); setCount((c) => c + 1); }
      setToast({ message: `Success story "${saved.couple_names}" ${editing ? 'updated' : 'created'}.`, tone: 'success' });
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
      await deleteStory(deleteTarget.id);
      setItems((rows) => rows.filter((r) => r.id !== deleteTarget.id));
      setCount((c) => Math.max(0, c - 1));
      setToast({ message: `"${deleteTarget.couple_names}" deleted.`, tone: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const field = (key: string, label: string, type = 'text', opts?: object) => (
    <label className="admin-form-field" key={key}>
      <span>{label}</span>
      {type === 'textarea'
        ? <textarea value={(form as any)[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} rows={5} {...opts} />
        : <input type={type} value={(form as any)[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))} {...opts} />}
    </label>
  );

  if (loading && !items.length) return <AdminLoading label="Loading success storiesâ€¦" />;
  if (error && !items.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Success stories"
        description="Curate and manage matrimony success stories featured on the public website."
        actions={(
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}><Plus /> Add story</button>
          </div>
        )}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search couple namesâ€¦" /></div>
        </div>
        {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}

        {items.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Couple</th><th>Location</th><th>Date</th><th>Rating</th>
                <th className="admin-table-actions-heading">Actions</th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Couple"><strong>{item.couple_names}</strong></td>
                    <td data-label="Location"><span className="admin-muted-cell">{item.location}</span></td>
                    <td data-label="Date"><span className="admin-muted-cell">{item.date}</span></td>
                    <td data-label="Rating"><span>{'â­'.repeat(Math.min(item.rating, 5))}</span></td>
                    <td className="admin-row-actions" data-label="Actions">
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="admin-icon-btn" onClick={() => openEdit(item)} aria-label="Edit"><Edit3 /></button>
                        <button type="button" className="admin-icon-btn" style={{ color: 'var(--admin-danger)' }} onClick={() => setDeleteTarget(item)} aria-label="Delete"><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="No success stories" description="Add the first success story to be featured on the website." action={<button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}><Plus /> Add story</button>} />
        )}
        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>

      <AdminModal open={formOpen} title={editing ? 'Edit success story' : 'Add success story'} onClose={() => setFormOpen(false)}>
        <div className="admin-form-body">
          {field('couple_names', 'Couple names *', 'text', { placeholder: 'e.g., Arjun & Priya' })}
          {field('story', 'Story *', 'textarea', { placeholder: 'Their matrimony storyâ€¦' })}
          {field('date', 'Date *', 'text', { placeholder: 'e.g., March 2024' })}
          {field('location', 'Location *', 'text', { placeholder: 'e.g., Mumbai, Maharashtra' })}
          {field('rating', 'Rating (1â€“5)', 'number', { min: 1, max: 5 })}
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={busy || !form.couple_names || !form.story}>
              {busy ? <LoaderCircle className="admin-spinner" /> : null} {editing ? 'Save changes' : 'Add story'}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this success story?"
        description={`"${deleteTarget?.couple_names}" will be permanently removed from the website. This cannot be undone.`}
        confirmLabel="Delete story"
        dangerous
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
