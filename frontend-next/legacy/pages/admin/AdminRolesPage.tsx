'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, LoaderCircle, LockKeyhole, RefreshCw, Save, Search, ShieldCheck,
  ChevronRight, Lock, RotateCcw, AlertTriangle, X, Info, HelpCircle,
  Copy, Layers, ArrowRight, ShieldAlert, Award
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAdminRoles, updateAdminRole, type AdminPermission, type AdminRoleDefinition,
} from '../../services/adminService';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminPageHeader, AdminPanel, AdminToast,
} from '../../components/admin/AdminUI';

const systemProtectedPermissions = new Set([
  'dashboard.view',
  'roles.manage',
  'settings.manage',
  'backups.manage',
  'admins.manage',
  'security.manage',
]);

const defaultTemplates: Record<string, string[]> = {
  SUPER_ADMIN: [
    'dashboard.view', 'members.view', 'members.manage', 'members.suspend', 'members.delete', 'members.sensitive',
    'admins.view', 'admins.create', 'admins.manage', 'staff.view', 'staff.create', 'staff.manage', 'staff.activity',
    'support_agents.view', 'support_agents.create', 'support_agents.manage', 'support_agents.activity',
    'roles.view', 'roles.manage', 'tickets.view_all', 'tickets.view_assigned', 'tickets.claim', 'tickets.assign',
    'tickets.reply', 'tickets.note', 'tickets.status', 'tickets.escalate', 'tickets.member_details', 'tickets.payment_details',
    'verification.view_all', 'verification.view_assigned', 'verification.assign', 'verification.review', 'verification.approve',
    'verification.reject', 'verification.escalate', 'complaints.view_all', 'complaints.view_assigned', 'complaints.manage',
    'complaints.escalate', 'profile_reports.manage', 'content.manage', 'payments.view', 'payments.refund', 'notifications.manage',
    'settings.manage', 'backups.manage', 'activity.view_all', 'memberships.view', 'memberships.create', 'memberships.edit',
    'memberships.activate', 'memberships.deactivate', 'memberships.view_subscribers', 'memberships.manage_entitlements'
  ],
  ADMIN: [
    'dashboard.view', 'members.view', 'members.manage', 'members.suspend', 'members.sensitive',
    'staff.view', 'staff.create', 'staff.manage', 'staff.activity',
    'support_agents.view', 'support_agents.create', 'support_agents.manage', 'support_agents.activity',
    'tickets.view_all', 'tickets.assign', 'tickets.note', 'tickets.status', 'tickets.escalate', 'tickets.member_details',
    'verification.view_all', 'verification.assign', 'verification.review', 'verification.approve', 'verification.reject', 'verification.escalate',
    'complaints.view_all', 'complaints.manage', 'profile_reports.manage', 'content.manage', 'payments.view', 'notifications.manage',
    'memberships.view'
  ],
  STAFF: [
    'members.view', 'verification.view_assigned', 'verification.review', 'verification.approve', 'verification.reject', 'verification.escalate',
    'complaints.view_assigned', 'complaints.escalate'
  ],
  CUSTOMER_SUPPORT: [
    'tickets.view_assigned', 'tickets.claim', 'tickets.reply', 'tickets.note', 'tickets.status', 'tickets.escalate', 'tickets.member_details'
  ]
};

const categoryMeta: Record<string, { title: string; description: string; icon: string }> = {
  dashboard: { title: 'Dashboard', description: 'Monitor statistics, charts, and platform health.', icon: 'LayoutDashboard' },
  accounts: { title: 'Admin Accounts', description: 'Manage administrative staff, customer support, and credentials.', icon: 'Users' },
  members: { title: 'Members', description: 'Manage seeker accounts, active statuses, and account suspension.', icon: 'UserSquare2' },
  memberships: { title: 'Memberships', description: 'Configure plan parameters, pricing tiers, and entitlement limits.', icon: 'Award' },
  verification: { title: 'Verification', description: 'Verify user profiles, uploaded photos, and identity documents.', icon: 'Fingerprint' },
  tickets: { title: 'Tickets', description: 'Resolve seeker support enquiries, claims, and ticket updates.', icon: 'HelpCircle' },
  complaints: { title: 'Complaints', description: 'Review member feedback, flags, and complaints logs.', icon: 'AlertOctagon' },
  safety: { title: 'Safety & Reports', description: 'Manage reported profiles and safety violations.', icon: 'ShieldAlert' },
  content: { title: 'Content Management', description: 'Publish public blogs, testimonials, and FAQ categories.', icon: 'FileText' },
  payments: { title: 'Payments & Refunds', description: 'Track payment histories and authorize transaction refunds.', icon: 'CreditCard' },
  notifications: { title: 'Notifications', description: 'Broadcast administrative alerts and update schedules.', icon: 'BellRing' },
  settings: { title: 'Platform Settings', description: 'Manage system integrations, SMTP configuration, and security settings.', icon: 'Sliders' },
  backups: { title: 'Backups & Logs', description: 'Restore databases and inspect chronological audit activity logs.', icon: 'Database' },
  roles: { title: 'Roles & Security', description: 'Adjust permissions and platform scopes configuration policies.', icon: 'Lock' },
  activity: { title: 'Audit Logs', description: 'Review security actions and administrative operation logs.', icon: 'History' },
};

const roleMeta: Record<string, { purpose: string; canList: string[]; cannotList: string[]; color: string; icon: string }> = {
  SUPER_ADMIN: {
    purpose: 'Owns and controls the whole platform.',
    color: 'border-purple-200 bg-purple-50/50 text-purple-700 hover:border-purple-300',
    icon: 'Crown',
    canList: [
      'Manage administrative roles & permissions',
      'Create and manage Admins, Staff, and Support accounts',
      'Manage global security, configurations & platform settings',
      'Create, edit, and activate/deactivate membership plans',
      'Manage database backups, restorations & view activity logs'
    ],
    cannotList: []
  },
  ADMIN: {
    purpose: 'Manages daily business operations.',
    color: 'border-rose-200 bg-rose-50/50 text-rose-700 hover:border-rose-300',
    icon: 'ShieldAlert',
    canList: [
      'Manage seeker member profiles, suspensions & verification requests',
      'Create and manage operational Staff and Customer Support accounts',
      'Assign verification tasks and tickets to appropriate agents',
      'Review complaints, reported profiles & escalations'
    ],
    cannotList: [
      'Cannot create Super Admin accounts',
      'Cannot edit global settings or restore system backups',
      'Cannot access configuration credentials/secrets',
      'Cannot modify Super Admin permissions or promote themselves'
    ]
  },
  STAFF: {
    purpose: 'Handles assigned verification and moderation tasks.',
    color: 'border-blue-200 bg-blue-50/50 text-blue-700 hover:border-blue-300',
    icon: 'Users',
    canList: [
      'Verify member profiles, uploaded photos, and identity documents',
      'Review reported profiles and check seeker complaints',
      'Escalate verification requests to Admins'
    ],
    cannotList: [
      'Cannot create staff/support accounts or adjust system roles',
      'Cannot manage payments, refunds, or membership plans',
      'Cannot view logs, settings, or restore backups'
    ]
  },
  CUSTOMER_SUPPORT: {
    purpose: 'Handles member issues and support tickets.',
    color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:border-emerald-300',
    icon: 'Headphones',
    canList: [
      'View and claim unassigned member support tickets',
      'Reply to support tickets and write internal logs/notes',
      'Update ticket resolution status or escalate critical issues'
    ],
    cannotList: [
      'Cannot approve member profiles, documents, or verify photos',
      'Cannot configure membership plans or manage global system settings',
      'Cannot create admin or staff accounts'
    ]
  }
};

const RenderIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
};

export default function AdminRolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AdminRoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  // Redesign state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareRoleA, setCompareRoleA] = useState('');
  const [compareRoleB, setCompareRoleB] = useState('');
  const [cloneTargetRole, setCloneTargetRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminRoles();
      setRoles(data.roles);
      setPermissions(data.permissions);
      setDrafts(Object.fromEntries(data.roles.map((role) => [role.id, role.permissions])));
      setSelectedId((current) => current || data.roles.find((role) => role.code === 'ADMIN')?.id || data.roles[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Roles and permissions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = roles.find((role) => role.id === selectedId);
  const selectedPermissions = drafts[selectedId] || [];
  const selectedPermissionsSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);

  const originalPermissions = useMemo(() => {
    const role = roles.find(r => r.id === selectedId);
    return role ? role.permissions : [];
  }, [roles, selectedId]);

  const hasUnsavedChanges = useMemo(() => {
    if ((selected?.code as string) === 'SUPER_ADMIN') return false;
    const draftSet = new Set(selectedPermissions);
    const originalSet = new Set(originalPermissions);
    if (draftSet.size !== originalSet.size) return true;
    for (const code of draftSet) {
      if (!originalSet.has(code)) return true;
    }
    return false;
  }, [selectedPermissions, originalPermissions, selected]);

  // Group permissions dynamically into Categories
  const categories = useMemo(() => {
    const map: Record<string, AdminPermission[]> = {};
    permissions.forEach((p) => {
      const module = p.module || p.code.split('.')[0] || 'general';
      (map[module] ||= []).push(p);
    });

    return Object.entries(map).map(([key, list]) => {
      const meta = categoryMeta[key] || {
        title: key.charAt(0).toUpperCase() + key.slice(1),
        description: 'Configure operational scopes for this category.',
        icon: 'Wrench',
      };
      return {
        id: key,
        title: meta.title,
        description: meta.description,
        iconName: meta.icon,
        permissions: list,
      };
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [permissions]);

  // Global search filtering categories or immediately highlighting matches
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const query = search.toLowerCase();
    return categories.filter((cat) => {
      const matchesCategoryName = cat.title.toLowerCase().includes(query) || cat.id.toLowerCase().includes(query);
      const matchesPermissions = cat.permissions.some(
        (p) => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
      );
      return matchesCategoryName || matchesPermissions;
    });
  }, [categories, search]);

  // Auto-open drawer if search queries matches category title exactly
  useEffect(() => {
    if (!search.trim()) return;
    const exactMatch = categories.find((cat) => cat.title.toLowerCase() === search.trim().toLowerCase());
    if (exactMatch) {
      setSelectedCategoryId(exactMatch.id);
    }
  }, [search, categories]);

  const togglePermission = (code: string) => {
    if ((selected?.code as string) === 'SUPER_ADMIN') return;
    if (systemProtectedPermissions.has(code)) {
      setToast({ message: 'System-protected permissions cannot be modified.', tone: 'error' });
      return;
    }

    setDrafts((current) => {
      const values = current[selectedId] || [];
      return {
        ...current,
        [selectedId]: values.includes(code)
          ? values.filter((v) => v !== code)
          : [...values, code],
      };
    });
  };

  // Bulk Actions
  const allowEntireCategory = (catPermissions: AdminPermission[]) => {
    if ((selected?.code as string) === 'SUPER_ADMIN') return;
    const codesToAdd = catPermissions.map((p) => p.code);
    setDrafts((current) => {
      const values = current[selectedId] || [];
      return {
        ...current,
        [selectedId]: [...new Set([...values, ...codesToAdd])],
      };
    });
    setToast({ message: 'All category permissions enabled in draft.', tone: 'success' });
  };

  const clearCategory = (catPermissions: AdminPermission[]) => {
    if ((selected?.code as string) === 'SUPER_ADMIN') return;
    const codesToClear = new Set(catPermissions.map((p) => p.code));
    setDrafts((current) => {
      const values = current[selectedId] || [];
      return {
        ...current,
        [selectedId]: values.filter((code) => !codesToClear.has(code) || systemProtectedPermissions.has(code)),
      };
    });
    setToast({ message: 'Category permissions cleared from draft (except protected keys).', tone: 'success' });
  };

  const resetCategoryToBaseline = (catPermissions: AdminPermission[]) => {
    if ((selected?.code as string) === 'SUPER_ADMIN') return;
    const catCodes = new Set(catPermissions.map((p) => p.code));
    const roleOriginals = new Set(originalPermissions);
    setDrafts((current) => {
      const values = current[selectedId] || [];
      const cleared = values.filter((code) => !catCodes.has(code));
      const restoredOriginals = catPermissions.filter((p) => roleOriginals.has(p.code)).map((p) => p.code);
      return {
        ...current,
        [selectedId]: [...new Set([...cleared, ...restoredOriginals])],
      };
    });
    setToast({ message: 'Category reset to database baseline.', tone: 'success' });
  };

  const cloneRoleDraft = (targetRoleId: string) => {
    const currentSetup = drafts[selectedId] || [];
    setDrafts((current) => ({
      ...current,
      [targetRoleId]: [...currentSetup],
    }));
    const targetName = roles.find((r) => r.id === targetRoleId)?.name || 'target';
    setToast({ message: `Cloned current ${selected?.name} draft to ${targetName}.`, tone: 'success' });
    setCloneTargetRole(null);
  };

  const loadDefaultTemplate = (roleCode: string) => {
    if ((selected?.code as string) === 'SUPER_ADMIN') {
      setToast({ message: 'Super Admin permissions are locked.', tone: 'error' });
      return;
    }
    const template = defaultTemplates[roleCode] || [];
    setDrafts((current) => ({
      ...current,
      [selectedId]: [...template],
    }));
    setToast({ message: `Loaded default template configuration values.`, tone: 'success' });
  };

  const resetDraft = () => {
    setDrafts((current) => ({
      ...current,
      [selectedId]: [...originalPermissions],
    }));
    setToast({ message: 'Draft changes discarded.', tone: 'success' });
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await updateAdminRole(selected.id, selectedPermissions);
      setRoles((items) => items.map((item) => item.id === updated.id ? updated : item));
      setDrafts((current) => ({ ...current, [updated.id]: updated.permissions }));
      setConfirmOpen(false);
      setToast({ message: `${updated.name} permissions successfully updated in database.`, tone: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Permissions could not be updated.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  // Compare Table Memo
  const compareTableData = useMemo(() => {
    if (!compareRoleA || !compareRoleB) return [];
    const roleA = roles.find((r) => r.id === compareRoleA);
    const roleB = roles.find((r) => r.id === compareRoleB);
    if (!roleA || !roleB) return [];

    const setA = new Set(drafts[roleA.id] || []);
    const setB = new Set(drafts[roleB.id] || []);

    return permissions.map((p) => {
      const hasA = (roleA.code as string) === 'SUPER_ADMIN' || setA.has(p.code);
      const hasB = (roleB.code as string) === 'SUPER_ADMIN' || setB.has(p.code);
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        module: p.module || p.code.split('.')[0] || 'general',
        hasA,
        hasB,
      };
    }).sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
  }, [compareRoleA, compareRoleB, roles, drafts, permissions]);

  if (loading) return <AdminLoading label="Loading Roles Workspaceâ€¦" />;
  if (error) return <AdminErrorState message={error} onRetry={load} />;

  const meta = selected ? roleMeta[selected.code] : null;

  return (
    <div className="relative pb-24 min-h-[85vh]">
      {/* Redesigned Premium Header Workspace */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-primary-600)] bg-[var(--theme-primary-50)] px-3 py-1 rounded-full">
            Security Admin Panel
          </span>
          <h1 className="text-2xl font-black text-gray-900 mt-2">Access Control Workspace</h1>
          <p className="text-sm text-gray-500 mt-1">Configure role-based access permissions, capabilities lists, and entitlement limits.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions or categories..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-[var(--theme-primary-500)] focus:ring-1 focus:ring-[var(--theme-primary-500)] outline-none bg-gray-50/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            onClick={() => {
              setCompareRoleA(roles[0]?.id || '');
              setCompareRoleB(roles[1]?.id || '');
              setIsComparing(true);
            }}
          >
            <Layers className="w-4 h-4 text-gray-500" />
            Compare Roles
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors bg-white shadow-sm"
            onClick={load}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Redesigned 3-Column Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Column 1: Roles Directory List (xl:col-span-3) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-gray-800 border-b pb-3 mb-4 uppercase tracking-wider">System Directory</h2>
            
            <div className="space-y-3">
              {roles.map((role) => {
                const rMeta = roleMeta[role.code] || { color: 'border-gray-200 text-gray-700 hover:border-gray-300 bg-gray-50', icon: 'ShieldAlert' };
                const isSelected = selectedId === role.id;
                const draftCount = drafts[role.id]?.length ?? 0;
                
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => {
                      setSelectedId(role.id);
                      setSelectedCategoryId(null);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${isSelected ? 'border-[var(--theme-primary-500)] bg-[var(--theme-primary-50)/10] ring-1 ring-[var(--theme-primary-500)] shadow-sm' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50 bg-white'}`}
                  >
                    <span className={`p-2 rounded-lg ${isSelected ? 'bg-[var(--theme-primary-100)] text-[var(--theme-primary-700)]' : 'bg-gray-100 text-gray-500'}`}>
                      <RenderIcon name={rMeta.icon} className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <strong className="text-sm text-gray-900 font-bold leading-none">{role.name}</strong>
                        {drafts[role.id] && drafts[role.id].length !== role.permissions.length && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                            Draft Edits
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 truncate">{role.description || 'Access role profile.'}</p>
                      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500 font-semibold">
                        <span>{draftCount} Permissions</span>
                        <span>â€¢</span>
                        <span className="text-gray-400 capitalize">{role.code.toLowerCase().replaceAll('_', ' ')}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Selected Role Overview Details (xl:col-span-4) */}
        <div className="xl:col-span-4 space-y-4">
          {selected && meta && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Role Profile Summary
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-2">{selected.name}</h2>
                <p className="text-xs text-gray-500 mt-1">{meta.purpose}</p>
              </div>

              {/* Capabilities checklist */}
              {meta.canList.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Capabilities & Allowances</h3>
                  <div className="space-y-2 bg-green-50/50 p-4 rounded-xl border border-green-100/50">
                    {meta.canList.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start text-xs text-gray-600">
                        <span className="text-green-600 font-bold mt-0.5">âœ“</span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Restrictions checklist */}
              {meta.cannotList.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">System Exclusions & Blocks</h3>
                  <div className="space-y-2 bg-rose-50/50 p-4 rounded-xl border border-rose-100/50">
                    {meta.cannotList.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start text-xs text-gray-600">
                        <span className="text-rose-600 font-bold mt-0.5">âœ—</span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Template tools */}
              {selected.code !== 'SUPER_ADMIN' && (
                <div className="border-t border-gray-100 pt-5 space-y-3">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Configuration Actions</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => loadDefaultTemplate(selected.code)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 bg-white hover:bg-gray-50 text-center transition-colors"
                    >
                      Load Default template
                    </button>
                    <button
                      type="button"
                      onClick={resetDraft}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-50 text-center transition-colors"
                    >
                      Reset changes
                    </button>
                  </div>

                  <div className="flex items-center justify-between border border-gray-100 rounded-lg p-3 bg-gray-50/30">
                    <span className="text-[10px] text-gray-500 font-bold">Clone draft to:</span>
                    <select
                      className="text-[10px] border border-gray-200 rounded-md p-1 outline-none font-semibold bg-white"
                      value={cloneTargetRole || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) cloneRoleDraft(val);
                      }}
                    >
                      <option value="">Select target...</option>
                      {roles.filter((r) => r.id !== selectedId && r.code !== 'SUPER_ADMIN').map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selected.code === 'SUPER_ADMIN' && (
                <div className="bg-purple-50 text-purple-800 p-4 rounded-xl border border-purple-100 text-xs flex items-start gap-2 leading-relaxed">
                  <Lock className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span><strong>System Protected Profile:</strong> Super Admin has hardcoded baseline permission override and bypasses checks globally. Adjustments are locked to prevent platform lockdown.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 3: Category Grid Workspace (xl:col-span-5) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Functional Categories</h2>
              <span className="text-xs text-gray-500 font-bold">{filteredCategories.length} scopes shown</span>
            </div>

            {filteredCategories.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCategories.map((cat) => {
                  const allowedInCategory = cat.permissions.filter(
                    (p) => selected?.code === 'SUPER_ADMIN' || selectedPermissionsSet.has(p.code)
                  ).length;
                  const isSelected = selectedCategoryId === cat.id;

                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between h-36 ${isSelected ? 'border-[var(--theme-primary-500)] bg-[var(--theme-primary-50)/10] ring-1 ring-[var(--theme-primary-500)] shadow-sm' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50 bg-white'}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-[var(--theme-primary-100)] text-[var(--theme-primary-700)]' : 'bg-gray-100 text-gray-500'}`}>
                          <RenderIcon name={cat.iconName} className="w-4 h-4" />
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>

                      <div className="mt-3">
                        <strong className="text-xs text-gray-800 font-black truncate block">{cat.title}</strong>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-normal">{cat.description}</p>
                      </div>

                      <div className="mt-3 flex items-center justify-between w-full border-t border-gray-100 pt-2 text-[10px] font-semibold text-gray-500">
                        <span>{cat.permissions.length} Keys</span>
                        <span className={`${allowedInCategory === cat.permissions.length ? 'text-green-600' : 'text-gray-400'}`}>
                          {allowedInCategory}/{cat.permissions.length} Enabled
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs">
                No matching permission categories found. Try a different search.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Category Drawer Component */}
      {selectedCategoryId && activeCategory && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setSelectedCategoryId(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 border-l border-gray-100 flex flex-col transition-transform duration-300 transform translate-x-0">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-[var(--theme-primary-100)] text-[var(--theme-primary-700)]">
                  <RenderIcon name={activeCategory.iconName} className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-gray-900 capitalize">{activeCategory.title} Settings</h3>
                  <p className="text-xs text-gray-500">{activeCategory.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bulk actions inside drawer */}
            {selected?.code !== 'SUPER_ADMIN' && (
              <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Drawer Bulk Utilities</span>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[10px] px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded font-semibold transition-colors"
                    onClick={() => allowEntireCategory(activeCategory.permissions)}
                  >
                    Allow All
                  </button>
                  <button
                    type="button"
                    className="text-[10px] px-2 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded font-semibold transition-colors"
                    onClick={() => clearCategory(activeCategory.permissions)}
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded font-semibold transition-colors"
                    onClick={() => resetCategoryToBaseline(activeCategory.permissions)}
                  >
                    Reset baseline
                  </button>
                </div>
              </div>
            )}

            {/* Drawer Body (Lazy loads/virtualizes using basic map with scroll box) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeCategory.permissions.map((permission) => {
                const checked = selected?.code === 'SUPER_ADMIN' || selectedPermissionsSet.has(permission.code);
                const isProtected = systemProtectedPermissions.has(permission.code);

                return (
                  <div
                    key={permission.id}
                    onClick={() => togglePermission(permission.code)}
                    className={`p-4 border rounded-xl flex items-start justify-between gap-4 transition-all cursor-pointer ${checked ? 'border-[var(--theme-primary-200)] bg-[var(--theme-primary-50)/10]' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-gray-800">{permission.name}</strong>
                        {isProtected && (
                          <span className="inline-flex items-center text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                            <Lock className="w-2.5 h-2.5 mr-0.5" /> Protected
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{permission.description || 'Allows operations inside this namespace.'}</p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <code className="text-[8px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {permission.code}
                        </code>
                        <span className="text-[8px] text-gray-400">Modified: Auto-sync</span>
                      </div>
                    </div>

                    {/* Sliding checkbox Toggle Switch */}
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        disabled={(selected?.code as string) === 'SUPER_ADMIN' || ((selected?.code as string) === 'SUPER_ADMIN' && isProtected)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[var(--theme-primary-500)] ${checked ? 'bg-[var(--theme-primary-600)]' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                onClick={() => setSelectedCategoryId(null)}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Side-by-Side Comparison Mode Dialog */}
      {isComparing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Compare Administrative Roles</h3>
                <p className="text-xs text-gray-500 mt-1">Side-by-side entitlement comparison metrics.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsComparing(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Roles Picker Header */}
            <div className="p-4 border-b border-gray-100 bg-white grid grid-cols-12 gap-4 items-center">
              <div className="col-span-6 font-bold text-xs text-gray-500">Permission Name</div>
              <div className="col-span-3">
                <select
                  value={compareRoleA}
                  onChange={(e) => setCompareRoleA(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
                >
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <select
                  value={compareRoleB}
                  onChange={(e) => setCompareRoleB(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
                >
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Comparison Table Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {compareRoleA === compareRoleB ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  Select two different roles to evaluate comparisons.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="min-w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="px-4 py-3 border-b">Category / Scope</th>
                          <th className="px-4 py-3 border-b">Code Key</th>
                          <th className="px-4 py-3 border-b text-center">
                            {roles.find((r) => r.id === compareRoleA)?.name}
                          </th>
                          <th className="px-4 py-3 border-b text-center">
                            {roles.find((r) => r.id === compareRoleB)?.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {compareTableData.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800">{row.name}</span>
                                <span className="text-[9px] text-gray-400 capitalize">{row.module}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[9px] text-gray-500">
                              {row.code}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.hasA ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-green-600 text-[10px] font-bold">âœ“</span>
                              ) : (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-50 text-gray-400 text-[10px] font-bold">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.hasB ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-green-600 text-[10px] font-bold">âœ“</span>
                              ) : (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-50 text-gray-400 text-[10px] font-bold">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                onClick={() => setIsComparing(false)}
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Saving draft panel */}
      {hasUnsavedChanges && selected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-6 shadow-2xl z-40 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <strong className="text-sm font-bold text-gray-900">Unsaved configuration changes</strong>
              <p className="text-xs text-gray-500">You modified draft scope selections for the {selected.name} profile settings.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 transition-colors"
              onClick={resetDraft}
              disabled={busy}
            >
              Discard changes
            </button>
            <button
              type="button"
              className="px-5 py-2 bg-[var(--theme-primary-600)] hover:bg-[var(--theme-primary-700)] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
            >
              {busy ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save settings changes
            </button>
          </div>
        </div>
      )}

      {/* Confirm Save Dialog */}
      <AdminConfirmDialog
        open={confirmOpen}
        title={`Apply ${selected?.name || 'role'} permissions changes?`}
        description="This propagates instantly to all matching operational accounts. Existing logged-in sessions will reload scopes dynamically upon their next REST request."
        confirmLabel="Save configuration"
        dangerous={false}
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={save}
      />

      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
