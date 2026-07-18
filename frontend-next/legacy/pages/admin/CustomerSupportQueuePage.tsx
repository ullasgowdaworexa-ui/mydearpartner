'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from '@/lib/router-compat';
import {
  useGetAssignedTicketsQuery, useGetTicketDetailsQuery, useReplyToTicketMutation,
  useAddInternalNoteMutation, useUpdateTicketStatusMutation, useEscalateTicketMutation, useResolveTicketMutation
} from '../../services/customerSupportApi';
import { Search, Filter, RefreshCw, LoaderCircle, Inbox, Send } from 'lucide-react';
import {
  AdminPageHeader, AdminPanel, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminStatusBadge, AdminPagination, formatAdminDate
} from '../../components/admin/AdminUI';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

export default function CustomerSupportQueuePage() {
  const navigate = useNavigate();
  const { id: routeTicketId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [overdue, setOverdue] = useState(searchParams.get('overdue') === 'true');
  const [ordering, setOrdering] = useState(searchParams.get('ordering') || '-created_at');

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(routeTicketId || null);

  useEffect(() => { if (routeTicketId) setSelectedTicketId(routeTicketId); }, [routeTicketId]);
  const [replyInput, setReplyInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Mutations
  const [replyToTicket] = useReplyToTicketMutation();
  const [addInternalNote] = useAddInternalNoteMutation();
  const [updateTicketStatus] = useUpdateTicketStatusMutation();
  const [escalateTicket] = useEscalateTicketMutation();
  const [resolveTicket] = useResolveTicketMutation();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status, priority, category, overdue, ordering]);

  const queryParams: any = {
    page,
    page_size: 15,
    ordering,
  };
  if (search) queryParams.search = search;
  if (status) queryParams.status = status;
  if (priority) queryParams.priority = priority;
  if (category) queryParams.category = category;
  if (overdue) queryParams.overdue = true;

  const { data, error, isLoading, refetch, isFetching } = useGetAssignedTicketsQuery(queryParams);
  const { data: ticketDetails, refetch: refetchDetails } = useGetTicketDetailsQuery(selectedTicketId || '', {
    skip: !selectedTicketId,
  });

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
    refresh: useCallback(() => {
      refetch();
      if (selectedTicketId) refetchDetails();
    }, [refetch, refetchDetails, selectedTicketId]),
    debounceMs: 350,
  });

  // Sync URL search params
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (status) next.set('status', status);
    if (priority) next.set('priority', priority);
    if (category) next.set('category', category);
    if (overdue) next.set('overdue', 'true');
    if (ordering !== '-created_at') next.set('ordering', ordering);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [search, status, priority, category, overdue, ordering, page]);

  const handleSendReply = async () => {
    if (!replyInput.trim() || !selectedTicketId) return;
    setBusy(true);
    setActionError('');
    try {
      await replyToTicket({ ticketId: selectedTicketId, message: replyInput }).unwrap();
      setReplyInput('');
      refetchDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to send reply.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!noteInput.trim() || !selectedTicketId) return;
    setBusy(true);
    setActionError('');
    try {
      await addInternalNote({ ticketId: selectedTicketId, message: noteInput }).unwrap();
      setNoteInput('');
      refetchDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to add internal note.');
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicketId) return;
    setBusy(true);
    setActionError('');
    try {
      await updateTicketStatus({ ticketId: selectedTicketId, status: newStatus }).unwrap();
      refetchDetails();
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status.');
    } finally {
      setBusy(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedTicketId) return;
    const reason = window.prompt('Specify escalation reason:');
    if (!reason) return;
    setBusy(true);
    setActionError('');
    try {
      await escalateTicket({ ticketId: selectedTicketId, reason }).unwrap();
      refetchDetails();
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to escalate ticket.');
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicketId) return;
    const ok = window.confirm('Resolve this ticket?');
    if (!ok) return;
    setBusy(true);
    setActionError('');
    try {
      await resolveTicket({ ticketId: selectedTicketId }).unwrap();
      refetchDetails();
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve ticket.');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <AdminLoading label="Loading support tickets..." />;
  if (error) return <AdminErrorState message="Could not load support tickets." onRetry={refetch} />;

  const results = data?.results || [];

  return (
    <>
      <AdminPageHeader
        eyebrow="Customer support workspace"
        title="Support Tickets Queue"
        description="Search, filter, claim and resolve support tickets."
        actions={
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'admin-spinner' : ''} /> Refresh
          </button>
        }
      />

      <AdminPanel className="admin-table-panel">
        {/* Toolbar */}
        <div className="admin-table-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="admin-search-field" style={{ flexGrow: 1, minWidth: '240px' }}>
            <Search />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticket#, member, subject..."
            />
          </div>

          <div className="admin-filter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label><Filter />
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_MEMBER">Waiting for Member</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>

            <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <select value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Sorting">
              <option value="-created_at">Newest First</option>
              <option value="urgency">Urgency First</option>
              <option value="sla">SLA Deadline First</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={overdue}
                onChange={(e) => setOverdue(e.target.checked)}
              />
              Overdue SLA
            </label>
          </div>
        </div>

        {actionError && <div className="admin-inline-error">{actionError}</div>}
        {isFetching && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Syncing queue...</div>}

        {!results.length ? (
          <AdminEmptyState
            title="No tickets assigned"
            description="Tickets assigned by an Admin or claimed from an allowed queue will appear here."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Member</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((ticket) => (
                  <tr key={ticket.id}>
                    <td data-label="Ticket #">
                      <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{ticket.ticket_number}</span>
                    </td>
                    <td data-label="Member">
                      <div style={{ fontWeight: '600', color: 'var(--admin-text, #111827)' }}>{ticket.member_name || 'Anonymous'}</div>
                      {ticket.member_email && <small style={{ color: 'var(--admin-text-muted, #6b7280)' }}>{ticket.member_email}</small>}
                    </td>
                    <td data-label="Subject">{ticket.subject}</td>
                    <td data-label="Category">{ticket.category_display || ticket.category}</td>
                    <td data-label="Priority">
                      <span style={{
                        fontSize: '0.80rem',
                        fontWeight: '700',
                        color: ticket.priority === 'URGENT' ? '#ef4444' : ticket.priority === 'HIGH' ? '#f59e0b' : 'inherit'
                      }}>{ticket.priority}</span>
                    </td>
                    <td data-label="Status">
                      <AdminStatusBadge status={ticket.status} />
                    </td>
                    <td data-label="Created">{formatAdminDate(ticket.created_at)}</td>
                    <td className="admin-row-actions" data-label="Actions">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => { setSelectedTicketId(ticket.id); navigate(`/support/tickets/${ticket.id}`, { preventScrollReset: true }); }}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#3b82f6', border: 'none' }}
                      >
                        Open Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AdminPagination page={page} count={data?.count || 0} pageSize={15} onPageChange={setPage} />
      </AdminPanel>

      {/* Side-out Ticket Details Drawer */}
      {selectedTicketId && ticketDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '580px',
          maxWidth: '100%',
          height: '100vh',
          background: 'var(--admin-dark-modal-bg, #fff)',
          borderLeft: '1px solid var(--admin-line, rgba(0,0,0,0.15))',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }} className="admin-dark-modal">
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--admin-text, #111827)' }}>Ticket detail file</h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--admin-text-muted, #6b7280)' }}>ID: {ticketDetails.ticket_number}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedTicketId(null); navigate('/support/tickets', { replace: true, preventScrollReset: true }); }}
              style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--admin-text-muted, #6b7280)' }}
            >
              Ã—
            </button>
          </div>

          <div style={{ padding: '1.5rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Ticket General Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>Subject: <strong style={{ color: 'var(--admin-text, #111827)' }}>{ticketDetails.subject}</strong></div>
              <div>Priority: <strong>{ticketDetails.priority}</strong></div>
              <div>Status: <AdminStatusBadge status={ticketDetails.status} /></div>
              <div>Category: <strong>{ticketDetails.category_display || ticketDetails.category}</strong></div>
              <div>Description:</div>
              <p style={{ margin: '0.2rem 0', background: 'var(--admin-surface-alt, #f3f4f6)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                {ticketDetails.description}
              </p>
            </div>

            {/* Action buttons */}
            {ticketDetails.status !== 'RESOLVED' && ticketDetails.status !== 'CLOSED' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="admin-btn" style={{ background: '#059669', border: 'none' }} onClick={handleResolve}>
                  Resolve Ticket
                </button>
                <button type="button" className="admin-btn" style={{ background: '#d97706', border: 'none' }} onClick={handleEscalate}>
                  Escalate Ticket
                </button>
                <select
                  value={ticketDetails.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', background: 'transparent', color: 'var(--admin-text, #111827)' }}
                  aria-label="Change Status"
                >
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_MEMBER">Waiting for Member</option>
                </select>
              </div>
            )}

            {/* Public Replies */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem', borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.08))', paddingBottom: '0.25rem' }}>Public Conversation</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '0.5rem' }}>
                {!ticketDetails.replies?.length ? (
                  <small style={{ color: 'var(--admin-text-muted, #9ca3af)' }}>No public replies yet.</small>
                ) : (
                  ticketDetails.replies.map((r: any) => (
                    <div key={r.id} style={{ background: 'var(--admin-surface, #f9fafb)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--admin-text-muted, #6b7280)' }}>
                        <strong>{r.author?.full_name || r.sender?.full_name || 'Sender'}</strong>
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{r.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="Type a public reply to member..."
                  style={{ flexGrow: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', background: 'transparent', color: 'var(--admin-text, #111827)' }}
                />
                <button type="button" className="admin-btn" onClick={handleSendReply} disabled={busy || !replyInput.trim()}>
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem', borderBottom: '1px solid var(--admin-line, rgba(0,0,0,0.08))', paddingBottom: '0.25rem' }}>Internal Office Notes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '0.5rem' }}>
                {!ticketDetails.internal_notes?.length ? (
                  <small style={{ color: 'var(--admin-text-muted, #9ca3af)' }}>No internal notes saved.</small>
                ) : (
                  ticketDetails.internal_notes.map((n: any) => (
                    <div key={n.id} style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--admin-text-muted, #6b7280)' }}>
                        <strong>{n.support_agent?.full_name || n.admin?.full_name || 'Staff'}</strong>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', fontStyle: 'italic' }}>{n.note_text || n.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Type an internal note..."
                  style={{ flexGrow: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--admin-line, rgba(0,0,0,0.15))', background: 'transparent', color: 'var(--admin-text, #111827)' }}
                />
                <button type="button" className="admin-btn admin-btn-secondary" onClick={handleAddInternalNote} disabled={busy || !noteInput.trim()}>
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
