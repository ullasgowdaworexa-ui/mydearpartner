'use client';

import dynamic from 'next/dynamic';
import { notFound, usePathname, useRouter } from 'next/navigation';
import { useEffect, type ComponentType } from 'react';
import { useAuth } from '@/legacy/contexts/AuthContext';

const load = (loader: () => Promise<{ default: ComponentType<any> }>) => dynamic(loader, { loading: () => <div className="portal-loading">Loading module…</div> });
const Dashboard = load(() => import('@/legacy/pages/admin/AdminDashboardPage'));
const Members = load(() => import('@/legacy/pages/admin/AdminUsersPage'));
const Tickets = load(() => import('@/legacy/pages/admin/AdminTicketsPage'));
const Enquiries = load(() => import('@/legacy/pages/admin/AdminEnquiriesPage'));
const Accounts = load(() => import('@/legacy/pages/admin/AdminAccountsPage'));
const Roles = load(() => import('@/legacy/pages/admin/AdminRolesPage'));
const Activity = load(() => import('@/legacy/pages/admin/AdminActivityPage'));
const Payments = load(() => import('@/legacy/pages/admin/AdminPaymentsPage'));
const Profiles = load(() => import('@/legacy/pages/admin/AdminProfileApprovalsPage'));
const Photos = load(() => import('@/legacy/pages/admin/AdminPhotoApprovalsPage'));
const Documents = load(() => import('@/legacy/pages/admin/AdminDocumentVerificationPage'));
const Memberships = load(() => import('@/legacy/pages/admin/AdminMembershipsPage'));
const Complaints = load(() => import('@/legacy/pages/admin/AdminComplaintsPage'));
const ReportedProfiles = load(() => import('@/legacy/pages/admin/AdminReportedProfilesPage'));
const Stories = load(() => import('@/legacy/pages/admin/AdminSuccessStoriesPage'));
const Blogs = load(() => import('@/legacy/pages/admin/AdminBlogsPage'));
const Faqs = load(() => import('@/legacy/pages/admin/AdminFAQsPage'));
const Testimonials = load(() => import('@/legacy/pages/admin/AdminTestimonialsPage'));
const Reports = load(() => import('@/legacy/pages/admin/AdminReportsPage'));
const Refunds = load(() => import('@/legacy/pages/admin/AdminRefundsPage'));
const StaffActivity = load(() => import('@/legacy/pages/admin/AdminStaffActivityPage'));
const Notifications = load(() => import('@/legacy/pages/admin/AdminNotificationsPage'));
const System = load(() => import('@/legacy/pages/admin/AdminSystemPage'));
const Staff = load(() => import('@/legacy/pages/admin/AdminStaffPage'));
const SupportAgents = load(() => import('@/legacy/pages/admin/AdminCustomerSupportPage'));
const Assignments = load(() => import('@/legacy/pages/admin/AdminAssignmentsPage'));
const Permissions = load(() => import('@/legacy/pages/admin/AdminPermissionsPage'));
const Departments = load(() => import('@/legacy/pages/admin/SuperAdminDepartmentsPage'));
const Designations = load(() => import('@/legacy/pages/admin/SuperAdminDesignationsPage'));
const MemberDetail = load(() => import('@/legacy/pages/admin/AdminMemberDetailPage'));

type RouteEntry = { component: ComponentType<any>; permission?: string; props?: Record<string, unknown> };

const routes: Record<string, RouteEntry> = {
  dashboard: { component: Dashboard, permission: 'dashboard.view' },
  members: { component: Members, permission: 'members.view' },
  profiles: { component: Profiles, permission: 'verification.view_all' },
  'profile-verifications': { component: Profiles, permission: 'verification.view_all' },
  photos: { component: Photos, permission: 'verification.view_all' },
  'photo-verifications': { component: Photos, permission: 'verification.view_all' },
  documents: { component: Documents, permission: 'verification.view_all' },
  'document-verifications': { component: Documents, permission: 'verification.view_all' },
  memberships: { component: Memberships, permission: 'memberships.view' },
  'membership-plans': { component: Memberships, permission: 'memberships.view', props: { defaultTab: 'plans' } },
  tickets: { component: Tickets, permission: 'tickets.view_all' },
  'support-tickets': { component: Tickets, permission: 'tickets.view_all' },
  'contact-enquiries': { component: Enquiries, permission: 'tickets.view_all' },
  staff: { component: Staff, permission: 'staff.view' },
  admins: { component: Accounts, permission: 'admins.manage' },
  accounts: { component: Accounts, permission: 'admins.manage' },
  'admin-management': { component: Accounts, permission: 'admins.manage' },
  'customer-support': { component: SupportAgents, permission: 'support_agents.view' },
  assignments: { component: Assignments },
  permissions: { component: Permissions },
  'roles-permissions': { component: Roles, permission: 'roles.manage' },
  departments: { component: Departments, permission: 'departments.manage' },
  designations: { component: Designations, permission: 'designations.manage' },
  reports: { component: Reports, permission: 'reports.view' },
  'audit-logs': { component: Activity, permission: 'activity.view_all' },
  activity: { component: Activity, permission: 'activity.view_all' },
  settings: { component: System, permission: 'settings.manage', props: { mode: 'settings' } },
  backups: { component: System, permission: 'backups.manage', props: { mode: 'backups' } },
  complaints: { component: Complaints, permission: 'complaints.view_all' },
  'reported-profiles': { component: ReportedProfiles, permission: 'profile_reports.manage' },
  notifications: { component: Notifications, permission: 'notifications.manage' },
  'staff-activity': { component: StaffActivity, permission: 'staff.activity' },
  'memberships/payments': { component: Payments, permission: 'payments.view' },
  'memberships/refunds': { component: Refunds, permission: 'payments.refund' },
  'content/success-stories': { component: Stories, permission: 'content.manage' },
  'content/blogs': { component: Blogs, permission: 'content.manage' },
  'content/faqs': { component: Faqs, permission: 'content.manage' },
  'content/testimonials': { component: Testimonials, permission: 'content.manage' },
};

function routeKey(pathname: string, portal: 'admin' | 'super-admin') {
  const path = pathname.replace(new RegExp(`^/${portal}/?`), '').replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);
  if (!segments.length) return 'dashboard';
  const two = segments.slice(0, 2).join('/');
  if (routes[two]) return two;
  return segments[0];
}

function ForbiddenRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/403'); }, [router]);
  return <div className="portal-loading">Checking permissions…</div>;
}

export function AdminRouteResolver({ portal }: { portal: 'admin' | 'super-admin' }) {
  const pathname = usePathname();
  const { user, hasAdminPermission } = useAuth();
  const segments = pathname.replace(new RegExp(`^/${portal}/?`), '').split('/').filter(Boolean);
  const memberId = segments[0] === 'members' ? segments[1] : undefined;
  const entry = memberId ? { component: MemberDetail, permission: 'members.manage', props: { memberId } } : routes[routeKey(pathname, portal)];
  if (!entry) notFound();
  if (entry.permission && user?.account_type !== 'SUPER_ADMIN' && !hasAdminPermission(entry.permission)) return <ForbiddenRedirect />;
  const Component = entry.component;
  return <Component {...entry.props} />;
}
