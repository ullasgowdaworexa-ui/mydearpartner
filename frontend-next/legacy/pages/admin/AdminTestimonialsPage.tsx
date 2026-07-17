'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit3, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminModal, AdminPageHeader, AdminPagination, AdminPanel, AdminToast,
} from '../../components/admin/AdminUI';

interface Testimonial { id: string; name: string; text: string; rating: number; plan: string; }

interface Paginated<T> {
  count: number; page: number; page_size: number; num_pages: number; results: T[];
}

const getTestimonials = (p = 1, s = '') =>
  fetchApi<Paginated<Testimonial>>(`/admin/testimonials/?page=${p}&page_size=20${s ? `&search=${encodeURIComponent(s)}` : ''}`);

const saveTestimonial = (data: Partial<Testimonial> & { id?: string }) =>
  data.id
    ? fetchApi<Testimonial>(`/admin/testimonials/${data.id}/`, { method: 'PATCH', body: JSON.stringify(data) })
    : fetchApi<Testimonial>('/admin/testimonials/', { method: 'POST', body: JSON.stringify(data) });

const deleteTestimonial = (id: string) =>
  fetchApi<void>(`/admin/testimonials/${id}/`, { method: 'DELETE' });

const emptyForm = { name: '', text: '', rating: 5, plan: 'Free' };

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTestimonials(page, search);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testimonials could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const handleSave = async () => {
    setBusy(true);
    try {
      const saved = await saveTestimonial(editing ? { ...form, id: editing.id } : form);
      if (editing) setItems((rows) => rows.map((r) => r.id === saved.id ? saved : r));
      else { setItems((rows) => [...rows, saved]); setCount((c) => c + 1); }
      setToast({ message: `Testimonial by "${saved.name}" ${editing ? 'updated' : 'created'}.`, tone: 'success' });
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
      await deleteTestimonial(deleteTarget.id);
      setItems((rows) => rows.filter((r) => r.id !== deleteTarget.id));
      setCount((c) => Math.max(0, c - 1));
      setToast({ message: `Testimonial deleted.`, tone: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !items.length) return <AdminLoading label="Loading testimonialsâ€¦" />;
  if (error && !items.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Testimonials"
        description="Manage member testimonials featured on the public homepage."
        actions={(
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); }}><Plus /> Add testimonial</button>
          </div>
        )}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search testimonialsâ€¦" /></div>
        </div>
        {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}

        {items.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Member</th><th>Testimonial</th><th>Plan</th><th>Rating</th>
                <th className="admin-table-actions-heading">Actions</th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Member"><strong>{item.name}</strong></td>
                    <td data-label="Testimonial"><span style={{ fontSize: '0.875rem', color: 'var(--admin-muted)' }}>{item.text?.slice(0, 80)}â€¦</span></td>
                    <td data-label="Plan"><span className="admin-status admin-status-info">{item.plan}</span></td>
                    <td data-label="Rating"><span>{'â­'.repeat(Math.min(item.rating, 5))}</span></td>
                    <td className="admin-row-actions" data-label="Actions">
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="admin-icon-btn" onClick={() => { setEditing(item); setForm({ name: item.name, text: item.text, rating: item.rating, plan: item.plan }); setFormOpen(true); }}><Edit3 /></button>
                        <button type="button" className="admin-icon-btn" style={{ color: 'var(--admin-danger)' }} onClick={() => setDeleteTarget(item)}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="No testimonials" description="Add the first testimonial to be featured on the homepage." action={<button type="button" className="admin-btn admin-btn-primary" onClick={() => { setEditing(null); setForm({ ...emptyForm }); setFormOpen(true); }}><Plus /> Add testimonial</button>} />
        )}
        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>

      <AdminModal open={formOpen} title={editing ? 'Edit testimonial' : 'Add testimonial'} onClose={() => setFormOpen(false)}>
        <div className="admin-form-body">
          {[
            ['name', 'Member name *', 'text', { placeholder: 'e.g., Rahul Sharma' }],
            ['plan', 'Membership plan', 'text', { placeholder: 'e.g., Premium Gold' }],
          ].map(([key, label, type, opts]: any) => (
            <label className="admin-form-field" key={key}>
              <span>{label}</span>
              <input type={type} value={(form as any)[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} {...opts} />
            </label>
          ))}
          <label className="admin-form-field">
            <span>Testimonial text *</span>
            <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Their experienceâ€¦" rows={4} />
          </label>
          <label className="admin-form-field">
            <span>Rating (1â€“5)</span>
            <input type="number" value={form.rating} min={1} max={5} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} />
          </label>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={busy || !form.name || !form.text}>
              {busy ? <LoaderCircle className="admin-spinner" /> : null} {editing ? 'Save changes' : 'Add testimonial'}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this testimonial?"
        description={`The testimonial by "${deleteTarget?.name}" will be permanently removed.`}
        confirmLabel="Delete testimonial"
        dangerous
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
