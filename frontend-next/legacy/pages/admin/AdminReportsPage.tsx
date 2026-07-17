'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Filter, LoaderCircle, RefreshCw, Search, TrendingUp, Users, CreditCard, TicketCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi, getAccessToken } from '../../services/apiClient';
import {
  AdminEmptyState, AdminErrorState, AdminLoading, AdminPageHeader, AdminPanel,
  formatAdminDate, formatAdminMoney,
} from '../../components/admin/AdminUI';

interface ReportStats {
  total_users: number;
  active_users: number;
  new_this_month: number;
  premium_users: number;
  total_revenue: string;
  revenue_this_month: string;
  successful_payments: number;
  pending_tickets: number;
  resolved_tickets: number;
  open_complaints: number;
}

const reportTypes = [
  { value: 'users', label: 'User registrations' },
  { value: 'tickets', label: 'Support tickets' },
  { value: 'payments', label: 'Payment transactions' },
];

const dateRanges = [
  { value: '30d', label: 'Last 30 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

export default function AdminReportsPage() {
  const { hasAdminPermission } = useAuth();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('30d');
  const [reportType, setReportType] = useState('users');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi<{ stats: ReportStats }>(`/admin/dashboard/?range=${range}`);
      setStats(data.stats as unknown as ReportStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reports could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!hasAdminPermission('reports.export')) {
      setExportMessage('You do not have permission to export reports.');
      return;
    }
    setExporting(true);
    setExportMessage('');
    try {
      const response = await fetch(`/api/v1/admin/reports/export/?report=${reportType}&format=csv`, {
        headers: { Authorization: `Bearer ${getAccessToken() || ''}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage(`${reportType} report exported successfully.`);
    } catch (err) {
      setExportMessage('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <AdminLoading label="Loading report dataâ€¦" />;
  if (error) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Management"
        title="Reports"
        description="View platform-wide analytics and export detailed reports for operational oversight."
        actions={(
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              {dateRanges.map((dr) => <option key={dr.value} value={dr.value}>{dr.label}</option>)}
            </select>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>
          </div>
        )}
      />

      {stats && (
        <div className="admin-stat-grid">
          <article className="admin-stat-card">
            <span className="admin-stat-icon wine"><Users /></span>
            <div><strong>{(stats.total_users || 0).toLocaleString('en-IN')}</strong><p>Total users</p></div>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon green"><TrendingUp /></span>
            <div><strong>{(stats.new_this_month || 0).toLocaleString('en-IN')}</strong><p>New this month</p></div>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon gold"><CreditCard /></span>
            <div><strong>{formatAdminMoney(stats.total_revenue)}</strong><p>Total revenue</p></div>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon amber"><TicketCheck /></span>
            <div><strong>{(stats.pending_tickets || 0).toLocaleString('en-IN')}</strong><p>Pending tickets</p></div>
          </article>
        </div>
      )}

      <AdminPanel
        title="Export reports"
        subtitle="Download detailed records as CSV for analysis"
        action={(
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {reportTypes.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
            </select>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleExport} disabled={exporting}>
              {exporting ? <LoaderCircle className="admin-spinner" /> : <Download />} Export CSV
            </button>
          </div>
        )}
      >
        {exportMessage && (
          <div className={`admin-inline-${exportMessage.includes('success') ? 'success' : 'error'}`} style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: exportMessage.includes('success') ? 'var(--admin-success-bg)' : 'var(--admin-danger-bg)', color: exportMessage.includes('success') ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
            {exportMessage}
          </div>
        )}
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--admin-bg-subtle)', borderRadius: '0.75rem' }}>
          <p style={{ color: 'var(--admin-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Select a report type above and click <strong>Export CSV</strong> to download a complete data export.
            Exports are permission-controlled and every export is recorded in the activity log.
          </p>
          <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem', color: 'var(--admin-muted)', fontSize: '0.875rem', lineHeight: 2 }}>
            <li><strong>User registrations</strong>: ID, name, email, gender, verification status, join date</li>
            <li><strong>Support tickets</strong>: ticket number, subject, user, priority, status, assignment</li>
            <li><strong>Payment transactions</strong>: ID, user, amount, currency, status, gateway reference</li>
          </ul>
        </div>
      </AdminPanel>
    </>
  );
}
