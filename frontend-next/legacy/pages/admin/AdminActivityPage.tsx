'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { Activity, Filter, Monitor, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { getAdminActivity, type ActivityLog } from '../../services/adminService';
import {
  AdminEmptyState, AdminErrorState, AdminLoading, AdminPageHeader, AdminPagination,
  AdminPanel, AdminStatusBadge, formatAdminDate,
} from '../../components/admin/AdminUI';

export default function AdminActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [module, setModule] = useState(searchParams.get('module') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const adminId = searchParams.get('admin') || undefined;
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminActivity({ page, page_size: 25, search, module: module || undefined, admin: adminId });
      setActivity(result.results);
      setCount(result.count);
      const next = new URLSearchParams();
      if (adminId) next.set('admin', adminId);
      if (search) next.set('search', search);
      if (module) next.set('module', module);
      if (page > 1) next.set('page', String(page));
      setSearchParams(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activity logs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [adminId, module, page, search, setSearchParams]);

  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => { setPage(1); }, [search, module]);

  if (loading && !activity.length) return <AdminLoading label="Loading protected activity logâ€¦" />;
  if (error && !activity.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Security & accountability"
        title="Activity logs"
        description="A traceable record of sensitive administrative actions, affected records, devices and outcomes."
        actions={<button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>}
      />
      {adminId && <div className="admin-filter-notice"><ShieldCheck /> Showing activity for the selected administrative account.<button type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.delete('admin'); setSearchParams(next); }}>Clear account filter</button></div>}
      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search administrator, action or record" /></div>
          <div className="admin-filter-row"><label><Filter /><select value={module} onChange={(event) => setModule(event.target.value)}><option value="">All modules</option><option value="AUTH">Authentication</option><option value="USERS">Users</option><option value="PROFILES">Profiles</option><option value="PAYMENTS">Payments</option><option value="TICKETS">Tickets</option><option value="ADMINS">Administrators</option><option value="SETTINGS">Settings</option></select></label></div>
        </div>
        {error && <div className="admin-inline-error">{error}</div>}
        {activity.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-activity-table">
              <thead><tr><th>Administrator</th><th>Action</th><th>Module / record</th><th>Outcome</th><th>IP & device</th><th>Date & time</th></tr></thead>
              <tbody>{activity.map((item) => (
                <tr key={item.id}>
                  <td data-label="Administrator"><div className="admin-member-cell"><span className="admin-list-avatar activity"><Activity /></span><p><strong>{item.admin_name}</strong><small>{item.admin_email || item.role.replaceAll('_', ' ')}</small></p></div></td>
                  <td data-label="Action"><p className="admin-cell-stack"><strong>{item.action.replaceAll('_', ' ')}</strong><small>{item.description || 'Administrative action recorded'}</small></p></td>
                  <td data-label="Module / record"><p className="admin-cell-stack"><strong>{item.module.replaceAll('_', ' ')}</strong><small>{item.record_id ? `Record ${item.record_id}` : 'No record reference'}</small></p></td>
                  <td data-label="Outcome"><AdminStatusBadge status={item.was_successful ? 'Successful' : 'Failed'} /></td>
                  <td data-label="IP & device"><div className="admin-device-cell"><Monitor /><p><strong>{item.ip_address || 'Unknown IP'}</strong><small title={item.user_agent}>{summariseDevice(item.user_agent)}</small></p></div></td>
                  <td data-label="Date & time"><span className="admin-muted-cell">{formatAdminDate(item.created_at, true)}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <AdminEmptyState title="No activity found" description="No audit events match the selected filters." />}
        <AdminPagination page={page} count={count} pageSize={25} onPageChange={setPage} />
      </AdminPanel>
    </>
  );
}

function summariseDevice(userAgent?: string) {
  if (!userAgent) return 'Device unavailable';
  if (userAgent.includes('Mobile')) return 'Mobile browser';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg/')) return 'Microsoft Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  return userAgent.slice(0, 48);
}

