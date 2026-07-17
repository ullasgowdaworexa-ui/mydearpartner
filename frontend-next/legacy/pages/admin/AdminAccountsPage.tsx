'use client';

import SmartImage from '@/components/shared/smart-image';

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@/lib/router-compat';
import {
  Activity, Edit3, KeyRound, LoaderCircle, MoreHorizontal, Plus, RefreshCw,
  Search, ShieldCheck, Trash2, UserCheck, UserX,
} from 'lucide-react';
import { useAuth, type AdminRole } from '../../contexts/AuthContext';
import {
  createAdminAccount, deleteAdminAccount, getAdminAccounts, updateAdminAccount,
  type AdminAccount, type CreateAdminAccountInput,
} from '../../services/adminService';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading, AdminModal,
  AdminPageHeader, AdminPagination, AdminPanel, AdminStatusBadge, AdminToast,
  formatAdminDate,
} from '../../components/admin/AdminUI';

interface AccountForm {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: AdminRole;
}

interface AccountAction {
  account: AdminAccount;
  type: 'activate' | 'deactivate' | 'delete';
}

const emptyForm: AccountForm = { full_name: '', email: '', phone: '', password: '', role: 'ADMIN' };

export default function AdminAccountsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [pendingAction, setPendingAction] = useState<AccountAction | null>(null);
  const [resetAccount, setResetAccount] = useState<AdminAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const [localSearch, setLocalSearch] = useState(search);

  const setPage = (newPage: number) => {
    setSearchParams(prev => { prev.set('page', newPage.toString()); return prev; });
  };

  const setRoleParam = (newRole: string) => {
    setSearchParams(prev => { 
      if (newRole) prev.set('role', newRole); else prev.delete('role');
      prev.set('page', '1');
      return prev; 
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        if (localSearch) prev.set('search', localSearch); else prev.delete('search');
        if (localSearch !== search) prev.set('page', '1');
        return prev;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchParams, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminAccounts({ page, page_size: 20, search, role: role ? role as AdminRole : undefined });
      setAccounts(result.results);
      setCount(result.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Administrative accounts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, role, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (account: AdminAccount) => {
    setEditing(account);
    setForm({ full_name: account.full_name, email: account.email, phone: account.phone || '', password: '', role: account.role });
    setModalOpen(true);
    setOpenActions(null);
  };

  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const updated = await updateAdminAccount(editing.id, { full_name: form.full_name, phone: form.phone });
        setAccounts((rows) => rows.map((item) => item.id === updated.id ? updated : item));
        setToast({ message: `${updated.full_name} was updated.`, tone: 'success' });
      } else {
        const created = await createAdminAccount(form as CreateAdminAccountInput);
        setAccounts((rows) => [created, ...rows]);
        setCount((value) => value + 1);
        setToast({ message: `${created.full_name} now has ${created.role_display} access.`, tone: 'success' });
      }
      setModalOpen(false);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'The account could not be saved.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const runAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      if (pendingAction.type === 'delete') {
        await deleteAdminAccount(pendingAction.account.id);
        setAccounts((rows) => rows.filter((item) => item.id !== pendingAction.account.id));
        setCount((value) => Math.max(0, value - 1));
      } else {
        const updated = await updateAdminAccount(pendingAction.account.id, { action: pendingAction.type });
        setAccounts((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      }
      setToast({ message: `Account action completed for ${pendingAction.account.full_name}.`, tone: 'success' });
      setPendingAction(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'The account action could not be completed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetAccount) return;
    setBusy(true);
    try {
      await updateAdminAccount(resetAccount.id, { action: 'reset_password', new_password: newPassword });
      setToast({ message: `Password reset completed for ${resetAccount.full_name}.`, tone: 'success' });
      setResetAccount(null);
      setNewPassword('');
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'The password could not be reset.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !accounts.length) return <AdminLoading label="Loading administrative accountsâ€¦" />;
  if (error && !accounts.length) return <AdminErrorState message={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        eyebrow="Super Admin only"
        title="Admin management"
        description="Create, maintain and audit the people entrusted with administrative access."
        actions={<div className="admin-header-button-row"><button type="button" className="admin-btn admin-btn-secondary" onClick={load}><RefreshCw /> Refresh</button><button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}><Plus /> Add account</button></div>}
      />
      <AdminPanel className="admin-table-panel">
        <div className="admin-table-toolbar">
          <div className="admin-search-field"><Search /><input value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Search admin name or email" /></div>
          <div className="admin-filter-row"><select value={role} onChange={(event) => setRoleParam(event.target.value)} aria-label="Filter administrative role"><option value="">All roles</option><option value="ADMIN">Admin</option><option value="STAFF">Staff</option><option value="CUSTOMER_SUPPORT">Customer Support</option></select></div>
        </div>
        {error && <div className="admin-inline-error">{error}</div>}
        {accounts.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Administrator</th><th>Role</th><th>Status</th><th>Last login</th><th>Created</th><th>Actions completed</th><th className="admin-table-actions-heading">Actions</th></tr></thead>
              <tbody>{accounts.map((account) => {
                const isSelf = account.id === user?.id;
                return (
                  <tr key={account.id}>
                    <td data-label="Administrator"><div className="admin-member-cell"><span className="admin-list-avatar">{account.photo ? <SmartImage src={account.photo} alt="" /> : account.full_name[0]?.toUpperCase()}</span><p><strong>{account.full_name}{isSelf && <em className="admin-you-label">You</em>}</strong><small>{account.email}</small><small>{account.phone || 'No phone provided'}</small></p></div></td>
                    <td data-label="Role"><span className={`admin-role-pill role-${account.role.toLowerCase()}`}><ShieldCheck />{account.role_display}</span></td>
                    <td data-label="Status"><AdminStatusBadge status={account.is_active ? 'Active' : 'Inactive'} /></td>
                    <td data-label="Last login"><span className="admin-muted-cell">{formatAdminDate(account.last_login, true)}</span></td>
                    <td data-label="Created"><p className="admin-cell-stack"><strong>{formatAdminDate(account.created_at)}</strong><small>by {typeof account.created_by === 'string' ? account.created_by : account.created_by?.full_name || 'System'}</small></p></td>
                    <td data-label="Actions completed"><strong className="admin-number-cell">{account.completed_actions || 0}</strong></td>
                    <td data-label="Actions" className="admin-row-actions"><div className="admin-action-menu-wrap"><button type="button" className="admin-icon-btn" onClick={() => setOpenActions((id) => id === account.id ? null : account.id)} aria-label={`Actions for ${account.full_name}`}><MoreHorizontal /></button>{openActions === account.id && <div className="admin-action-menu"><button type="button" onClick={() => openEdit(account)}><Edit3 /> Edit account</button><button type="button" onClick={() => { setResetAccount(account); setNewPassword(''); setOpenActions(null); }}><KeyRound /> Reset password</button><button type="button" onClick={() => navigate(`/admin/activity-logs?admin=${account.id}`)}><Activity /> View activity</button>{!isSelf && <button type="button" onClick={() => { setPendingAction({ account, type: account.is_active ? 'deactivate' : 'activate' }); setOpenActions(null); }}>{account.is_active ? <UserX /> : <UserCheck />}{account.is_active ? 'Deactivate' : 'Activate'}</button>}{!isSelf && account.role !== 'SUPER_ADMIN' && <button type="button" className="danger" onClick={() => { setPendingAction({ account, type: 'delete' }); setOpenActions(null); }}><Trash2 /> Delete account</button>}</div>}</div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <AdminEmptyState title="No administrative accounts found" description="Create an Admin, Staff, or Customer Support account to get started." action={<button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}><Plus /> Add account</button>} />}
        <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
      </AdminPanel>

      <AdminModal open={modalOpen} title={editing ? 'Edit administrative account' : 'Add administrative account'} description={editing ? 'Update this account identity. Account types stay in their dedicated security table.' : 'Create a secure Admin, Staff, or Customer Support login.'} onClose={() => setModalOpen(false)}>
        <form className="admin-form" onSubmit={submitAccount}>
          <label>Full name<input value={form.full_name} onChange={(event) => setForm((value) => ({ ...value, full_name: event.target.value }))} required /></label>
          <div className="admin-form-grid"><label>Email address<input type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} disabled={Boolean(editing)} required /></label><label>Phone number<input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} required /></label></div>
          <label>Account type<select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value as AdminRole }))} disabled={Boolean(editing)}><option value="ADMIN">Admin Â· operations</option><option value="STAFF">Staff Â· verification and complaints</option><option value="CUSTOMER_SUPPORT">Customer Support Â· member tickets</option>{editing?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}</select>{editing && <small>Changing account type means creating a new account in that type's dedicated table.</small>}</label>
          {!editing && <label>Temporary password<input type="password" minLength={10} value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} autoComplete="new-password" required /><small>Use at least 10 characters. The user should change this after first sign-in.</small></label>}
          <div className="admin-dialog-actions"><button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy && <LoaderCircle className="admin-spinner" />}{editing ? 'Save changes' : 'Create account'}</button></div>
        </form>
      </AdminModal>

      <AdminModal open={Boolean(resetAccount)} title="Reset administrator password" description={`Set a new temporary password for ${resetAccount?.full_name || 'this account'}.`} onClose={() => { setResetAccount(null); setNewPassword(''); }}>
        <form className="admin-form" onSubmit={resetPassword}>
          <label>New temporary password<input type="password" minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required /><small>Use at least 10 characters with a mix of letters, numbers and symbols.</small></label>
          <div className="admin-dialog-actions"><button type="button" className="admin-btn admin-btn-secondary" onClick={() => { setResetAccount(null); setNewPassword(''); }}>Cancel</button><button type="submit" className="admin-btn admin-btn-primary" disabled={busy || newPassword.length < 10}>{busy && <LoaderCircle className="admin-spinner" />}Reset password</button></div>
        </form>
      </AdminModal>

      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.type === 'delete' ? 'Delete this account?' : pendingAction?.type === 'deactivate' ? 'Deactivate this account?' : 'Activate this account?'}
        description={pendingAction?.type === 'delete' ? 'The administrator will lose access and the account will be removed. This action is audited.' : pendingAction?.type === 'deactivate' ? 'The administrator will immediately lose access to the dashboard.' : 'The administrator will regain the permissions assigned to their role.'}
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete account' : 'Confirm action'}
        dangerous={pendingAction?.type === 'delete' || pendingAction?.type === 'deactivate'}
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={runAction}
      />
      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
