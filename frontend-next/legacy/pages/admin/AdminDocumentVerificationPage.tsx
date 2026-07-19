'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { Filter, LoaderCircle, RefreshCw, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../services/apiClient';
import {
  AdminEmptyState, AdminErrorState, AdminLoading, AdminPageHeader,
  AdminPagination, AdminPanel, AdminStatusBadge, formatAdminDate
} from '../../components/admin/AdminUI';
import AdminAssignModal from '../../components/admin/AdminAssignModal';
import ProtectedDocumentViewer from '@/components/documents/ProtectedDocumentViewer';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

export default function AdminDocumentVerificationPage() {
  const { hasAdminPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [status, setStatus] = useState(searchParams.get('status') || 'PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyVerificationId, setBusyVerificationId] = useState<string | null>(null);
  
  // Assign modal state
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<{ id: string; type: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: String(page),
        page_size: '20',
        verification_type: 'IDENTITY_DOCUMENT'
      };
      if (status) params.status = status;
      
      const data = await fetchApi<any>('/admin/verifications/', { params });
      setVerifications(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document verifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  useRealtimeRefresh({
    eventTypes: [
      'document.uploaded',
      'document.approved',
      'document.rejected',
      'document.changes_requested',
    ],
    refresh: load,
    debounceMs: 300,
  });
  useEffect(() => { setPage(1); }, [status]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set('status', status);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [status, page]);

  const canAssign = hasAdminPermission('verification.assign');
  const canApprove = hasAdminPermission('verification.approve');
  const canReject = hasAdminPermission('verification.reject');

  const review = async (verificationId: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject'
      ? window.prompt('Enter the rejection reason:')?.trim()
      : '';
    if (action === 'reject' && !reason) return;
    if (action === 'approve' && !window.confirm('Approve this document verification?')) return;
    setBusyVerificationId(verificationId);
    setActionError('');
    try {
      await fetchApi(`/admin/verifications/${verificationId}/`, {
        method: 'POST', body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      });
      await load();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'The document verification could not be updated.');
    } finally {
      setBusyVerificationId(null);
    }
  };

  if (loading && !verifications.length) return <AdminLoading label="Loading document verifications queueâ€¦" />;
  if (error && !verifications.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Trust & Safety"
        title="Document verification"
        description="Verify uploaded verification documents. Route document verifications to Staff specialists."
        actions={<button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-filter-row">
            <label><Filter />Status:
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="PENDING">Pending</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="">All statuses</option>
              </select>
            </label>
          </div>
        </div>

        {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}
        {actionError && <div className="admin-inline-error" role="alert">{actionError}</div>}

        {verifications.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Uploaded document</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Current Assignee</th>
                  <th>Submitted At</th>
                  {(canAssign || canApprove || canReject) && <th className="admin-table-actions-heading">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => (
                  <tr key={v.id}>
                    <td data-label="Member">
                      <div className="admin-member-cell">
                        <span className="admin-list-avatar">
                          {(v.member?.full_name || v.member?.email || 'M')[0].toUpperCase()}
                        </span>
                        <p>
                          <strong>{v.member?.full_name || 'Unnamed member'}</strong>
                          <small>{v.member?.email}</small>
                        </p>
                      </div>
                    </td>
                    <td data-label="Uploaded document">
                      {Array.isArray(v.verification_documents) && v.verification_documents.length
                        ? v.verification_documents.map((document: any) => (
                          <div key={document.id}>
                            <strong>{document.document_type}</strong>
                            <small style={{ display: 'block', color: 'var(--admin-text-muted, #9ca3af)' }}>{document.status}</small>
                            <button type="button" onClick={() => setViewDoc({ id: document.id, type: document.document_type })} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--color-primary, #6366f1)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              View document
                            </button>
                          </div>
                        ))
                        : <span style={{ color: 'var(--admin-text-muted, #9ca3af)' }}>Document details unavailable</span>}
                    </td>
                    <td data-label="Priority">{v.priority}</td>
                    <td data-label="Status"><AdminStatusBadge status={v.status} /></td>
                    <td data-label="Current Assignee">
                      {v.current_assignment?.assigned_to_staff_details?.full_name || (
                        <span style={{ color: 'var(--admin-text-muted, #9ca3af)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td data-label="Submitted">{formatAdminDate(v.submitted_at)}</td>
                    {(canAssign || canApprove || canReject) && (
                      <td className="admin-row-actions" data-label="Actions">
                        {canApprove && v.status === 'PENDING' && (
                          <button type="button" className="admin-btn" disabled={busyVerificationId === v.id} onClick={() => review(v.id, 'approve')}>
                            Approve
                          </button>
                        )}
                        {canReject && v.status === 'PENDING' && (
                          <button type="button" className="admin-btn admin-btn-secondary" disabled={busyVerificationId === v.id} onClick={() => review(v.id, 'reject')}>
                            Reject
                          </button>
                        )}
                        {v.status === 'PENDING' && (
                          canAssign && (
                          <button
                            type="button"
                            className="admin-btn"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'var(--color-primary, #6366f1)', border: 'none' }}
                            onClick={() => setAssignTargetId(v.id)}
                          >
                            <ClipboardCheck size={14} /> Assign Task
                          </button>
                          )
                        )}
                        {v.status !== 'PENDING' && (
                          <span style={{ color: 'var(--admin-text-muted, #9ca3af)', fontSize: '0.85rem' }}>Assigned</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="No document reviews pending"
            description="The queue is clear. New submissions will appear here automatically."
          />
        )}

        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>

      <AdminAssignModal
        open={Boolean(assignTargetId)}
        onClose={() => setAssignTargetId(null)}
        targetId={assignTargetId || ''}
        assignmentType="DOCUMENT_VERIFICATION"
        onSuccess={load}
      />
      {viewDoc && (
        <ProtectedDocumentViewer
          documentId={viewDoc.id}
          documentType={viewDoc.type}
          onClose={() => setViewDoc(null)}
        />
      )}
    </>
  );
}
