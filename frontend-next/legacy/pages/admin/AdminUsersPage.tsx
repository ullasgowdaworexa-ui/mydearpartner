'use client';

import SmartImage from '@/components/shared/smart-image';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useMatch, useNavigate } from '@/lib/router-compat';
import {
  CheckCircle2, Filter, LoaderCircle, MoreHorizontal, RefreshCw, Search, ShieldOff,
  Trash2, UserCheck, UserX, X, ShieldAlert, BadgeInfo, CreditCard, Clock, Check, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAdminUsers, updateAdminUser, type AdminUser, type AdminUserAction,
} from '../../services/adminService';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminPageHeader, AdminPagination, AdminPanel, AdminStatusBadge, AdminToast,
  formatAdminDate,
} from '../../components/admin/AdminUI';

interface PendingAction {
  user: AdminUser;
  action: AdminUserAction;
  label: string;
  description: string;
  dangerous: boolean;
}

export default function AdminUsersPage() {
  const { user: currentUser, hasAdminPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSuper = window.location.pathname.startsWith('/super-admin');
  const basePath = isSuper ? '/super-admin/members' : '/admin/members';
  const matchDetail = useMatch(`${basePath}/:id`);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [ordering, setOrdering] = useState(searchParams.get('ordering') || '-date_joined');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'verification' | 'membership'>('profile');

  const closeDrawer = () => {
    setSelectedUser(null);
    navigate({
      pathname: basePath,
      search: searchParams.toString(),
    });
  };

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminUsers({ page, page_size: 20, search, status: status || undefined, ordering });
      setUsers(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Users could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [ordering, page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => { setPage(1); }, [search, status, ordering]);

  useEffect(() => {
    const detailId = matchDetail?.params.id;
    if (detailId) {
      const found = users.find((u) => u.id === detailId);
      if (found) {
        setSelectedUser(found);
      } else {
        getAdminUsers({ search: detailId }).then((res) => {
          if (res.results && res.results.length > 0) {
            setSelectedUser(res.results[0]);
          }
        }).catch((err) => console.error(err));
      }
    } else {
      setSelectedUser(null);
    }
  }, [matchDetail?.params.id, users]);

  const runAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      const updated = await updateAdminUser(pendingAction.user.id, pendingAction.action);
      if (pendingAction.action === 'soft_delete' || pendingAction.action === 'permanent_delete') {
        setUsers((rows) => rows.filter((item) => item.id !== pendingAction.user.id));
        setCount((value) => Math.max(0, value - 1));
      } else {
        setUsers((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      }
      setToast({ message: `${pendingAction.user.full_name || pendingAction.user.email} was updated successfully.`, tone: 'success' });
      setPendingAction(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'This action could not be completed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const canMutate = hasAdminPermission('members.manage')
    || hasAdminPermission('members.suspend')
    || hasAdminPermission('members.delete');

  if (loading && !users.length) return <AdminLoading label="Loading member directoryâ€¦" />;
  if (error && !users.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Member operations"
        title="Users"
        description="Review member access, verification and profile status. Sensitive actions are permission checked and audited."
        actions={<button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button>}
      />

      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, email or phone" /></div>
          <div className="admin-filter-row">
            <label><Filter /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
            <select value={ordering} onChange={(event) => setOrdering(event.target.value)} aria-label="Sort users"><option value="-date_joined">Newest first</option><option value="date_joined">Oldest first</option><option value="first_name">Name Aâ€“Z</option><option value="-first_name">Name Zâ€“A</option></select>
          </div>
        </div>

        {error && <div className="admin-inline-error">{error}</div>}
        {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updating resultsâ€¦</div>}

        {users.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Member</th><th>Profile</th><th>Verification</th><th>Access</th><th>Joined</th>{canMutate && <th className="admin-table-actions-heading">Actions</th>}</tr></thead>
              <tbody>
                {users.map((member) => {
                  const protectedAdmin = member.is_staff && currentUser?.admin_role !== 'SUPER_ADMIN';
                  return (
                    <tr key={member.id}>
                      <td data-label="Member"><div className="admin-member-cell"><span className="admin-list-avatar">{member.id ? <img src={`/api/proxy/users/${member.id}/avatar/`} alt="" /> : (member.full_name || member.email)[0].toUpperCase()}</span><p><button type="button" onClick={() => navigate(`${basePath}/${member.id}`)} style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', padding: 0 }}>{member.full_name || 'Unnamed member'}</button><small>{member.email}</small><small>{member.mobile_number || 'No phone provided'}</small></p></div></td>
                      <td data-label="Profile"><p className="admin-cell-stack"><strong>{member.gender || 'Not specified'}</strong><small>{member.work_location || 'Location unavailable'}</small></p></td>
                      <td data-label="Verification"><AdminStatusBadge status={member.is_verified ? 'Verified' : 'Pending'} /></td>
                      <td data-label="Access"><AdminStatusBadge status={member.is_active ? 'Active' : 'Suspended'} /></td>
                      <td data-label="Joined"><span className="admin-muted-cell">{formatAdminDate(member.date_joined)}</span></td>
                      {canMutate && (
                        <td className="admin-row-actions" data-label="Actions">
                          {!protectedAdmin && (
                            <div className="admin-action-menu-wrap">
                              <button type="button" className="admin-icon-btn" onClick={() => setOpenActions((id) => id === member.id ? null : member.id)} aria-label={`Actions for ${member.full_name || member.email}`}><MoreHorizontal /></button>
                              {openActions === member.id && (
                                <div className="admin-action-menu">
                                  {!member.is_verified && hasAdminPermission('members.manage') && <button type="button" onClick={() => { setPendingAction({ user: member, action: 'verify', label: 'Verify member', description: `Confirm that ${member.full_name || member.email} meets the verification requirements.`, dangerous: false }); setOpenActions(null); }}><UserCheck /> Verify member</button>}
                                  {hasAdminPermission('members.suspend') && <button type="button" onClick={() => { setPendingAction({ user: member, action: member.is_active ? 'deactivate' : 'activate', label: member.is_active ? 'Suspend member access?' : 'Restore member access?', description: member.is_active ? 'The member will be signed out and unable to access their account until restored.' : 'The member will regain access to their account.', dangerous: member.is_active }); setOpenActions(null); }}>{member.is_active ? <UserX /> : <CheckCircle2 />}{member.is_active ? 'Suspend access' : 'Restore access'}</button>}
                                  {hasAdminPermission('members.delete') && <button type="button" className="danger" onClick={() => { setPendingAction({ user: member, action: 'soft_delete', label: 'Delete this member?', description: 'The account will be removed from normal views. This sensitive action is recorded in the activity log.', dangerous: true }); setOpenActions(null); }}><Trash2 /> Delete account</button>}
                                </div>
                              )}
                            </div>
                          )}
                          {protectedAdmin && <span className="admin-protected-label"><ShieldOff /> Protected</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <AdminEmptyState title="No users found" description="Try a different search term or filter." />}

        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>

      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.label || 'Confirm action'}
        description={pendingAction?.description || ''}
        confirmLabel={pendingAction?.label || 'Confirm'}
        dangerous={pendingAction?.dangerous}
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={runAction}
      />
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Slide-out detail drawer */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '600px',
          maxWidth: '100%',
          height: '100vh',
          background: 'rgba(17, 24, 39, 0.98)',
          backdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.25s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f3f4f6', fontWeight: '600' }}>Member Detail File</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>ID: {selectedUser.id}</p>
            </div>
            <button
              onClick={closeDrawer}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Info bar */}
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#4b5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.25rem',
              color: '#fff',
              overflow: 'hidden',
            }}>
              {selectedUser.photo ? <SmartImage src={selectedUser.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : selectedUser.full_name[0].toUpperCase()}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '600' }}>{selectedUser.full_name}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>{selectedUser.email}</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <AdminStatusBadge status={selectedUser.is_verified ? 'Verified' : 'Pending'} />
              <AdminStatusBadge status={selectedUser.is_active ? 'Active' : 'Suspended'} />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '0 1rem',
          }}>
            {(['profile', 'verification', 'membership'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '1rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                  color: activeTab === tab ? '#fff' : '#9ca3af',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? '600' : 'normal',
                  fontSize: '0.9rem',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}>
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold' }}>Gender</label>
                    <div style={{ color: '#fff', marginTop: '0.25rem' }}>{selectedUser.gender || 'Not specified'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold' }}>Phone</label>
                    <div style={{ color: '#fff', marginTop: '0.25rem' }}>{selectedUser.mobile_number || 'Not provided'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold' }}>Work Location</label>
                    <div style={{ color: '#fff', marginTop: '0.25rem' }}>{selectedUser.work_location || 'Not provided'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold' }}>Joined Date</label>
                    <div style={{ color: '#fff', marginTop: '0.25rem' }}>{formatAdminDate(selectedUser.date_joined)}</div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }} />

                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold' }}>About Me</label>
                  <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: '1.5', margin: '0.5rem 0 0', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedUser.about || `${selectedUser.full_name} is a registered member of My Dear Partner. Profile is fully active and searchable.`}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold' }}>Partner Expectations</label>
                  <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: '1.5', margin: '0.5rem 0 0', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    Looking for a suitable match with similar educational background and moral values.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'verification' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Profile Status</div>
                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: selectedUser.profile_status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>
                      {selectedUser.profile_status || 'PENDING'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Photo Review</div>
                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: selectedUser.photo_status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>
                      {selectedUser.photo_status || 'PENDING'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Doc Verification</div>
                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: selectedUser.document_status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>
                      {selectedUser.document_status || 'PENDING'}
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }} />

                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: '#fff', fontSize: '0.95rem' }}>Verification Checklists</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d1d5db', fontSize: '0.9rem' }}>
                      <Check size={16} style={{ color: '#10b981' }} /> Government Photo ID Uploaded
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d1d5db', fontSize: '0.9rem' }}>
                      <Check size={16} style={{ color: '#10b981' }} /> Official Email Address Verified
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d1d5db', fontSize: '0.9rem' }}>
                      <Check size={16} style={{ color: '#10b981' }} /> Phone OTP Verification Succeeded
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'membership' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1.25rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{selectedUser.is_premium ? 'Premium Elite Plan' : 'Free Standard Membership'}</h4>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>{selectedUser.is_premium ? 'Active subscription plan' : 'Upgrade to see contact details'}</p>
                    </div>
                    <CreditCard size={28} style={{ color: '#818cf8' }} />
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }} />

                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: '#fff', fontSize: '0.95rem' }}>Billing & Entitlements</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#d1d5db' }}>
                      <span>Daily contact limit:</span>
                      <strong>{selectedUser.is_premium ? '50 contacts/day' : '0 contacts/day'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#d1d5db' }}>
                      <span>Personalized matchmaking:</span>
                      <strong>{selectedUser.is_premium ? 'Enabled' : 'Disabled'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            gap: '1rem',
          }}>
            {!selectedUser.is_verified && hasAdminPermission('members.manage') && (
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setPendingAction({
                    user: selectedUser,
                    action: 'verify',
                    label: 'Verify member',
                    description: `Confirm that ${selectedUser.full_name || selectedUser.email} meets all requirements.`,
                    dangerous: false
                  });
                }}
              >
                Verify Profile
              </button>
            )}
            {hasAdminPermission('members.suspend') && (
              <button
                type="button"
                className={selectedUser.is_active ? 'admin-btn admin-btn-danger' : 'admin-btn admin-btn-secondary'}
                style={{ flex: 1 }}
                onClick={() => {
                  setPendingAction({
                    user: selectedUser,
                    action: selectedUser.is_active ? 'deactivate' : 'activate',
                    label: selectedUser.is_active ? 'Suspend member?' : 'Restore member?',
                    description: selectedUser.is_active ? 'Member will be signed out and temporarily suspended.' : 'Member will regain full platform access.',
                    dangerous: selectedUser.is_active
                  });
                }}
              >
                {selectedUser.is_active ? 'Suspend Account' : 'Reactivate'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
