'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Filter, LoaderCircle, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import type { AdminListParams, AdminIdentity } from '../../services/adminService';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminPageHeader, AdminPagination, AdminPanel, AdminStatusBadge,
  AdminToast, formatAdminDate,
} from '../../components/admin/AdminUI';

interface ProfileReport {
  id: string;
  reported_user: AdminIdentity | null;
  reported_by: AdminIdentity | null;
  reason: string;
  details: string;
  status: string;
  reviewed_by: AdminIdentity | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedReports {
  count: number; page: number; page_size: number; num_pages: number; results: ProfileReport[];
}

const getReports = (params: AdminListParams = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null) as [string, string][])
  ).toString();
  return fetchApi<PaginatedReports>(`/admin/reported-profiles/${qs ? `?${qs}` : ''}`);
};

const updateReport = (id: string, data: Record<string, unknown>) =>
  fetchApi<ProfileReport>(`/admin/reported-profiles/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export default function AdminReportedProfilesPage() {
  const [items, setItems] = useState<ProfileReport[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ item: ProfileReport; action: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReports({ page, page_size: 20, search: search || undefined, status: statusFilter || undefined });
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reported profiles could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const runAction = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const status = confirm.action === 'action' ? 'ACTIONED' : 'DISMISSED';
      const updated = await updateReport(confirm.item.id, { status });
      setItems((rows) => rows.map((r) => r.id === updated.id ? updated : r));
      setToast({ message: `Report ${confirm.action === 'action' ? 'actioned' : 'dismissed'} successfully.`, tone: 'success' });
      setConfirm(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Action failed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !items.length) return <AdminLoading label="Loading reported profilesâ€¦" />;
  if (error && !items.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Trust & Safety"
        title="Reported profiles"
        description="Investigate profiles reported by members or flagged by the system. Take action or dismiss false reports."
        actions={<button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reason or reported userâ€¦" /></div>
          <div className="admin-filter-row">
            <label><Filter />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="ACTIONED">Actioned</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="">All</option>
              </select>
            </label>
          </div>
        </div>

        {error && <div className="admin-inline-error">{error}</div>}
        {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}

        {items.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Reported user</th><th>Reason</th><th>Reported by</th>
                <th>Status</th><th>Date</th><th className="admin-table-actions-heading">Actions</th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Reported user">
                      <p className="admin-cell-stack">
                        <strong>{item.reported_user?.full_name || 'Deleted user'}</strong>
                        <small>{item.reported_user?.email || 'N/A'}</small>
                      </p>
                    </td>
                    <td data-label="Reason"><span style={{ fontWeight: 500 }}>{item.reason}</span></td>
                    <td data-label="Reported by"><span className="admin-muted-cell">{item.reported_by?.full_name || 'Anonymous'}</span></td>
                    <td data-label="Status"><AdminStatusBadge status={item.status} /></td>
                    <td data-label="Date"><span className="admin-muted-cell">{formatAdminDate(item.created_at)}</span></td>
                    <td className="admin-row-actions" data-label="Actions">
                      {item.status === 'OPEN' || item.status === 'UNDER_REVIEW' ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button type="button" className="admin-btn admin-btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                            onClick={() => setConfirm({ item, action: 'action' })}>
                            <ShieldAlert /> Action taken
                          </button>
                          <button type="button" className="admin-btn admin-btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                            onClick={() => setConfirm({ item, action: 'dismiss' })}>
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <AdminStatusBadge status={item.status === 'ACTIONED' ? 'Actioned' : 'Dismissed'} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="No reported profiles"
            description="All reports have been reviewed."
            action={<span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-success)' }}><CheckCircle2 /> All clear</span>}
          />
        )}
        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>

      <AdminConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.action === 'action' ? 'Mark action taken?' : 'Dismiss this report?'}
        description={confirm?.action === 'action'
          ? `This will mark the report against ${confirm?.item.reported_user?.full_name || 'this user'} as actioned and record the decision.`
          : `This will dismiss the report as a false positive. No action will be taken against the reported user.`}
        confirmLabel={confirm?.action === 'action' ? 'Mark actioned' : 'Dismiss report'}
        dangerous={confirm?.action === 'action'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={runAction}
      />
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
