'use client';

import { useState, useEffect } from 'react';
import { useGetSupportDashboardQuery } from '../../services/customerSupportApi';
import {
  ListTodo, Clock, AlertTriangle, ShieldCheck, CheckCircle, RefreshCw, Star
} from 'lucide-react';
import {
  AdminPageHeader, AdminPanel, AdminEmptyState, AdminLoading, AdminErrorState, formatAdminDate, AdminStatusBadge, AdminSkeleton
} from '../../components/admin/AdminUI';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

export default function CustomerSupportDashboardPage() {
  const { data, error, isLoading, refetch, isFetching } = useGetSupportDashboardQuery(undefined, {
    pollingInterval: 60000,
  });
  const [syncTime, setSyncTime] = useState<string>('');

  useRealtimeRefresh({
    eventTypes: [
      'support.ticket_created',
      'support.ticket_assigned',
      'support.ticket_claimed',
      'support.ticket_replied',
      'support.ticket_status_changed',
      'support.ticket_priority_changed',
      'support.ticket_resolved',
      'support.ticket_reopened',
      'complaint.created',
      'complaint.resolved',
      'contact.created',
      'contact.replied',
    ],
    refresh: refetch,
    debounceMs: 400,
  });

  useEffect(() => {
    setSyncTime(new Date().toLocaleTimeString());
  }, [data]);

  if (isLoading) {
    return (
      <>
        <AdminPageHeader
          eyebrow="Customer support workspace"
          title="Support Dashboard"
          description="Preparing secure customer support metrics..."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} style={{ background: 'var(--admin-surface, #f9fafb)', border: '1px solid var(--admin-line, rgba(0,0,0,0.08))', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="admin-skeleton-shimmer" style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e5e7eb', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="admin-skeleton-shimmer" style={{ width: '55%', height: '22px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '0.25rem' }} />
                <div className="admin-skeleton-shimmer" style={{ width: '80%', height: '12px', background: '#f3f4f6', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
        <AdminSkeleton type="table" rows={4} />
      </>
    );
  }
  if (error) return <AdminErrorState message="Could not load your support dashboard." onRetry={refetch} />;

  const summary = data?.summary || {
    assigned: 0,
    in_progress: 0,
    urgent: 0,
    overdue: 0,
    waiting_for_member: 0,
    escalated: 0,
    resolved_today: 0
  };

  const statCards = [
    { label: 'Assigned Tickets', value: summary.assigned, icon: ListTodo, color: 'var(--color-primary, #6366f1)' },
    { label: 'In Progress', value: summary.in_progress, icon: Clock, color: 'var(--color-info, #3b82f6)' },
    { label: 'Urgent Tickets', value: summary.urgent, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Overdue SLA', value: summary.overdue, icon: AlertTriangle, color: 'var(--color-danger, #dc2626)' },
    { label: 'Waiting for Member', value: summary.waiting_for_member, icon: Star, color: 'var(--color-warning, #f59e0b)' },
    { label: 'Escalated', value: summary.escalated, icon: ShieldCheck, color: 'var(--color-warning, #d97706)' },
    { label: 'Resolved Today', value: summary.resolved_today, icon: CheckCircle, color: 'var(--color-success, #10b981)' },
  ];

  const tickets = data?.recent_tickets || [];
  const hasTickets = tickets.length > 0;

  return (
    <>
      <AdminPageHeader
        eyebrow="Customer support workspace"
        title="Support Dashboard"
        description="Monitor assigned tickets, response metrics, and resolve user enquiries."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {syncTime && <small style={{ color: 'var(--color-muted, #9ca3af)' }}>Synced: {syncTime}</small>}
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={16} className={isFetching ? 'admin-spinner' : ''} /> Refresh
            </button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{
          flexGrow: 1,
          background: 'var(--admin-surface, #f9fafb)',
          border: '1px solid var(--admin-line, rgba(0,0,0,0.08))',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: 'var(--admin-shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
          minWidth: '240px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #6b7280)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Average First Response
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0.5rem 0 0.25rem', color: 'var(--admin-text, #111827)' }}>
            {data?.average_first_response_minutes !== null && data?.average_first_response_minutes !== undefined
              ? `${data.average_first_response_minutes}m`
              : 'N/A'}
          </h2>
          <small style={{ color: 'var(--admin-text-muted, #9ca3af)' }}>Operational SLA target: &lt; 30 mins</small>
        </div>

        {data?.unread_notifications && data.unread_notifications > 0 ? (
          <div style={{
            flexGrow: 2,
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '12px',
            padding: '1.25rem',
            color: 'var(--color-primary, #6366f1)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontWeight: '700' }}>Workspace Announcements</h4>
              You have {data.unread_notifications} unread notification{data.unread_notifications !== 1 ? 's' : ''} waiting in your inbox.
            </div>
          </div>
        ) : null}
      </div>

      {/* Grid count cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: 'var(--admin-surface, #f9fafb)',
            border: '1px solid var(--admin-line, rgba(0, 0, 0, 0.08))',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--admin-shadow-sm, 0 1px 2px rgba(0,0,0,0.05))'
          }}>
            <div style={{ background: `${color}15`, padding: '0.5rem', borderRadius: '8px' }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--admin-text, #111827)' }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #6b7280)', fontWeight: '500' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent tickets list */}
      <AdminPanel title="Assigned Customer Support Tickets" subtitle="Live response queue">
        {!hasTickets ? (
          <AdminEmptyState
            title="No tickets assigned"
            description="Tickets assigned by an Admin or claimed from an allowed queue will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tickets.map((t) => (
              <div key={t.id} style={{
                background: 'var(--admin-surface, #fff)',
                border: '1px solid var(--admin-line, rgba(0,0,0,0.08))',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #9ca3af)', fontWeight: '600' }}>
                    {t.ticket_number}
                  </span>
                  <h4 style={{ margin: '0.15rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--admin-text, #111827)' }}>
                    {t.subject}
                  </h4>
                  <small style={{ color: 'var(--admin-text-muted, #6b7280)' }}>
                    Member: {t.member_name || 'Anonymous'} Â· Category: {t.category_display || t.category}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: '600' }}>
                    {t.priority}
                  </span>
                  <AdminStatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      {/* CS Personal Activity History */}
      {data?.recent_activity && data.recent_activity.length > 0 && (
        <AdminPanel title="Your Activity History" className="mt-6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.recent_activity.map((act) => (
              <div key={act.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px dashed var(--admin-line, rgba(0,0,0,0.05))',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--admin-text, #111827)' }}>{act.description || act.action}</span>
                <span style={{ color: 'var(--admin-text-muted, #9ca3af)' }}>
                  {new Date(act.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}
    </>
  );
}
