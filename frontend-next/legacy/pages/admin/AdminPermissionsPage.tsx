'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, HelpCircle,
  Info, LoaderCircle, Lock, RefreshCw, RotateCcw, Save, Search, ShieldAlert,
  ShieldCheck, Undo2, User, Users, Shield, CheckSquare, Square, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAdminAccounts, getUserPermissions, updateUserPermissions,
  type AdminAccount, type UserPermissionItem, type PermissionOverrideInput
} from '../../services/adminService';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminPageHeader, AdminPanel, AdminToast
} from '../../components/admin/AdminUI';

// Sections mapping matching requirements
const SECTIONS_CONFIG: Record<string, { title: string; modules: string[] }> = {
  'Users and Profiles': { title: 'Users and Profiles', modules: ['users', 'members', 'safety'] },
  'Documents and Verification': { title: 'Documents and Verification', modules: ['documents', 'verification'] },
  'Memberships': { title: 'Memberships', modules: ['memberships'] },
  'Payments': { title: 'Payments', modules: ['payments'] },
  'Tickets and Complaints': { title: 'Tickets and Complaints', modules: ['tickets', 'complaints', 'profile_reports'] },
  'Staff Management': { title: 'Staff Management', modules: ['staff', 'support_agents', 'accounts'] },
  'Content Management': { title: 'Content Management', modules: ['content'] },
  'Reports': { title: 'Reports', modules: ['reports', 'activity', 'audit_logs'] },
  'Settings': { title: 'Settings', modules: ['settings', 'backups', 'roles'] }
};

const CRITICAL_PERMISSIONS = new Set([
  'admins.manage_permissions',
  'settings.manage',
  'backups.manage',
  'payments.refund',
  'users.delete',
  'members.delete'
]);

export default function AdminPermissionsPage() {
  const { user: currentUser } = useAuth();
  
  // User list state
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [listLoading, setListLoading] = useState(false);
  
  // Selected user permissions state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [permissions, setPermissions] = useState<UserPermissionItem[]>([]);
  const [draftOverrides, setDraftOverrides] = useState<Record<string, boolean | null>>({}); // code -> true/false/null
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // General UI states
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  
  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Users and Profiles': true,
    'Documents and Verification': true
  });
  
  // Confirmation Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChangesSummary, setPendingChangesSummary] = useState<string[]>([]);

  // Search/Filter load users
  const loadUsers = useCallback(async () => {
    setListLoading(true);
    try {
      const result = await getAdminAccounts({
        search,
        role: roleFilter ? roleFilter as any : undefined,
        page: 1,
        page_size: 100
      });
      // Filter out Super Admins since their permissions are immutable
      const activeUsers = result.results.filter(u => u.role !== 'SUPER_ADMIN');
      setUsers(activeUsers);
    } catch (err) {
      console.error(err);
      setError('Could not fetch administrative users.');
    } finally {
      setListLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  // Load permissions for selected user
  const loadUserPermissions = useCallback(async (userId: string) => {
    setDetailsLoading(true);
    try {
      const data = await getUserPermissions(userId);
      setSelectedUser(data.user);
      setPermissions(data.permissions);
      
      // Initialize draft overrides (code -> value)
      const initial: Record<string, boolean | null> = {};
      data.permissions.forEach(item => {
        if (item.is_overridden) {
          initial[item.code] = item.is_allowed;
        } else {
          initial[item.code] = null;
        }
      });
      setDraftOverrides(initial);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Could not load permissions.',
        tone: 'error'
      });
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      void loadUserPermissions(selectedUserId);
    } else {
      setSelectedUser(null);
      setPermissions([]);
      setDraftOverrides({});
    }
  }, [selectedUserId, loadUserPermissions]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Switch Toggled
  const handleTogglePermission = (code: string, isInherited: boolean, defaultVal: boolean) => {
    const draftVal = draftOverrides[code];
    let nextVal: boolean | null = null;
    
    // Switch state behavior:
    // If draftVal is null (inheriting), toggling sets an override of the OPPOSITE value of default.
    // If draftVal is not null (overridden), toggling switches it.
    // If nextVal matches the default inherited state, we can reset draftVal to null (clears override).
    const currentVal = draftVal !== null ? draftVal : defaultVal;
    const toggled = !currentVal;
    
    if (toggled === defaultVal) {
      nextVal = null; // revert to inherited default
    } else {
      nextVal = toggled;
    }
    
    setDraftOverrides(prev => ({ ...prev, [code]: nextVal }));
  };

  // Revert override for a single permission
  const handleClearOverride = (code: string) => {
    setDraftOverrides(prev => ({ ...prev, [code]: null }));
  };

  // Select all in section
  const handleSelectAllInSection = (sectionName: string) => {
    const modules = SECTIONS_CONFIG[sectionName].modules;
    const sectionPermissions = permissions.filter(p => modules.includes(p.module) && p.can_grant);
    
    setDraftOverrides(prev => {
      const next = { ...prev };
      sectionPermissions.forEach(p => {
        if (p.is_inherited) {
          next[p.code] = null; // Already allowed, reset overrides
        } else {
          next[p.code] = true; // Explicitly allow
        }
      });
      return next;
    });
  };

  // Reset section overrides
  const handleResetSection = (sectionName: string) => {
    const modules = SECTIONS_CONFIG[sectionName].modules;
    const sectionPermissions = permissions.filter(p => modules.includes(p.module));
    
    setDraftOverrides(prev => {
      const next = { ...prev };
      sectionPermissions.forEach(p => {
        next[p.code] = null;
      });
      return next;
    });
  };

  // Determine unsaved changes
  const changedOverrides = useMemo(() => {
    const changes: PermissionOverrideInput[] = [];
    permissions.forEach(p => {
      const currentDraft = draftOverrides[p.code];
      const initialDraft = p.is_overridden ? p.is_allowed : null;
      if (currentDraft !== initialDraft) {
        changes.push({ code: p.code, is_allowed: currentDraft });
      }
    });
    return changes;
  }, [permissions, draftOverrides]);

  const hasUnsavedChanges = changedOverrides.length > 0;

  // Revert all changes
  const handleResetAll = () => {
    if (!selectedUserId) return;
    void loadUserPermissions(selectedUserId);
  };

  // Save changes triggers confirmation modal or direct save
  const handleSaveChanges = () => {
    if (!selectedUserId || !hasUnsavedChanges) return;

    // Detect critical updates
    const criticalList: string[] = [];
    changedOverrides.forEach(change => {
      if (CRITICAL_PERMISSIONS.has(change.code)) {
        const permName = permissions.find(p => p.code === change.code)?.name || change.code;
        const actionType = change.is_allowed === true ? 'GRANTING' : change.is_allowed === false ? 'DENYING' : 'RESETTING';
        criticalList.push(`${actionType} ${permName} (${change.code})`);
      }
    });

    if (criticalList.length > 0) {
      setPendingChangesSummary(criticalList);
      setConfirmOpen(true);
    } else {
      void savePermissionsDirectly();
    }
  };

  const savePermissionsDirectly = async () => {
    if (!selectedUserId) return;
    setBusy(true);
    setError('');
    try {
      await updateUserPermissions(selectedUserId, changedOverrides);
      setToast({ message: 'Permissions updated successfully.', tone: 'success' });
      // Reload permissions
      await loadUserPermissions(selectedUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions.');
      setToast({ message: 'Failed to update permissions.', tone: 'error' });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  // Calculate permission summary allowed vs total
  const allowedCount = useMemo(() => {
    return permissions.reduce((acc, p) => {
      const isOverridden = draftOverrides[p.code] !== null;
      const isAllowed = isOverridden ? Boolean(draftOverrides[p.code]) : p.is_inherited;
      return isAllowed ? acc + 1 : acc;
    }, 0);
  }, [permissions, draftOverrides]);

  return (
    <div className="admin-permissions-container p-6 space-y-6">
      <AdminPageHeader
        title="Permission Management"
        description="Configure granular permission overrides (grants and denials) separately for each administrative account."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Pane - Users List */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <AdminPanel title="Administrative Users">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-purple-500 animate-transition bg-slate-50 focus:bg-white"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="px-2 py-2 border rounded-md text-sm outline-none bg-white cursor-pointer hover:border-slate-300"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="CUSTOMER_SUPPORT">Customer Support</option>
                </select>
              </div>

              {listLoading ? (
                <div className="flex justify-center py-10">
                  <LoaderCircle className="animate-spin text-purple-600 h-8 w-8" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-slate-400 py-10 text-sm">
                  No administrative users found.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[500px]">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                        selectedUserId === u.id
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-medium'
                          : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          u.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' :
                          u.role === 'STAFF' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {u.role === 'ADMIN' ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{u.full_name}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">{u.email}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        u.is_active ? 'bg-green-100 text-green-800 animate-pulse' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role_display}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </AdminPanel>
        </div>

        {/* Right Pane - Permissions Configuration */}
        <div className="lg:col-span-2">
          {!selectedUserId ? (
            <AdminEmptyState
              title="No User Selected"
              description="Please select a user from the left pane to view, override, and manage their permissions."
              icon={User}
            />
          ) : detailsLoading ? (
            <AdminLoading label="Loading permissions catalog..." />
          ) : selectedUser ? (
            <div className="space-y-6">
              
              {/* User Summary Header */}
              <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-transition hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedUser.full_name}</h3>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                        Role: {selectedUser.role_display}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                        selectedUser.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        Status: {selectedUser.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="text-xs text-slate-500">Access Index</div>
                  <div className="text-2xl font-black text-purple-700">{allowedCount} / {permissions.length}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Effective Permissions Allowed</div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              {hasUnsavedChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-2 text-amber-800 text-sm">
                    <AlertTriangle className="h-5 w-5" />
                    <span>You have unsaved changes in overrides (<strong>{changedOverrides.length} items modified</strong>)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetAll}
                      disabled={busy}
                      className="px-3 py-1.5 rounded bg-white text-amber-700 hover:bg-amber-100 border border-amber-300 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Revert
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={busy}
                      className="px-3 py-1.5 rounded bg-purple-700 text-white hover:bg-purple-800 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {busy ? <LoaderCircle className="animate-spin h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />} Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Collapsible Sections */}
              <div className="space-y-4">
                {Object.keys(SECTIONS_CONFIG).map(sectionKey => {
                  const section = SECTIONS_CONFIG[sectionKey];
                  const sectionPermissions = permissions.filter(p => section.modules.includes(p.module));
                  if (sectionPermissions.length === 0) return null;
                  
                  const isExpanded = expandedSections[sectionKey];
                  const activeOverridesCount = sectionPermissions.reduce((acc, p) => draftOverrides[p.code] !== null ? acc + 1 : acc, 0);

                  return (
                    <div key={sectionKey} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md animate-transition">
                      
                      {/* Section Header */}
                      <div
                        onClick={() => toggleSection(sectionKey)}
                        className="p-4 bg-slate-50 border-b flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-all select-none"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
                          <span className="font-bold text-slate-800">{section.title}</span>
                          {activeOverridesCount > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700 font-semibold">
                              {activeOverridesCount} override{activeOverridesCount > 1 ? 's' : ''} active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectAllInSection(sectionKey)}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                            title="Set all valid permissions to ALLOW"
                          >
                            Set All to Allow
                          </button>
                          <button
                            onClick={() => handleResetSection(sectionKey)}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                            title="Clear overrides in this section"
                          >
                            Reset Section
                          </button>
                        </div>
                      </div>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100">
                          {sectionPermissions.map(p => {
                            const draftVal = draftOverrides[p.code];
                            const isOverridden = draftVal !== null;
                            const isAllowed = isOverridden ? Boolean(draftVal) : p.is_inherited;
                            
                            return (
                              <div
                                key={p.code}
                                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                  isOverridden ? 'bg-purple-50/10' : 'bg-transparent'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800">{p.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({p.code})</span>
                                  </div>
                                  <div className="text-xs text-slate-500 max-w-[450px]">
                                    {p.description || `Grants the administrative ability to view/manage ${p.code.split('.')[0]} components.`}
                                  </div>
                                  <div className="flex gap-2 items-center mt-1.5">
                                    {isOverridden ? (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
                                        isAllowed 
                                          ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                          : 'bg-rose-100 text-rose-700 border-rose-200'
                                      }`}>
                                        <Info className="h-3 w-3" /> Override ({isAllowed ? 'Allowed' : 'Denied'})
                                      </span>
                                    ) : (
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 bg-slate-100 border border-slate-200 flex items-center gap-1`}>
                                        Inherited ({p.is_inherited ? 'Allowed' : 'Denied'})
                                      </span>
                                    )}

                                    {/* Privilege Escalation Warn Label */}
                                    {!p.can_grant && (
                                      <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded flex items-center gap-1">
                                        <ShieldAlert className="h-3 w-3" /> Cannot grant (unpossessed)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-auto">
                                  {/* Toggle Controls */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      disabled={!p.can_grant || busy}
                                      onClick={() => handleTogglePermission(p.code, p.is_inherited, p.is_inherited)}
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        !p.can_grant ? 'opacity-50 cursor-not-allowed border-slate-200 text-slate-400 bg-slate-50' :
                                        isAllowed 
                                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer'
                                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer'
                                      }`}
                                    >
                                      {isAllowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                      {isAllowed ? 'Allowed' : 'Denied'}
                                    </button>

                                    {/* Undo button */}
                                    {isOverridden && (
                                      <button
                                        onClick={() => handleClearOverride(p.code)}
                                        className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                                        title="Revert override to role default"
                                      >
                                        <Undo2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          ) : null}
        </div>

      </div>

      {/* Confirmation Dialog for important changes */}
      <AdminConfirmDialog
        open={confirmOpen}
        title="Confirm Critical Permission Override Changes"
        description={
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              You are configuring critical security permissions overrides for <strong>{selectedUser?.full_name}</strong>. Please confirm before writing to database logs:
            </p>
            <div className="bg-rose-50 text-rose-900 border border-rose-100 rounded p-3 space-y-1 max-h-[150px] overflow-y-auto">
              {pendingChangesSummary.map((change, i) => (
                <div key={i} className="text-xs flex items-center gap-2 font-mono">
                  <span className="text-rose-600">â–¶</span> {change}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Note: Saving will force logs updates and invalidate any currently active session tokens for this user.
            </p>
          </div>
        }
        confirmLabel="Confirm Overrides"
        onConfirm={savePermissionsDirectly}
        onCancel={() => setConfirmOpen(false)}
      />

      {toast && (
        <AdminToast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
