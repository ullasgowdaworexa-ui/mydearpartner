'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Clock3, Filter, LoaderCircle, RefreshCw, Search, Plus, Edit3, Trash2, ShieldAlert, Award } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import type { AdminListParams } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import {
  AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminLoading,
  AdminModal, AdminPageHeader, AdminPagination, AdminPanel, AdminStatusBadge,
  AdminToast, formatAdminDate, formatAdminMoney,
} from '../../components/admin/AdminUI';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface AdminMembership {
  id: string;
  user: { id: string; full_name: string; email: string } | null;
  plan: { id: string; name: string; price: string } | null;
  current_plan: { name: string; is_active: boolean; expires_at: string | null } | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface PaginatedMemberships {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: AdminMembership[];
}

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  duration: string;
  features: string[];
  highlighted: boolean;
  badge: string;
  color: string;
  description: string;
  currency: string;
  duration_days: number;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  profile_view_limit_daily: number;
  interest_limit_daily: number;
  message_limit_daily: number;
  can_message: boolean;
  can_view_profile_visitors: boolean;
  can_view_private_photos: boolean;
  can_get_priority_listing: boolean;
  can_use_profile_boost: boolean;
  can_view_received_interests: boolean;
  contact_access_mode: 'NONE' | 'MUTUAL_ONLY' | 'FULL';
  photo_access_mode: 'PRIMARY_ONLY' | 'ALL_APPROVED';
  can_use_advanced_search: boolean;
  can_use_horoscope: boolean;
  profile_boost_level: string;
  support_priority: string;
  entitlements?: Record<string, unknown>;
}

const getMemberships = (params: AdminListParams = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null) as [string, string][])
  ).toString();
  return fetchApi<PaginatedMemberships>(`/admin/memberships/${qs ? `?${qs}` : ''}`);
};

const emptyPlanForm = {
  name: '',
  slug: '',
  price: '',
  duration: '',
  featuresText: '',
  highlighted: false,
  badge: '',
  color: 'from-blue-500 to-indigo-600',
  description: '',
  currency: 'INR',
  duration_days: '30',
  is_active: true,
  is_featured: false,
  display_order: '0',
  profile_view_limit_daily: '10',
  interest_limit_daily: '3',
  message_limit_daily: '0',
  max_photos: '6',
  can_message: false,
  can_view_profile_visitors: false,
  can_view_private_photos: false,
  can_get_priority_listing: false,
  can_use_profile_boost: false,
  can_view_received_interests: false,
  contact_access_mode: 'NONE',
  photo_access_mode: 'PRIMARY_ONLY',
  can_use_advanced_search: false,
  can_use_horoscope: false,
  profile_boost_level: 'NONE',
  support_priority: 'STANDARD',
};

const messageFrom = (error: unknown) => {
  return error instanceof Error ? error.message : 'The request could not be completed.';
};

export default function AdminMembershipsPage({ defaultTab }: { defaultTab?: 'records' | 'requests' | 'plans' } = {}) {
  const { user, hasAdminPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'records' | 'requests' | 'plans'>(defaultTab ?? 'records');

  // Sync active tab when defaultTab prop changes (e.g. route change)
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  // Permission Checks
  const canView = user?.admin_role === 'SUPER_ADMIN' || hasAdminPermission('memberships.view');
  // Plans are commercial policy. Only Super Admin can change them; Admin may
  // inspect the plans and memberships but cannot alter member entitlements.
  const isSuperAdmin = user?.account_type === 'SUPER_ADMIN';
  const canCreate = isSuperAdmin;
  const canEdit = isSuperAdmin;
  const canActivate = isSuperAdmin;
  const canDeactivate = isSuperAdmin;

  // Subscriptions Tab State
  const [items, setItems] = useState<AdminMembership[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Requests Tab State
  const [requests, setRequests] = useState<any[]>([]);
  const [reqCount, setReqCount] = useState(0);
  const [reqPage, setReqPage] = useState(1);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('pending');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [directActivationOpen, setDirectActivationOpen] = useState(false);
  const [directForm, setDirectForm] = useState({ user_id: '', plan_slug: '', action: 'activate', duration_days: '30' });

  // Plans Tab State
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState('');
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ ...emptyPlanForm });
  const [planDeleteTarget, setPlanDeleteTarget] = useState<MembershipPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMemberships({ page, page_size: 20, search: search || undefined, status: statusFilter || undefined });
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    setReqError('');
    try {
      const qs = new URLSearchParams({
        page: String(reqPage),
        page_size: '20',
        ...(reqSearch ? { search: reqSearch } : {}),
        ...(reqStatusFilter ? { status: reqStatusFilter } : {})
      }).toString();
      const data = await fetchApi<any>(`/admin/membership-requests/?${qs}`);
      setRequests(data.results);
      setReqCount(data.count);
    } catch (err) {
      setReqError(messageFrom(err));
    } finally {
      setReqLoading(false);
    }
  }, [reqPage, reqSearch, reqStatusFilter]);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError('');
    try {
      const data = await fetchApi<{ results: MembershipPlan[] }>('/super-admin/membership-plans/?page_size=100');
      setPlans(data.results);
    } catch (err) {
      setPlansError(messageFrom(err));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const handleApproveRequest = async (reqId: string) => {
    setBusy(true);
    try {
      await fetchApi(`/admin/membership-requests/${reqId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve' })
      });
      setToast({ message: 'Request approved successfully.', tone: 'success' });
      setSelectedRequest(null);
      void loadRequests();
    } catch (err) {
      setToast({ message: messageFrom(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      setToast({ message: 'Rejection reason is required.', tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await fetchApi(`/admin/membership-requests/${selectedRequest.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason })
      });
      setToast({ message: 'Request rejected successfully.', tone: 'success' });
      setRejectionModalOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      void loadRequests();
    } catch (err) {
      setToast({ message: messageFrom(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleDirectMembership = async () => {
    if (!directForm.user_id) {
      setToast({ message: 'User/Member ID is required.', tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await fetchApi(`/admin/memberships/direct/`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: directForm.user_id,
          plan_slug: directForm.plan_slug,
          action: directForm.action,
          duration_days: parseInt(directForm.duration_days) || 30
        })
      });
      setToast({ message: 'Direct membership override applied.', tone: 'success' });
      setDirectActivationOpen(false);
      void loadSubscriptions();
    } catch (err) {
      setToast({ message: messageFrom(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    if (activeTab === 'records') {
      void loadSubscriptions();
    } else if (activeTab === 'requests') {
      void loadRequests();
    } else {
      void loadPlans();
    }
  }, [activeTab, loadSubscriptions, loadRequests, loadPlans, canView]);

  useRealtimeRefresh({
    eventTypes: [
      'membership.purchased',
      'membership.activated',
      'membership.expired',
      'membership.cancelled',
      'membership.upgraded',
      'membership.downgraded',
      'payment.success',
      'payment.failed',
      'payment.refunded',
    ],
    refresh: useCallback(() => {
      if (activeTab === 'records') loadSubscriptions();
      else if (activeTab === 'requests') loadRequests();
    }, [activeTab, loadSubscriptions, loadRequests]),
    debounceMs: 400,
  });

  useEffect(() => {
    if (activeTab === 'records') {
      setPage(1);
    } else if (activeTab === 'requests') {
      setReqPage(1);
    }
  }, [search, statusFilter, reqSearch, reqStatusFilter, activeTab]);

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.slug || !planForm.price || !planForm.duration) {
      setToast({ message: 'Please fill in all required fields.', tone: 'error' });
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: planForm.name,
        slug: planForm.slug,
        price: parseFloat(planForm.price) || 0,
        duration: planForm.duration,
        features: planForm.featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
        highlighted: planForm.highlighted,
        badge: planForm.badge,
        color: planForm.color,
        description: planForm.description,
        currency: planForm.currency,
        duration_days: parseInt(planForm.duration_days) || 30,
        is_active: planForm.is_active,
        is_featured: planForm.is_featured,
        display_order: parseInt(planForm.display_order) || 0,
        profile_view_limit_daily: parseInt(planForm.profile_view_limit_daily) || 10,
        interest_limit_daily: parseInt(planForm.interest_limit_daily) || 3,
        message_limit_daily: parseInt(planForm.message_limit_daily) || 0,
        entitlements: {
          daily_profile_view_limit: parseInt(planForm.profile_view_limit_daily) || null,
          can_send_interest: true,
          daily_interest_limit: parseInt(planForm.interest_limit_daily) || null,
          can_chat: planForm.can_message,
          can_view_contact_details: planForm.contact_access_mode !== 'NONE',
          profile_visibility_boost: planForm.can_use_profile_boost,
          can_see_who_viewed_profile: planForm.can_view_profile_visitors,
          can_view_received_interests: planForm.can_view_received_interests,
          priority_support: planForm.support_priority === 'HIGH',
          max_photos: Math.max(1, parseInt(planForm.max_photos) || 6),
          contact_access_mode: planForm.contact_access_mode,
          photo_access_mode: planForm.photo_access_mode,
          can_use_advanced_search: planForm.can_use_advanced_search,
        },
        can_message: planForm.can_message,
        can_view_profile_visitors: planForm.can_view_profile_visitors,
        can_view_private_photos: planForm.can_view_private_photos,
        can_get_priority_listing: planForm.can_get_priority_listing,
        can_use_profile_boost: planForm.can_use_profile_boost,
        can_view_received_interests: planForm.can_view_received_interests,
        contact_access_mode: planForm.contact_access_mode,
        photo_access_mode: planForm.photo_access_mode,
        can_use_advanced_search: planForm.can_use_advanced_search,
        can_use_horoscope: planForm.can_use_horoscope,
        profile_boost_level: planForm.profile_boost_level,
        support_priority: planForm.support_priority,
      };

      if (editingPlan) {
        const saved = await fetchApi<MembershipPlan>(`/super-admin/membership-plans/${editingPlan.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setPlans((rows) => rows.map((r) => r.id === saved.id ? saved : r));
        setToast({ message: 'Plan updated successfully.', tone: 'success' });
      } else {
        const saved = await fetchApi<MembershipPlan>('/super-admin/membership-plans/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setPlans((rows) => [...rows, saved]);
        setToast({ message: 'Plan created successfully.', tone: 'success' });
      }
      setPlanFormOpen(false);
    } catch (err) {
      setToast({ message: messageFrom(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const togglePlanActive = async (plan: MembershipPlan) => {
    const action = plan.is_active ? 'deactivate' : 'activate';
    if (action === 'deactivate' && !canDeactivate) {
      setToast({ message: 'You do not have permission to deactivate plans.', tone: 'error' });
      return;
    }
    if (action === 'activate' && !canActivate) {
      setToast({ message: 'You do not have permission to activate plans.', tone: 'error' });
      return;
    }

    setBusy(true);
    try {
      const saved = await fetchApi<MembershipPlan>(`/super-admin/membership-plans/${plan.id}/${action}/`, {
        method: 'POST',
      });
      setPlans((rows) => rows.map((r) => r.id === saved.id ? saved : r));
      setToast({ message: `Plan ${action}d successfully.`, tone: 'success' });
    } catch (err) {
      setToast({ message: messageFrom(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planDeleteTarget) return;
    setBusy(true);
    try {
      const res = await fetchApi<{ message?: string }>(`/super-admin/membership-plans/${planDeleteTarget.id}/`, {
        method: 'DELETE',
      });
      setPlans((rows) => rows.filter((r) => r.id !== planDeleteTarget.id));
      setToast({ message: res.message || 'Plan deleted successfully.', tone: 'success' });
      setPlanDeleteTarget(null);
      void loadPlans();
    } catch (err) {
      setToast({ message: messageFrom(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const startEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      price: String(plan.price),
      duration: plan.duration,
      featuresText: (plan.features || []).join('\n'),
      highlighted: plan.highlighted,
      badge: plan.badge || '',
      color: plan.color || 'from-blue-500 to-indigo-600',
      description: plan.description || '',
      currency: plan.currency || 'INR',
      duration_days: String(plan.duration_days ?? 30),
      is_active: plan.is_active ?? true,
      is_featured: plan.is_featured ?? false,
      display_order: String(plan.display_order ?? 0),
      profile_view_limit_daily: String(plan.profile_view_limit_daily ?? 10),
      interest_limit_daily: String(plan.interest_limit_daily ?? 3),
      message_limit_daily: String(plan.message_limit_daily ?? 0),
      max_photos: String(plan.entitlements?.max_photos ?? 6),
      can_message: plan.can_message ?? false,
      can_view_profile_visitors: plan.can_view_profile_visitors ?? false,
      can_view_private_photos: plan.can_view_private_photos ?? false,
      can_get_priority_listing: plan.can_get_priority_listing ?? false,
      can_use_profile_boost: plan.can_use_profile_boost ?? false,
      can_view_received_interests: plan.can_view_received_interests ?? false,
      contact_access_mode: plan.contact_access_mode || 'NONE',
      photo_access_mode: plan.photo_access_mode || 'PRIMARY_ONLY',
      can_use_advanced_search: plan.can_use_advanced_search ?? false,
      can_use_horoscope: plan.can_use_horoscope ?? false,
      profile_boost_level: plan.profile_boost_level || 'NONE',
      support_priority: plan.support_priority || 'STANDARD',
    });
    setPlanFormOpen(true);
  };

  const duplicatePlan = (plan: MembershipPlan) => {
    setEditingPlan(null);
    setPlanForm({
      name: `${plan.name} Copy`,
      slug: `${plan.slug}-copy`,
      price: String(plan.price),
      duration: plan.duration,
      featuresText: (plan.features || []).join('\n'),
      highlighted: plan.highlighted,
      badge: plan.badge || '',
      color: plan.color || 'from-blue-500 to-indigo-600',
      description: plan.description || '',
      currency: plan.currency || 'INR',
      duration_days: String(plan.duration_days ?? 30),
      is_active: true,
      is_featured: plan.is_featured ?? false,
      display_order: String((plan.display_order ?? 0) + 1),
      profile_view_limit_daily: String(plan.profile_view_limit_daily ?? 10),
      interest_limit_daily: String(plan.interest_limit_daily ?? 3),
      message_limit_daily: String(plan.message_limit_daily ?? 0),
      max_photos: String(plan.entitlements?.max_photos ?? 6),
      can_message: plan.can_message ?? false,
      can_view_profile_visitors: plan.can_view_profile_visitors ?? false,
      can_view_private_photos: plan.can_view_private_photos ?? false,
      can_get_priority_listing: plan.can_get_priority_listing ?? false,
      can_use_profile_boost: plan.can_use_profile_boost ?? false,
      can_view_received_interests: plan.can_view_received_interests ?? false,
      contact_access_mode: plan.contact_access_mode || 'NONE',
      photo_access_mode: plan.photo_access_mode || 'PRIMARY_ONLY',
      can_use_advanced_search: plan.can_use_advanced_search ?? false,
      can_use_horoscope: plan.can_use_horoscope ?? false,
      profile_boost_level: plan.profile_boost_level || 'NONE',
      support_priority: plan.support_priority || 'STANDARD',
    });
    setPlanFormOpen(true);
  };

  if (!canView) {
    return (
      <div className="admin-page-error p-8 text-center max-w-lg mx-auto mt-12 bg-white rounded-2xl border shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Permission Denied</h2>
        <p className="text-gray-500 text-sm mb-6">You do not have permission to manage membership plans.</p>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    );
  }

  if (activeTab === 'records' && loading && !items.length) return <AdminLoading label="Loading membership recordsâ€¦" />;
  if (activeTab === 'records' && error && !items.length) return <AdminErrorState message={error} onRetry={loadSubscriptions} />;

  if (activeTab === 'plans' && plansLoading && !plans.length) return <AdminLoading label="Loading plan configurationsâ€¦" />;
  if (activeTab === 'plans' && plansError && !plans.length) return <AdminErrorState message={plansError} onRetry={loadPlans} />;

  const activeCount = items.filter((i) => i.is_active).length;
  const expiredCount = items.filter((i) => !i.is_active).length;

  return (
    <>
      <AdminPageHeader
        showBackButton={true}
        backFallback="/admin/dashboard"
        eyebrow="Operations"
        title="Memberships"
        description="Review member subscriptions, approve manual activation requests, and configure plan pricing tiers."
        actions={
          activeTab === 'records' ? (
            <button type="button" className="admin-btn admin-btn-secondary" onClick={loadSubscriptions}>
              <RefreshCw /> Refresh
            </button>
          ) : activeTab === 'requests' ? (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={loadRequests}>
                <RefreshCw /> Refresh
              </button>
              {(user?.admin_role === 'SUPER_ADMIN' || hasAdminPermission('members.manage')) && (
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setDirectForm({ user_id: '', plan_slug: plans[0]?.slug || 'silver', action: 'activate', duration_days: '30' });
                    setDirectActivationOpen(true);
                  }}
                >
                  <Award /> Direct Override
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={loadPlans}>
                <RefreshCw /> Refresh
              </button>
              {canCreate && (
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanForm({ ...emptyPlanForm });
                    setPlanFormOpen(true);
                  }}
                >
                  <Plus /> Add Plan
                </button>
              )}
            </div>
          )
        }
      />

      {!canEdit && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm font-semibold mb-6 flex gap-2 items-center">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>You have read-only access to membership plans. Editing and creation tools are disabled.</span>
        </div>
      )}

      {/* Custom Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--admin-line)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className="admin-btn"
          style={{
            borderBottom: activeTab === 'records' ? '2px solid var(--admin-accent)' : 'none',
            color: activeTab === 'records' ? 'var(--admin-text)' : 'var(--admin-muted)',
            fontWeight: 600,
            borderRadius: '4px 4px 0 0',
            background: 'transparent',
            boxShadow: 'none',
          }}
          onClick={() => setActiveTab('records')}
        >
          Subscription Records
        </button>
        <button
          type="button"
          className="admin-btn"
          style={{
            borderBottom: activeTab === 'requests' ? '2px solid var(--admin-accent)' : 'none',
            color: activeTab === 'requests' ? 'var(--admin-text)' : 'var(--admin-muted)',
            fontWeight: 600,
            borderRadius: '4px 4px 0 0',
            background: 'transparent',
            boxShadow: 'none',
          }}
          onClick={() => setActiveTab('requests')}
        >
          Membership Requests
        </button>
        <button
          type="button"
          className="admin-btn"
          style={{
            borderBottom: activeTab === 'plans' ? '2px solid var(--admin-accent)' : 'none',
            color: activeTab === 'plans' ? 'var(--admin-text)' : 'var(--admin-muted)',
            fontWeight: 600,
            borderRadius: '4px 4px 0 0',
            background: 'transparent',
            boxShadow: 'none',
          }}
          onClick={() => setActiveTab('plans')}
        >
          Plan Configurations
        </button>
      </div>

      {activeTab === 'records' ? (
        <>
          <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.5rem' }}>
            <article className="admin-stat-card">
              <span className="admin-stat-icon green">
                <BadgeCheck />
              </span>
              <div>
                <strong>{activeCount}</strong>
                <p>Active (this page)</p>
              </div>
            </article>
            <article className="admin-stat-card">
              <span className="admin-stat-icon slate">
                <Clock3 />
              </span>
              <div>
                <strong>{expiredCount}</strong>
                <p>Expired (this page)</p>
              </div>
            </article>
          </div>

          <AdminPanel className="admin-table-panel">
            <div className="admin-table-toolbar">
              <div className="admin-search-field">
                <Search />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or emailâ€¦"
                />
              </div>
              <div className="admin-filter-row">
                <label>
                  <Filter />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All memberships</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
              </div>
            </div>

            {error && <div className="admin-inline-error">{error}</div>}
            {loading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}

            {items.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Record Plan</th>
                      <th>Current Plan</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Start date</th>
                      <th>End date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Member">
                          <p className="admin-cell-stack">
                            <strong>{item.user?.full_name || 'Deleted user'}</strong>
                            <small>{item.user?.email || 'N/A'}</small>
                          </p>
                        </td>
                        <td data-label="Record Plan">
                          <span style={{ fontWeight: 600, color: '#555' }}>{item.plan?.name || 'No plan'}</span>
                        </td>
                        <td data-label="Current Plan">
                          <span style={{
                            fontWeight: 700,
                            padding: '2px 10px',
                            borderRadius: '99px',
                            fontSize: '0.78rem',
                            background: item.current_plan?.is_active ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#f3f4f6',
                            color: item.current_plan?.is_active ? 'white' : '#6b7280',
                          }}>
                            {(item.current_plan as any)?.name || 'Free'}
                          </span>
                        </td>
                        <td data-label="Price">
                          <span style={{ fontFamily: 'monospace' }}>
                            {item.plan?.price ? formatAdminMoney(item.plan.price) : 'N/A'}
                          </span>
                        </td>
                        <td data-label="Status">
                          <AdminStatusBadge status={item.is_active ? 'Active' : 'Expired'} />
                        </td>
                        <td data-label="Start date">
                          <span className="admin-muted-cell">{formatAdminDate(item.start_date)}</span>
                        </td>
                        <td data-label="End date">
                          <span className="admin-muted-cell">
                            {item.end_date ? formatAdminDate(item.end_date) : 'Lifetime'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmptyState title="No memberships found" description="No memberships match the current filter." />
            )}
            <AdminPagination page={page} count={count} pageSize={20} onPageChange={setPage} />
          </AdminPanel>
        </>
      ) : activeTab === 'requests' ? (
        <>
          <AdminPanel className="admin-table-panel">
            <div className="admin-table-toolbar">
              <div className="admin-search-field">
                <Search />
                <input
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  placeholder="Search requests by member name/emailâ€¦"
                />
              </div>
              <div className="admin-filter-row">
                <label>
                  <Filter />
                  <select value={reqStatusFilter} onChange={(e) => setReqStatusFilter(e.target.value)}>
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
              </div>
            </div>

            {reqError && <div className="admin-inline-error">{reqError}</div>}
            {reqLoading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Updatingâ€¦</div>}

            {requests.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Requested Plan</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Requested at</th>
                      <th className="admin-table-actions-heading">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td data-label="Member">
                          <p className="admin-cell-stack">
                            <strong>{req.user?.full_name || 'Deleted user'}</strong>
                            <small>{req.user?.email || 'N/A'}</small>
                          </p>
                        </td>
                        <td data-label="Requested Plan">
                          <span style={{ fontWeight: 600 }}>{req.selected_plan?.name || 'N/A'}</span>
                        </td>
                        <td data-label="Price">
                          <span style={{ fontFamily: 'monospace' }}>
                            {req.selected_plan?.price ? formatAdminMoney(req.selected_plan.price) : 'N/A'}
                          </span>
                        </td>
                        <td data-label="Status">
                          <AdminStatusBadge status={req.status} />
                        </td>
                        <td data-label="Requested at">
                          <span className="admin-muted-cell">{formatAdminDate(req.requested_at)}</span>
                        </td>
                        <td data-label="Actions" className="admin-table-actions-heading">
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            {req.status === 'pending' && (user?.admin_role === 'SUPER_ADMIN' || hasAdminPermission('members.manage')) ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-primary text-[11px] px-2 py-1"
                                  onClick={() => handleApproveRequest(req.id)}
                                  disabled={busy}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-secondary text-[11px] px-2 py-1 text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setRejectionReason('');
                                    setRejectionModalOpen(true);
                                  }}
                                  disabled={busy}
                                >
                                  Reject
                                </button>
                              </>
                            ) : req.status === 'rejected' ? (
                              <span className="text-[11px] text-red-500 font-bold" title={req.rejection_reason}>
                                Reason: {req.rejection_reason || 'N/A'}
                              </span>
                            ) : req.status === 'approved' ? (
                              <span className="text-[11px] text-green-600 font-bold">
                                Approved by {req.approved_by?.full_name || 'Admin'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmptyState title="No requests found" description="No membership requests match the current filters." />
            )}
            <AdminPagination page={reqPage} count={reqCount} pageSize={20} onPageChange={setReqPage} />
          </AdminPanel>
        </>
      ) : (
        <AdminPanel className="admin-table-panel">
          {plansLoading && <div className="admin-table-progress"><LoaderCircle className="admin-spinner" /> Loading plansâ€¦</div>}

          {plans.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Plan Name</th>
                    <th>Price & Limit</th>
                    <th>Entitlements</th>
                    <th>Access rules</th>
                    <th>Status</th>
                    <th className="admin-table-actions-heading">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td data-label="Plan Name">
                        <div className="admin-cell-stack">
                          <strong>{plan.name}</strong>
                          <span style={{ fontSize: '10px', background: 'var(--admin-bg-subtle)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'start', marginTop: '4px' }}>
                            {plan.slug}
                          </span>
                          {plan.badge && <small style={{ color: 'var(--admin-accent)' }}>{plan.badge}</small>}
                        </div>
                      </td>
                      <td data-label="Price & Limit">
                        <div className="admin-cell-stack">
                          <strong>{formatAdminMoney(plan.price)} ({plan.currency})</strong>
                          <small>{plan.duration_days} days duration</small>
                        </div>
                      </td>
                      <td data-label="Entitlements">
                        <div className="admin-cell-stack text-[11px] text-gray-500">
                          <span>Profile views: <strong>{plan.profile_view_limit_daily}/day</strong></span>
                          <span>Interests limit: <strong>{plan.interest_limit_daily}/day</strong></span>
                          <span>Direct Messaging: <strong>{plan.can_message ? 'Allowed' : 'Disabled'}</strong></span>
                        </div>
                      </td>
                      <td data-label="Access rules">
                        <div className="admin-cell-stack text-[11px] text-gray-500">
                          <span>Contact: <strong>{plan.contact_access_mode}</strong></span>
                          <span>Gallery: <strong>{plan.photo_access_mode}</strong></span>
                          <span>Adv. filters: <strong>{plan.can_use_advanced_search ? 'Yes' : 'No'}</strong></span>
                        </div>
                      </td>
                      <td data-label="Status">
                        <div className="flex gap-2 items-center">
                          <AdminStatusBadge status={plan.is_active ? 'Active' : 'Inactive'} />
                          {plan.highlighted && <span title="Highlighted Popular Plan"><Award className="w-4 h-4 text-amber-500" /></span>}
                        </div>
                      </td>
                      <td data-label="Actions" className="admin-table-actions-heading">
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary text-[11px] px-2 py-1"
                            onClick={() => togglePlanActive(plan)}
                            disabled={busy || (!plan.is_active && !canActivate) || (plan.is_active && !canDeactivate)}
                          >
                            {plan.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                className="admin-icon-btn"
                                onClick={() => startEditPlan(plan)}
                                title="Edit plan parameters"
                              >
                                <Edit3 />
                              </button>
                              <button
                                type="button"
                                className="admin-icon-btn"
                                onClick={() => duplicatePlan(plan)}
                                title="Duplicate plan parameters"
                              >
                                <Plus />
                              </button>
                              <button
                                type="button"
                                className="admin-icon-btn"
                                style={{ color: 'var(--admin-danger)' }}
                                onClick={() => setPlanDeleteTarget(plan)}
                                title="Archive/Delete plan"
                              >
                                <Trash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState
              title="No membership plans configured"
              description="Configure database membership plan tiers to let members check out."
              action={
                canCreate && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      setEditingPlan(null);
                      setPlanForm({ ...emptyPlanForm });
                      setPlanFormOpen(true);
                    }}
                  >
                    <Plus /> Create First Plan
                  </button>
                )
              }
            />
          )}
        </AdminPanel>
      )}

      {/* Plan Create / Edit Modal */}
      <AdminModal
        open={planFormOpen}
        title={editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
        onClose={() => setPlanFormOpen(false)}
      >
        <div className="admin-form-body max-h-[75vh] overflow-y-auto pr-2">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label className="admin-form-field">
              <span>Plan Name *</span>
              <input
                type="text"
                value={planForm.name}
                onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Gold"
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Maximum photos</span>
              <input
                type="number"
                min="1"
                value={planForm.max_photos}
                onChange={(e) => setPlanForm((f) => ({ ...f, max_photos: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Slug *</span>
              <input
                type="text"
                value={planForm.slug}
                onChange={(e) => setPlanForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                placeholder="e.g. gold"
                disabled={Boolean(editingPlan) || !canEdit}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label className="admin-form-field">
              <span>Price *</span>
              <input
                type="number"
                value={planForm.price}
                onChange={(e) => setPlanForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="e.g. 2999"
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Currency</span>
              <input
                type="text"
                value={planForm.currency}
                onChange={(e) => setPlanForm((f) => ({ ...f, currency: e.target.value }))}
                placeholder="INR"
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Duration label *</span>
              <input
                type="text"
                value={planForm.duration}
                onChange={(e) => setPlanForm((f) => ({ ...f, duration: e.target.value }))}
                placeholder="e.g. 3 Months"
                disabled={!canEdit}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label className="admin-form-field">
              <span>Duration in Days *</span>
              <input
                type="number"
                value={planForm.duration_days}
                onChange={(e) => setPlanForm((f) => ({ ...f, duration_days: e.target.value }))}
                placeholder="90"
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Display Order</span>
              <input
                type="number"
                value={planForm.display_order}
                onChange={(e) => setPlanForm((f) => ({ ...f, display_order: e.target.value }))}
                placeholder="1"
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Ribbon Badge</span>
              <input
                type="text"
                value={planForm.badge}
                onChange={(e) => setPlanForm((f) => ({ ...f, badge: e.target.value }))}
                placeholder="e.g. âœ¦ Most Popular"
                disabled={!canEdit}
              />
            </label>
          </div>

          <label className="admin-form-field" style={{ marginTop: '1rem' }}>
            <span>Description</span>
            <input
              type="text"
              value={planForm.description}
              onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Premium match features"
              disabled={!canEdit}
            />
          </label>

          <h4 className="font-bold text-sm text-gray-900 border-b pb-1 mt-4">Entitlements & Daily Limits</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label className="admin-form-field">
              <span>Daily Profile Views</span>
              <input
                type="number"
                value={planForm.profile_view_limit_daily}
                onChange={(e) => setPlanForm((f) => ({ ...f, profile_view_limit_daily: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Daily Interests</span>
              <input
                type="number"
                value={planForm.interest_limit_daily}
                onChange={(e) => setPlanForm((f) => ({ ...f, interest_limit_daily: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
            <label className="admin-form-field">
              <span>Daily Messages</span>
              <input
                type="number"
                value={planForm.message_limit_daily}
                onChange={(e) => setPlanForm((f) => ({ ...f, message_limit_daily: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label className="admin-form-field">
              <span>Contact Access Mode</span>
              <select
                value={planForm.contact_access_mode}
                onChange={(e) => setPlanForm((f) => ({ ...f, contact_access_mode: e.target.value as any }))}
                disabled={!canEdit}
              >
                <option value="NONE">None</option>
                <option value="MUTUAL_ONLY">Mutual Accepted Only</option>
                <option value="FULL">Full Access</option>
              </select>
            </label>
            <label className="admin-form-field">
              <span>Photo Access Mode</span>
              <select
                value={planForm.photo_access_mode}
                onChange={(e) => setPlanForm((f) => ({ ...f, photo_access_mode: e.target.value as any }))}
                disabled={!canEdit}
              >
                <option value="PRIMARY_ONLY">Primary Photo Only</option>
                <option value="ALL_APPROVED">All Approved Photos</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label className="admin-form-field">
              <span>Profile Boost Level</span>
              <select
                value={planForm.profile_boost_level}
                onChange={(e) => setPlanForm((f) => ({ ...f, profile_boost_level: e.target.value }))}
                disabled={!canEdit}
              >
                <option value="NONE">None</option>
                <option value="MEDIUM">Medium</option>
                <option value="STRONG">Strong</option>
              </select>
            </label>
            <label className="admin-form-field">
              <span>Support Priority</span>
              <select
                value={planForm.support_priority}
                onChange={(e) => setPlanForm((f) => ({ ...f, support_priority: e.target.value }))}
                disabled={!canEdit}
              >
                <option value="STANDARD">Standard</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="can-message"
                checked={planForm.can_message}
                onChange={(e) => setPlanForm((f) => ({ ...f, can_message: e.target.checked }))}
                disabled={!canEdit}
              />
              <label htmlFor="can-message" className="text-xs font-semibold cursor-pointer">Allow messaging</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="can-use-advanced-search"
                checked={planForm.can_use_advanced_search}
                onChange={(e) => setPlanForm((f) => ({ ...f, can_use_advanced_search: e.target.checked }))}
                disabled={!canEdit}
              />
              <label htmlFor="can-use-advanced-search" className="text-xs font-semibold cursor-pointer">Advanced search</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="can-use-horoscope"
                checked={planForm.can_use_horoscope}
                onChange={(e) => setPlanForm((f) => ({ ...f, can_use_horoscope: e.target.checked }))}
                disabled={!canEdit}
              />
              <label htmlFor="can-use-horoscope" className="text-xs font-semibold cursor-pointer">Horoscope compatibility</label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            {[
              ['can-view-profile-visitors', 'Show profile visitors', 'can_view_profile_visitors'],
              ['can-view-private-photos', 'View private photos', 'can_view_private_photos'],
              ['can-view-received-interests', 'View received interests', 'can_view_received_interests'],
              ['can-get-priority-listing', 'Priority listing', 'can_get_priority_listing'],
              ['can-use-profile-boost', 'Profile boost', 'can_use_profile_boost'],
            ].map(([id, label, field]) => (
              <div className="flex items-center gap-2" key={id}>
                <input
                  type="checkbox"
                  id={id}
                  checked={Boolean(planForm[field as keyof typeof planForm])}
                  onChange={(e) => setPlanForm((form) => ({ ...form, [field]: e.target.checked }))}
                  disabled={!canEdit}
                />
                <label htmlFor={id} className="text-xs font-semibold cursor-pointer">{label}</label>
              </div>
            ))}
          </div>

          <h4 className="font-bold text-sm text-gray-900 border-b pb-1 mt-4">Visual Theme & Highlights</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label className="admin-form-field">
              <span>Gradient CSS Theme Classes</span>
              <input
                type="text"
                value={planForm.color}
                onChange={(e) => setPlanForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="e.g. from-amber-500 to-yellow-600"
                disabled={!canEdit}
              />
            </label>
            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="plan-highlighted"
                checked={planForm.highlighted}
                onChange={(e) => setPlanForm((f) => ({ ...f, highlighted: e.target.checked }))}
                disabled={!canEdit}
              />
              <label htmlFor="plan-highlighted" className="text-xs font-semibold cursor-pointer">Highlight plan card</label>
            </div>
          </div>

          <label className="admin-form-field" style={{ marginTop: '1rem' }}>
            <span>Plan Features Summary Bulletpoints (one per line)</span>
            <textarea
              value={planForm.featuresText}
              onChange={(e) => setPlanForm((f) => ({ ...f, featuresText: e.target.value }))}
              placeholder="e.g.&#10;Unlimited interests&#10;Advanced search filters&#10;Direct messaging"
              rows={5}
              disabled={!canEdit}
            />
          </label>

          <div className="admin-form-actions" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPlanFormOpen(false)}>
              Cancel
            </button>
            {canEdit && (
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleSavePlan}
                disabled={busy || !planForm.name || !planForm.slug || !planForm.price || !planForm.duration}
              >
                {busy ? <LoaderCircle className="admin-spinner" /> : null}{' '}
                {editingPlan ? 'Save changes' : 'Create Plan'}
              </button>
            )}
          </div>
        </div>
      </AdminModal>

      {/* Plan Delete Dialog */}
      <AdminConfirmDialog
        open={Boolean(planDeleteTarget)}
        title="Archive/Delete this membership plan?"
        description="This plan will be deactivated and archived from seekers view. Admins cannot hard-delete tiers with existing subscriber records to protect system transactional integrity."
        confirmLabel="Archive Plan"
        dangerous
        busy={busy}
        onCancel={() => setPlanDeleteTarget(null)}
        onConfirm={handleDeletePlan}
      />

      {/* Request Rejection Modal */}
      <AdminModal
        open={rejectionModalOpen}
        title="Reject Membership Request"
        onClose={() => setRejectionModalOpen(false)}
      >
        <div style={{ padding: '1rem' }}>
          <label className="admin-form-field">
            <span>Rejection Reason</span>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid account details or missing info"
              required
            />
          </label>
          <div className="admin-form-actions" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setRejectionModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRejectRequest}
              disabled={busy || !rejectionReason.trim()}
            >
              {busy ? <LoaderCircle className="admin-spinner" /> : null} Reject Request
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Direct Override Modal */}
      <AdminModal
        open={directActivationOpen}
        title="Direct Membership Override"
        onClose={() => setDirectActivationOpen(false)}
      >
        <div style={{ padding: '1rem' }}>
          <label className="admin-form-field">
            <span>Member UUID / User ID</span>
            <input
              type="text"
              value={directForm.user_id}
              onChange={(e) => setDirectForm((f) => ({ ...f, user_id: e.target.value }))}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              required
            />
          </label>

          <label className="admin-form-field" style={{ marginTop: '1rem' }}>
            <span>Action Override</span>
            <select
              value={directForm.action}
              onChange={(e) => setDirectForm((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="activate">Activate / Replace Plan</option>
              <option value="extend">Extend Expiry Date</option>
              <option value="cancel">Deactivate / Cancel Plan</option>
            </select>
          </label>

          {directForm.action !== 'cancel' && (
            <label className="admin-form-field" style={{ marginTop: '1rem' }}>
              <span>Target Plan Configuration</span>
              <select
                value={directForm.plan_slug}
                onChange={(e) => setDirectForm((f) => ({ ...f, plan_slug: e.target.value }))}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} ({p.price} INR)
                  </option>
                ))}
              </select>
            </label>
          )}

          {directForm.action !== 'cancel' && (
            <label className="admin-form-field" style={{ marginTop: '1rem' }}>
              <span>Duration to Grant (Days)</span>
              <input
                type="number"
                value={directForm.duration_days}
                onChange={(e) => setDirectForm((f) => ({ ...f, duration_days: e.target.value }))}
                placeholder="e.g. 30"
              />
            </label>
          )}

          <div className="admin-form-actions" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setDirectActivationOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleDirectMembership}
              disabled={busy || !directForm.user_id}
            >
              {busy ? <LoaderCircle className="admin-spinner" /> : null} Apply Override
            </button>
          </div>
        </div>
      </AdminModal>

      {toast && <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
