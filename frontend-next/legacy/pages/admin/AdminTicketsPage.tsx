'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from '@/lib/router-compat';
import {
  ArrowRight, CheckCircle2, Filter, LoaderCircle, MessageSquarePlus, Plus,
  RefreshCw, Search, Send, TicketCheck, UserRound, AlertTriangle, Download, PhoneCall, Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi, getAccessToken, extractErrorMessage } from '../../services/apiClient';
import {
  getAdminAssignees, getAdminTickets, replyToAdminTicket, updateAdminTicket,
  getAdminSupportDashboard, createPhoneTicket,
  type AdminIdentity, type SupportTicket, type TicketPriority, type TicketStatus,
  type AdminSupportDashboardData
} from '../../services/adminService';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminModal, AdminPageHeader, AdminPagination, AdminPanel, AdminStatusBadge,
  AdminToast, formatAdminDate,
} from '../../components/admin/AdminUI';
import AdminAssignModal from '../../components/admin/AdminAssignModal';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

export default function AdminTicketsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeTicketId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasAdminPermission } = useAuth();
  
  // RBAC checks
  const canViewAll = hasAdminPermission('tickets.view_all');
  const canAssign = hasAdminPermission('tickets.assign');
  const canReply = hasAdminPermission('tickets.reply');
  const canCreatePhone = false;
  const canViewReports = false;

  const assignedOnly = !canViewAll;

  // States
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [assignees, setAssignees] = useState<AdminIdentity[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [dashboardStats, setDashboardStats] = useState<AdminSupportDashboardData | null>(null);
  
  // Listing & Filter states
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [assignedStaff, setAssignedStaff] = useState(searchParams.get('assigned_staff') || '');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [unassignedOnly, setUnassignedOnly] = useState(searchParams.get('unassigned') === 'true');
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  
  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Reply state
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [replyAttachment, setReplyAttachment] = useState<File | undefined>(undefined);

  // Phone Ticket create modal
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneLookupEmail, setPhoneLookupEmail] = useState('');
  const [phoneLookupPhone, setPhoneLookupPhone] = useState('');
  const [phoneSubject, setPhoneSubject] = useState('');
  const [phoneCategory, setPhoneCategory] = useState('OTHER');
  const [phonePriority, setPhonePriority] = useState('NORMAL');
  const [phoneCallSummary, setPhoneCallSummary] = useState('');
  const [phoneInternalNote, setPhoneInternalNote] = useState('');

  // Sync searchInput when URL search param changes (e.g. from global search)
  useEffect(() => {
    const queryParam = searchParams.get('search') || '';
    if (queryParam !== searchInput) {
      setSearchInput(queryParam);
      setSearch(queryParam);
    }
  }, [searchParams]);

  // Debounce searchInput to search state
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when search/filter variables change
  useEffect(() => {
    setPage(1);
  }, [search, status, priority, category, source, assignedStaff, overdueOnly, unassignedOnly, startDate, endDate]);

  // Dashboard Stats loader
  const loadDashboard = async () => {
    try {
      const stats = await getAdminSupportDashboard();
      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to load support dashboard stats:', err);
    }
  };

  const loadInFlightRef = useRef(false);
  const load = useCallback(async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await getAdminTickets({
        page,
        page_size: 20,
        search,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        source: source || undefined,
        assigned_staff: assignedStaff || undefined,
        overdue: overdueOnly ? 'true' : undefined,
        unassigned: unassignedOnly ? 'true' : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      } as any);

      setTickets(result.results);
      setCount(result.count);
      
      // Auto-select first ticket if none selected
      setSelected((current) => result.results.find((item) => item.id === routeTicketId)
        || result.results.find((item) => item.id === current?.id)
        || result.results[0]
        || null);

      const next = new URLSearchParams();
      if (search) next.set('search', search);
      if (status) next.set('status', status);
      if (priority) next.set('priority', priority);
      if (category) next.set('category', category);
      if (source) next.set('source', source);
      if (assignedStaff) next.set('assigned_staff', assignedStaff);
      if (overdueOnly) next.set('overdue', 'true');
      if (unassignedOnly) next.set('unassigned', 'true');
      if (startDate) next.set('start_date', startDate);
      if (endDate) next.set('end_date', endDate);
      if (page > 1) next.set('page', String(page));
      setSearchParams(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Support tickets could not be loaded.');
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, [page, priority, category, source, assignedStaff, overdueOnly, unassignedOnly, startDate, endDate, search, setSearchParams, status]);

  useEffect(() => {
    load();
  }, [load]);

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
    ],
    refresh: useCallback(() => { load(); }, [load]),
    debounceMs: 350,
  });

  useEffect(() => {
    loadDashboard();
    if (canAssign) {
      getAdminAssignees().then(setAssignees).catch(() => setAssignees([]));
    }
  }, [canAssign]);

  useEffect(() => { setPage(1); }, [search, status, priority, category, source, assignedStaff, overdueOnly, unassignedOnly, startDate, endDate]);

  const updateStatus = async (ticket: SupportTicket, nextStatus: TicketStatus) => {
    setBusy(true);
    try {
      const updated = await updateAdminTicket(ticket.id, { status: nextStatus } as any);
      setTickets((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setToast({ message: `${ticket.ticket_number} moved to ${String(nextStatus).replaceAll('_', ' ').toLowerCase()}.`, tone: 'success' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Ticket status could not be updated.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const updateAssignment = async (ticket: SupportTicket, assignedTo: string | null) => {
    setBusy(true);
    try {
      const updated = await updateAdminTicket(ticket.id, { assigned_to: assignedTo } as any);
      setTickets((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setToast({ message: assignedTo ? `${ticket.ticket_number} was assigned.` : `${ticket.ticket_number} returned to the shared queue.`, tone: 'success' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Ticket assignment could not be updated.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const updatePriority = async (ticket: SupportTicket, nextPriority: TicketPriority) => {
    setBusy(true);
    try {
      const updated = await updateAdminTicket(ticket.id, { priority: nextPriority } as any);
      setTickets((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setToast({ message: `Priority of ${ticket.ticket_number} changed to ${nextPriority}.`, tone: 'success' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Ticket priority could not be updated.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const updateCategory = async (ticket: SupportTicket, nextCategory: string) => {
    setBusy(true);
    try {
      const updated = await updateAdminTicket(ticket.id, { category: nextCategory } as any);
      setTickets((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setToast({ message: `Category of ${ticket.ticket_number} changed to ${nextCategory}.`, tone: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Ticket category could not be updated.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      // If we have an attachment, we will use FormData. Since we hit the same backend, let's parse reply attachment
      let createdReply;
      if (replyAttachment) {
        const formData = new FormData();
        formData.append('message', reply.trim());
        formData.append('is_internal_note', String(internalNote));
        formData.append('attachment', replyAttachment);

        // Fetch api manually with boundary
        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:8000/api/v1';
        const headers = new Headers();
        const accessToken = getAccessToken();
        if (accessToken) {
          headers.set('Authorization', `Bearer ${accessToken}`);
        }
        const endpoint = internalNote 
          ? `/admin/support/tickets/${selected.id}/internal-notes/`
          : `/admin/support/tickets/${selected.id}/replies/`;
        
        const res = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers,
          body: formData
        });

        let apiRes;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            apiRes = await res.json();
          } catch {
            apiRes = await res.text().catch(() => '');
          }
        } else {
          apiRes = await res.text().catch(() => '');
        }

        if (!res.ok) {
          throw new Error(extractErrorMessage(apiRes, res.status));
        }

        const unwrappedData = apiRes && typeof apiRes === 'object' && 'success' in apiRes ? apiRes.data : apiRes;
        createdReply = unwrappedData;
      } else {
        // Normal JSON reply
        const endpoint = internalNote
          ? `/admin/support/tickets/${selected.id}/internal-notes/`
          : `/admin/support/tickets/${selected.id}/replies/`;
        
        const res = await fetchApi<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            message: reply.trim(),
            is_internal_note: internalNote
          })
        });
        createdReply = res;
      }

      const updatedReplies = [...(selected.replies || []), createdReply];
      const updated = {
        ...selected,
        reply_count: selected.reply_count + 1,
        replies: updatedReplies,
        updated_at: createdReply.created_at,
        status: !internalNote ? 'WAITING_FOR_USER' : selected.status
      };
      
      setTickets((rows) => rows.map((item) => item.id === selected.id ? updated : item));
      setSelected(updated);
      setReply('');
      setReplyAttachment(undefined);
      setInternalNote(false);
      setToast({ message: internalNote ? 'Internal note added.' : 'Reply sent to the ticket.', tone: 'success' });
      loadDashboard();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Your reply could not be sent.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const submitPhoneTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phoneSubject.trim() || !phoneCallSummary.trim()) {
      alert('Subject and call summary are required.');
      return;
    }
    setBusy(true);
    try {
      const created = await createPhoneTicket({
        phone: phoneLookupPhone || undefined,
        email: phoneLookupEmail || undefined,
        subject: phoneSubject,
        call_summary: phoneCallSummary,
        category: phoneCategory,
        priority: phonePriority,
        internal_note: phoneInternalNote || undefined
      });

      setTickets((rows) => [created, ...rows]);
      setSelected(created);
      setCount((value) => value + 1);
      
      // Reset form
      setPhoneSubject('');
      setPhoneCallSummary('');
      setPhoneInternalNote('');
      setPhoneLookupEmail('');
      setPhoneLookupPhone('');
      setPhoneModalOpen(false);
      setToast({ message: `Phone ticket ${created.ticket_number} created on behalf of member.`, tone: 'success' });
      loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create phone ticket.');
    } finally {
      setBusy(false);
    }
  };

  // Export report
  const handleExportReports = async () => {
    setError('');
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:8000/api/v1';
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/admin/reports/export/?modules=tickets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) throw new Error('Report export failed.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `support_tickets_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToast({ message: 'Support ticket reports exported successfully.', tone: 'success' });
    } catch (err: any) {
      setError(err.message || 'Failed to export reports.');
    }
  };

  if (loading && !tickets.length) return <AdminLoading label={assignedOnly ? 'Loading your assigned ticketsâ€¦' : 'Loading support queueâ€¦'} />;
  if (error && !tickets.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Customer support triage"
        title={assignedOnly ? 'Assigned tickets' : 'Support tickets queue'}
        description={assignedOnly ? 'A focused queue containing only support work assigned to you.' : 'Triage, assign, reply and monitor support tickets SLAs.'}
        actions={(
          <div className="admin-header-button-row">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>
            {canCreatePhone && (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPhoneModalOpen(true)}>
                <PhoneCall /> Log Phone Ticket
              </button>
            )}
            {canViewReports && (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={handleExportReports}>
                <Download /> Export Reports
              </button>
            )}
          </div>
        )}
      />

      {/* Support Dashboard Stats Banner */}
      {dashboardStats && (
        <div className="admin-stats-row mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="admin-stat-card" style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(43, 16, 29, 0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#8e3d58', fontWeight: 600 }}>NEW TICKETS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2b101d' }}>{dashboardStats.new_tickets}</div>
          </div>
          <div className="admin-stat-card" style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(43, 16, 29, 0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#8e3d58', fontWeight: 600 }}>UNASSIGNED</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2b101d' }}>{dashboardStats.unassigned_tickets}</div>
          </div>
          <div className="admin-stat-card" style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(43, 16, 29, 0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#8e3d58', fontWeight: 600 }}>IN PROGRESS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2b101d' }}>{dashboardStats.in_progress_tickets}</div>
          </div>
          <div className="admin-stat-card" style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(43, 16, 29, 0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#8e3d58', fontWeight: 600 }}>URGENT CRITICAL</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#b71c1c' }}>{dashboardStats.urgent_tickets}</div>
          </div>
          <div className="admin-stat-card" style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(43, 16, 29, 0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#8e3d58', fontWeight: 600 }}>SLA OVERDUE â°</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#b71c1c' }}>{dashboardStats.overdue_tickets}</div>
          </div>
        </div>
      )}

      {/* Advanced Filters Toolbar */}
      <AdminPanel className="admin-table-panel admin-ticket-workspace">
        <div className="admin-table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <div className="admin-search-field" style={{ flexGrow: 1 }}><Search /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by Ticket#, Subject, Member email/phone..." /></div>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(43, 16, 29, 0.15)' }}>
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_USER">Waiting for User</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
            </select>

            <select className="filter-select" value={priority} onChange={(event) => setPriority(event.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(43, 16, 29, 0.15)' }}>
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(43, 16, 29, 0.15)' }}>
              <option value="">All Categories</option>
              <option value="PAYMENT">Payment</option>
              <option value="ACCOUNT">Account settings</option>
              <option value="REPORT_PROFILE">Reported member</option>
              <option value="TECHNICAL">Technical Issue</option>
              <option value="OTHER">General Query</option>
            </select>

            <select className="filter-select" value={source} onChange={(event) => setSource(event.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(43, 16, 29, 0.15)' }}>
              <option value="">All Sources</option>
              <option value="WEB">Web</option>
              <option value="PHONE">Phone log</option>
              <option value="SYSTEM">System alert</option>
            </select>

            {canViewAll && (
              <select className="filter-select" value={assignedStaff} onChange={(event) => setAssignedStaff(event.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(43, 16, 29, 0.15)' }}>
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
                {assignees.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid rgba(43, 16, 29, 0.15)' }} />
              <span>to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid rgba(43, 16, 29, 0.15)' }} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#8e3d58', cursor: 'pointer' }}>
              <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
              â° Overdue SLA only
            </label>
          </div>
        </div>

        {error && <div className="admin-inline-error">{error}</div>}
        
        {tickets.length ? (
          <div className="admin-ticket-grid">
            {/* List panel */}
            <div className="admin-ticket-list">
              {tickets.map((ticket) => (
                <button type="button" key={ticket.id} className={selected?.id === ticket.id ? 'active' : ''} onClick={() => {
                  setSelected(ticket);
                  const root = location.pathname.startsWith('/super-admin') ? '/super-admin/tickets' : '/admin/tickets';
                  navigate(`${root}/${ticket.id}`, { preventScrollReset: true });
                }}>
                  <span className="admin-ticket-priority">
                    <i className={`priority-${String(ticket.priority).toLowerCase()}`} />
                    {ticket.priority}
                  </span>
                  <strong>{ticket.subject}</strong>
                  <small>{ticket.ticket_number} Â· {ticket.user?.full_name || 'System Auto-Report'}</small>
                  <div>
                    <AdminStatusBadge status={ticket.status} />
                    <time>{formatAdminDate(ticket.updated_at, true)}</time>
                  </div>
                  {ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date() && (
                    <span style={{ fontSize: '0.75rem', color: '#b71c1c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <AlertTriangle size={12} /> SLA Missed
                    </span>
                  )}
                </button>
              ))}
              <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
            </div>

            {/* Details panel */}
            {selected && (
              <article className="admin-ticket-detail">
                <header>
                  <div>
                    <p className="admin-eyebrow">{selected.ticket_number} Â· Source: {selected.source}</p>
                    <h2>{selected.subject}</h2>
                    <span>{selected.category} Â· Opened {formatAdminDate(selected.created_at, true)}</span>
                  </div>
                  <AdminStatusBadge status={selected.status} />
                </header>

                {selected.sla_deadline && (
                  <div style={{
                    padding: '12px 16px',
                    background: new Date(selected.sla_deadline) < new Date() ? '#ffe3e3' : '#fff9db',
                    color: new Date(selected.sla_deadline) < new Date() ? '#b71c1c' : '#856404',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>â° SLA Deadline: {formatAdminDate(selected.sla_deadline, true)}</span>
                    {selected.sla_escalated && <span style={{ color: '#b71c1c', fontWeight: 800 }}>ðŸš¨ Escalated</span>}
                  </div>
                )}

                <div className="admin-ticket-people">
                  <div>
                    <span><UserRound /></span>
                    <p>
                      <small>Member Details</small>
                      <strong>{selected.user?.full_name || 'System Alert'}</strong>
                      <em>{selected.user?.email || 'N/A'}</em>
                    </p>
                  </div>
                  <ArrowRight />
                  <div>
                    <span><TicketCheck /></span>
                    <p>
                      <small>Assigned Staff</small>
                      <strong>{selected.assigned_to?.full_name || 'Unassigned'}</strong>
                      <em>{selected.assigned_to?.email || 'Awaiting assignment'}</em>
                    </p>
                  </div>
                </div>

                <div className="admin-ticket-message">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{selected.description || selected.message}</p>
                  {selected.attachment && (
                    <a href={selected.attachment} target="_blank" rel="noreferrer" className="attachment-link" style={{ marginTop: '12px', display: 'inline-flex' }}>
                      ðŸ“Ž Download member attachment
                    </a>
                  )}
                </div>

                {/* Conversation Log replies */}
                {selected.replies?.length ? (
                  <div className="admin-ticket-replies">
                    {selected.replies.map((item) => (
                      <div key={item.id} className={item.is_internal_note ? 'internal' : ''}>
                        <span>{item.is_internal_note ? <MessageSquarePlus /> : <UserRound />}</span>
                        <p>
                          <strong>{item.author?.full_name || (item.is_internal_note ? 'Internal Note' : 'Member')}</strong>
                          <small>{formatAdminDate(item.created_at, true)}</small>
                          {item.message}
                          {item.attachment && (
                            <a href={item.attachment} target="_blank" rel="noreferrer" className="attachment-link" style={{ marginTop: '6px', display: 'block', fontSize: '0.8rem', width: 'fit-content' }}>
                              ðŸ“Ž View Attachment
                            </a>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Ticket actions */}
                <div className="admin-ticket-controls" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', padding: '16px', background: '#faf8f5', borderRadius: '12px', marginTop: '20px' }}>
                  {canAssign && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted, #6b7280)', fontWeight: '600' }}>Assignee</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                          {selected.assigned_to?.full_name || 'Unassigned'}
                        </span>
                        <button
                          type="button"
                          className="admin-btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--color-primary, #6366f1)', border: 'none' }}
                          onClick={() => setAssignModalOpen(true)}
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  )}

                  <label>Status
                    <select value={selected.status} disabled={busy} onChange={(event) => updateStatus(selected, event.target.value as TicketStatus)}>
                      <option value="OPEN">Open</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_FOR_USER">Waiting for User</option>
                      <option value="RESOLVED">Resolved (Close)</option>
                      <option value="CLOSED">Closed</option>
                      <option value="REOPENED">Reopened</option>
                    </select>
                  </label>

                  <label>Priority
                    <select value={selected.priority} disabled={busy} onChange={(event) => updatePriority(selected, event.target.value as TicketPriority)}>
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </label>

                  <label>Category
                    <select value={selected.category} disabled={busy} onChange={(event) => updateCategory(selected, event.target.value)}>
                      <option value="PAYMENT">Payment</option>
                      <option value="ACCOUNT">Account Settings</option>
                      <option value="REPORT_PROFILE">Abuse / Report Profile</option>
                      <option value="TECHNICAL">Technical Issue</option>
                      <option value="OTHER">Other Inquiries</option>
                    </select>
                  </label>
                </div>

                {/* Reply section */}
                {canReply && (
                  <form className="admin-reply-form" onSubmit={submitReply}>
                    <label>{internalNote ? 'Internal private note' : 'Reply response to member'}
                      <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder={internalNote ? 'Write a private note for staff/administrators only...' : 'Write your helpful answer to the customer...'} required />
                    </label>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <label className="admin-check" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} /> 
                          Internal note
                        </label>

                        <div className="file-input-wrapper" style={{ display: 'inline-block', position: 'relative' }}>
                          <button type="button" className="file-input-btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                            ðŸ“Ž Attach
                          </button>
                          <input type="file" className="file-input" accept=".jpeg,.jpg,.png,.webp,.pdf" onChange={(e) => setReplyAttachment(e.target.files?.[0])} style={{ position: 'absolute', left: 0, top: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                          {replyAttachment && <span className="selected-file-name" style={{ fontSize: '0.75rem', marginLeft: '6px' }}>{replyAttachment.name}</span>}
                        </div>
                      </div>

                      <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !reply.trim()}>
                        {busy ? <LoaderCircle className="admin-spinner" /> : <Send />}
                        {internalNote ? 'Add note' : 'Send reply'}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            )}
          </div>
        ) : <AdminEmptyState title="No tickets found" description="There is no support work matching the selected filters." action={canCreatePhone ? <button type="button" className="admin-btn admin-btn-primary" onClick={() => setPhoneModalOpen(true)}><Plus /> Log a ticket</button> : undefined} />}
      </AdminPanel>

      {/* Modal to log phone tickets */}
      <AdminModal open={phoneModalOpen} title="Log Call Ticket on behalf of member" description="Log call notes and open a trackable ticket on behalf of a customer." onClose={() => setPhoneModalOpen(false)}>
        <form className="admin-form" onSubmit={submitPhoneTicket}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <label style={{ flex: 1 }}>Member Email Lookup
              <input type="email" placeholder="email@example.com" value={phoneLookupEmail} onChange={e => setPhoneLookupEmail(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>Member Phone Lookup
              <input type="text" placeholder="9876543210" value={phoneLookupPhone} onChange={e => setPhoneLookupPhone(e.target.value)} />
            </label>
          </div>

          <label>Subject / Call Title
            <input value={phoneSubject} onChange={e => setPhoneSubject(e.target.value)} required placeholder="e.g. Member unable to process premium checkout" />
          </label>

          <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0' }}>
            <label>Category
              <select value={phoneCategory} onChange={e => setPhoneCategory(e.target.value)}>
                <option value="PAYMENT">Payment Query</option>
                <option value="ACCOUNT">Account / Settings</option>
                <option value="REPORT_PROFILE">Profile Abuse Report</option>
                <option value="TECHNICAL">Technical Site Issue</option>
                <option value="OTHER">General Inquiry</option>
              </select>
            </label>
            <label>Priority
              <select value={phonePriority} onChange={e => setPhonePriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (SLA: 1 hour)</option>
              </select>
            </label>
          </div>

          <label>Call Summary / Description
            <textarea rows={4} value={phoneCallSummary} onChange={e => setPhoneCallSummary(e.target.value)} required placeholder="Provide a summary of the member conversation..." />
          </label>

          <label style={{ marginTop: '16px' }}>Internal Note (Optional)
            <textarea rows={2} value={phoneInternalNote} onChange={e => setPhoneInternalNote(e.target.value)} placeholder="Add private notes for staff, call verification notes..." />
          </label>

          <div className="admin-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPhoneModalOpen(false)}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
              {busy && <LoaderCircle className="admin-spinner" />} Create ticket
            </button>
          </div>
        </form>
      </AdminModal>

      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      {selected && (
        <AdminAssignModal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          targetId={selected.id}
          assignmentType="TICKET_ASSIGNMENT"
          onSuccess={() => {
            load();
            if (selected) {
              // Reload details
              fetchApi<SupportTicket>(`/admin/support/tickets/${selected.id}/`).then(setSelected).catch(() => {});
            }
          }}
        />
      )}
    </>
  );
}
