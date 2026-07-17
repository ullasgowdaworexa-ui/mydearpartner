'use client';

import { useCallback, useEffect, useState } from 'react';
import { Filter, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { getAdminActivity, type ActivityLog } from '../../services/adminService';
import {
  AdminEmptyState, AdminErrorState, AdminLoading, AdminPageHeader,
  AdminPagination, AdminPanel, AdminStatusBadge, formatAdminDate,
} from '../../components/admin/AdminUI';

export default function AdminStaffActivityPage() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminActivity({ page, page_size: 20, search: search || undefined, module: module || undefined, role: 'STAFF' });
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Staff activity could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search, module]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, module]);

  if (loading && !items.length) return <AdminLoading label="Loading staff activityâ€¦" />;
  if (error && !items.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Management"
        title="Staff activity"
        description="Monitor recent operational activity performed by your Support Staff team. All actions are immutably recorded."
        actions={<button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff name or actionâ€¦" /></div>
          <div className="admin-filter-row">
            <label><Filter />
              <select value={module} onChange={(e) => setModule(e.target.value)}>
                <option value="">All modules</option>
                <option value="tickets">Tickets</option>
                <option value="enquiries">Enquiries</option>
                <option value="complaints">Complaints</option>
                <option value="users">Users</option>
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
                <th>Staff member</th><th>Action</th><th>Module</th>
                <th>Description</th><th>Result</th><th>Date</th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Staff member">
                      <p className="admin-cell-stack">
                        <strong>{item.admin_name || 'Unknown staff'}</strong>
                        <small>{item.admin_email || 'N/A'}</small>
                      </p>
                    </td>
                    <td data-label="Action"><code style={{ fontSize: '0.75rem', background: 'var(--admin-bg-subtle)', padding: '0.15rem 0.5rem', borderRadius: '0.3rem' }}>{item.action}</code></td>
                    <td data-label="Module"><span className="admin-muted-cell">{item.module}</span></td>
                    <td data-label="Description"><span style={{ fontSize: '0.875rem' }}>{item.description || 'N/A'}</span></td>
                    <td data-label="Result"><AdminStatusBadge status={item.was_successful ? 'Success' : 'Failed'} /></td>
                    <td data-label="Date"><span className="admin-muted-cell">{formatAdminDate(item.created_at, true)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="No staff activity" description="No staff activity found for the selected filter." />
        )}
        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>
    </>
  );
}
