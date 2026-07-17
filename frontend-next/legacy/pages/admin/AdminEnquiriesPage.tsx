'use client';

import { useCallback, useEffect, useState } from 'react';
import { Filter, LoaderCircle, Mail, MapPin, Phone, RefreshCw, Save, Search } from 'lucide-react';
import {
  getAdminEnquiries, updateAdminEnquiry, type ContactEnquiry, type EnquiryStatus,
} from '../../services/adminService';
import {
  AdminEmptyState, AdminErrorState, AdminLoading, AdminPageHeader, AdminPagination,
  AdminPanel, AdminStatusBadge, AdminToast, formatAdminDate,
} from '../../components/admin/AdminUI';

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [selected, setSelected] = useState<ContactEnquiry | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminEnquiries({ page, page_size: 20, search, status: status || undefined });
      setEnquiries(result.results);
      setCount(result.count);
      setSelected((current) => result.results.find((item) => item.id === current?.id) || result.results[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contact enquiries could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => { setNotes(selected?.internal_notes || ''); }, [selected]);

  const patchEnquiry = async (input: { status?: EnquiryStatus; internal_notes?: string }) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await updateAdminEnquiry(selected.id, input);
      setSelected(updated);
      setEnquiries((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      setToast({ message: 'Enquiry updated successfully.', tone: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'The enquiry could not be updated.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !enquiries.length) return <AdminLoading label="Loading contact enquiriesâ€¦" />;
  if (error && !enquiries.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Customer care"
        title="Contact enquiries"
        description="Track incoming questions, add private context and keep every contact moving toward resolution."
        actions={<button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>}
      />
      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or subject" /></div>
          <div className="admin-filter-row"><label><Filter /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="NEW">New</option><option value="PENDING">Pending</option><option value="CONTACTED">Contacted</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label></div>
        </div>
        {error && <div className="admin-inline-error">{error}</div>}
        {enquiries.length ? (
          <div className="admin-enquiry-grid">
            <div className="admin-enquiry-list">
              {enquiries.map((enquiry) => (
                <button type="button" key={enquiry.id} className={selected?.id === enquiry.id ? 'active' : ''} onClick={() => setSelected(enquiry)}>
                  <div><span className="admin-list-avatar">{enquiry.name[0]?.toUpperCase() || '?'}</span><p><strong>{enquiry.name}</strong><small>{enquiry.email}</small></p></div>
                  <h3>{enquiry.subject}</h3>
                  <footer><AdminStatusBadge status={enquiry.status} /><time>{formatAdminDate(enquiry.created_at)}</time></footer>
                </button>
              ))}
              <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
            </div>
            {selected && (
              <article className="admin-enquiry-detail">
                <header><div><p className="admin-eyebrow">Enquiry details</p><h2>{selected.subject}</h2><span>Received {formatAdminDate(selected.created_at, true)}</span></div><AdminStatusBadge status={selected.status} /></header>
                <div className="admin-contact-strip">
                  <a href={`mailto:${selected.email}`}><Mail /><span><small>Email</small>{selected.email}</span></a>
                  {selected.phone && <a href={`tel:${selected.phone}`}><Phone /><span><small>Phone</small>{selected.phone}</span></a>}
                  <div><MapPin /><span><small>Assigned to</small>{selected.assigned_to?.full_name || 'Shared queue'}</span></div>
                </div>
                <div className="admin-enquiry-message"><p>{selected.message}</p></div>
                <label className="admin-form-label">Enquiry status<select value={selected.status} onChange={(event) => patchEnquiry({ status: event.target.value as EnquiryStatus })} disabled={busy}><option value="NEW">New</option><option value="PENDING">Pending</option><option value="CONTACTED">Contacted</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label>
                <label className="admin-form-label">Internal notes<textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add useful context for the next team memberâ€¦" /></label>
                <div className="admin-detail-actions"><button type="button" className="admin-btn admin-btn-primary" disabled={busy || notes === (selected.internal_notes || '')} onClick={() => patchEnquiry({ internal_notes: notes })}>{busy ? <LoaderCircle className="admin-spinner" /> : <Save />}Save notes</button></div>
              </article>
            )}
          </div>
        ) : <AdminEmptyState title="No enquiries found" description="No contact enquiries match the current filters." />}
      </AdminPanel>
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}

