'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit3, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminModal, AdminPageHeader, AdminPagination, AdminPanel, AdminToast,
  formatAdminDate,
} from '../../components/admin/AdminUI';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  date: string;
}

interface Paginated<T> {
  count: number; page: number; page_size: number; num_pages: number; results: T[];
}

const getBlogs = (p = 1, s = '') =>
  fetchApi<Paginated<BlogPost>>(`/admin/blogs/?page=${p}&page_size=20${s ? `&search=${encodeURIComponent(s)}` : ''}`);

const saveBlog = (data: Partial<BlogPost> & { id?: string }) =>
  data.id
    ? fetchApi<BlogPost>(`/admin/blogs/${data.id}/`, { method: 'PATCH', body: JSON.stringify(data) })
    : fetchApi<BlogPost>('/admin/blogs/', { method: 'POST', body: JSON.stringify(data) });

const deleteBlog = (id: string) =>
  fetchApi<void>(`/admin/blogs/${id}/`, { method: 'DELETE' });

const emptyForm = { title: '', excerpt: '', author: '', category: 'General', date: '' };

export default function AdminBlogsPage() {
  const [items, setItems] = useState<BlogPost[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getBlogs(page, search);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blog posts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, date: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }); setFormOpen(true); };
  const openEdit = (item: BlogPost) => { setEditing(item); setForm({ title: item.title, excerpt: item.excerpt, author: item.author, category: item.category, date: item.date }); setFormOpen(true); };

  const handleSave = async () => {
    setBusy(true);
    try {
      const saved = await saveBlog(editing ? { ...form, id: editing.id } : form);
      if (editing) setItems((rows) => rows.map((r) => r.id === saved.id ? saved : r));
      else { setItems((rows) => [saved, ...rows]); setCount((c) => c + 1); }
      setToast({ message: `"${saved.title}" ${editing ? 'updated' : 'created'}.`, tone: 'success' });
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
      await deleteBlog(deleteTarget.id);
      setItems((rows) => rows.filter((r) => r.id !== deleteTarget.id));
      setCount((c) => Math.max(0, c - 1));
      setToast({ message: `"${deleteTarget.title}" deleted.`, tone: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !items.length) return <AdminLoading label="Loading blog postsâ€¦" />;
  if (error && !items.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Blogs"
        description="Create and manage editorial blog content featured on the platform."
        actions={(
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}><Plus /> New post</button>
          </div>
        )}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search blog postsâ€¦" /></div>
        </div>
        {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}

        {items.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Title</th><th>Author</th><th>Category</th><th>Date</th>
                <th className="admin-table-actions-heading">Actions</th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Title"><strong>{item.title}</strong><br /><small style={{ color: 'var(--admin-muted)' }}>{item.excerpt?.slice(0, 60)}â€¦</small></td>
                    <td data-label="Author"><span className="admin-muted-cell">{item.author}</span></td>
                    <td data-label="Category"><span className="admin-status admin-status-info">{item.category}</span></td>
                    <td data-label="Date"><span className="admin-muted-cell">{item.date}</span></td>
                    <td className="admin-row-actions" data-label="Actions">
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="admin-icon-btn" onClick={() => openEdit(item)}><Edit3 /></button>
                        <button type="button" className="admin-icon-btn" style={{ color: 'var(--admin-danger)' }} onClick={() => setDeleteTarget(item)}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="No blog posts" description="Create the first blog post to be featured on the website." action={<button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}><Plus /> New post</button>} />
        )}
        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>

      <AdminModal open={formOpen} title={editing ? 'Edit blog post' : 'Create blog post'} onClose={() => setFormOpen(false)}>
        <div className="admin-form-body">
          {[
            ['title', 'Title *', 'text', { placeholder: 'Blog post title' }],
            ['excerpt', 'Excerpt *', 'textarea', { placeholder: 'Short summaryâ€¦', rows: 3 }],
            ['author', 'Author *', 'text', { placeholder: 'Author name' }],
            ['category', 'Category', 'text', { placeholder: 'e.g., Relationships, Tips' }],
            ['date', 'Date', 'text', { placeholder: 'e.g., July 2024' }],
          ].map(([key, label, type, opts]: any) => (
            <label className="admin-form-field" key={key}>
              <span>{label}</span>
              {type === 'textarea'
                ? <textarea value={(form as any)[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} {...opts} />
                : <input type={type} value={(form as any)[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} {...opts} />}
            </label>
          ))}
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={busy || !form.title || !form.excerpt || !form.author}>
              {busy ? <LoaderCircle className="admin-spinner" /> : null} {editing ? 'Save changes' : 'Create post'}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this blog post?"
        description={`"${deleteTarget?.title}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete post"
        dangerous
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
