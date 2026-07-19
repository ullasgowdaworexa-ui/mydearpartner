import type { LucideIcon } from 'lucide-react';
import {
  Activity, BadgeCheck, Bell, BriefcaseBusiness, Building2,
  CircleHelp, ClipboardCheck, Clock3, CreditCard, FileCheck2, FileImage, FileText,
  Flag, FolderHeart, Headphones, Image, LayoutDashboard, LifeBuoy, ListTodo,
  LockKeyhole, MapPinned, Megaphone, MessageSquareMore, Newspaper, NotebookPen,
  ReceiptText, RefreshCcw, SearchCheck, Settings, ShieldEllipsis, TicketCheck,
  UserCog, UserRoundCheck, Users,
} from 'lucide-react';
import type { AdminRole } from '../contexts/AuthContext';

export type AdminNavSection = 'Workspace' | 'Operations' | 'Content' | 'Management' | 'Support';

export interface AdminNavItem {
  path: string;
  label: string;
  shortLabel?: string;
  description: string;
  icon: LucideIcon;
  section: AdminNavSection;
  permissions?: string[];
  roles?: AdminRole[];
  implemented?: boolean;
}

const leadership: AdminRole[] = ['SUPER_ADMIN', 'ADMIN'];
const superAdmin: AdminRole[] = ['SUPER_ADMIN'];
const staff: AdminRole[] = ['STAFF'];

export const adminNavigation: AdminNavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', description: 'Your live operational overview.', icon: LayoutDashboard, section: 'Workspace', implemented: true },
  { path: '/admin/members', label: 'Members', description: 'Search, review, verify and manage members.', icon: Users, section: 'Operations', permissions: ['members.view'], implemented: true },
  { path: '/admin/profile-verifications', label: 'Profile approvals', description: 'Review profiles waiting for approval.', icon: UserRoundCheck, section: 'Operations', permissions: ['verification.view_all'], roles: leadership },
  { path: '/admin/photo-verifications', label: 'Photo approvals', description: 'Approve or reject member photos.', icon: FileImage, section: 'Operations', permissions: ['verification.view_all'], roles: leadership },
  { path: '/admin/documents', label: 'Document Verification', shortLabel: 'Documents', description: 'Review and approve member verification documents.', icon: FileCheck2, section: 'Operations', permissions: ['verification.view_all'], roles: leadership, implemented: true },
  { path: '/admin/memberships', label: 'Memberships', description: 'Review subscriptions and membership health.', icon: BadgeCheck, section: 'Operations', permissions: ['members.view'], roles: leadership, implemented: true },
  { path: '/admin/membership-plans', label: 'Membership Plans', shortLabel: 'Plans', description: 'Configure plan tiers, pricing, and entitlements.', icon: CreditCard, section: 'Operations', permissions: ['memberships.view'], roles: superAdmin, implemented: true },
  { path: '/admin/memberships/payments', label: 'Payments', description: 'Track successful, pending and failed payments.', icon: CreditCard, section: 'Operations', permissions: ['payments.view'], roles: leadership, implemented: true },
  { path: '/admin/memberships/refunds', label: 'Refunds', description: 'Review and process eligible refund requests.', icon: RefreshCcw, section: 'Operations', permissions: ['payments.refund'], roles: superAdmin },
  { path: '/admin/support-tickets', label: 'Support tickets', description: 'Triage, assign and resolve support work.', icon: TicketCheck, section: 'Support', permissions: ['tickets.view_all'], roles: leadership, implemented: true },
  { path: '/admin/contact-enquiries', label: 'Contact enquiries', description: 'Track and resolve incoming enquiries.', icon: MessageSquareMore, section: 'Support', permissions: ['tickets.view_all'], implemented: true },
  { path: '/admin/complaints', label: 'Complaints', description: 'Review member complaints and escalations.', icon: Megaphone, section: 'Support', permissions: ['complaints.view_all'], roles: leadership },
  { path: '/admin/reported-profiles', label: 'Reported profiles', description: 'Investigate suspicious and reported profiles.', icon: Flag, section: 'Support', permissions: ['profile_reports.manage'], roles: leadership },
  { path: '/admin/content/faqs', label: 'FAQs & resources', description: 'Browse approved support answers and resources.', icon: CircleHelp, section: 'Support', roles: staff },
  { path: '/admin/content/success-stories', label: 'Success stories', description: 'Curate member success stories.', icon: FolderHeart, section: 'Content', permissions: ['content.manage'], roles: leadership },
  { path: '/admin/content/blogs', label: 'Blogs', description: 'Create and manage editorial content.', icon: Newspaper, section: 'Content', permissions: ['content.manage'], roles: leadership },
  { path: '/admin/content/testimonials', label: 'Testimonials', description: 'Review and curate member testimonials.', icon: NotebookPen, section: 'Content', permissions: ['content.manage'], roles: leadership },
  { path: '/admin/notifications', label: 'Notifications', description: 'Send targeted platform announcements.', icon: Bell, section: 'Content', permissions: ['notifications.manage'], roles: leadership },
  { path: '/admin/admin-management', label: 'Account management', description: 'Create and manage Admin, Staff and Support accounts.', icon: UserCog, section: 'Management', permissions: ['admins.manage', 'staff.manage', 'support_agents.manage'], roles: superAdmin, implemented: true },
  { path: '/admin/staff', label: 'Staff management', description: 'Manage verification staff members.', icon: Users, section: 'Management', roles: leadership, implemented: true },
  { path: '/admin/customer-support', label: 'Support agents', description: 'Manage customer support agents.', icon: Headphones, section: 'Management', roles: leadership, implemented: true },
  { path: '/admin/assignments', label: 'Work assignments', description: 'Assign work and monitor workloads.', icon: ClipboardCheck, section: 'Support', roles: leadership, implemented: true },
  { path: '/admin/roles-permissions', label: 'Roles & permissions', shortLabel: 'Permissions', description: 'Control the effective permission matrix.', icon: LockKeyhole, section: 'Management', permissions: ['roles.manage'], roles: superAdmin, implemented: true },
  { path: '/admin/permissions', label: 'User permissions', shortLabel: 'User Perms', description: 'Manage overrides for individual admins, staff and support agents.', icon: ShieldEllipsis, section: 'Management', roles: ['SUPER_ADMIN', 'ADMIN'], implemented: true },
  { path: '/admin/staff-activity', label: 'Staff activity', description: 'Review recent Staff operational activity.', icon: BriefcaseBusiness, section: 'Management', permissions: ['staff.activity'], roles: leadership },
  { path: '/admin/reports', label: 'Reports', description: 'View and export permitted platform reports.', icon: ReceiptText, section: 'Management', permissions: ['reports.view'], roles: leadership },
  { path: '/admin/activity', label: 'Activity logs', description: 'Audit administrative actions and changes.', icon: Activity, section: 'Management', permissions: ['activity.view_all'], roles: superAdmin, implemented: true },
  { path: '/admin/settings', label: 'Settings', description: 'Manage application and integration settings.', icon: Settings, section: 'Management', permissions: ['settings.manage'], roles: superAdmin, implemented: true },
  { path: '/admin/backups', label: 'Backups', description: 'Review protected database backup operations.', icon: Building2, section: 'Management', permissions: ['backups.manage'], roles: superAdmin, implemented: true },
  // Staff-only navigation (under /staff/* portal)
  { path: '/staff/dashboard', label: 'Dashboard', description: 'Your assigned verification work queue.', icon: LayoutDashboard, section: 'Workspace', roles: ['STAFF'], implemented: true },
  { path: '/staff/my-work', label: 'My work', description: 'Your assigned work queue.', icon: ClipboardCheck, section: 'Workspace', roles: ['STAFF'], implemented: true },
  { path: '/staff/my-work', label: 'Assigned verification work', description: 'Your assigned verification and moderation work.', icon: ListTodo, section: 'Support', roles: ['STAFF'], implemented: true },
  // Customer Support-only navigation (under /customer-support/* portal)
  { path: '/customer-support/dashboard', label: 'Dashboard', description: 'Your support ticket queue.', icon: LayoutDashboard, section: 'Workspace', roles: ['CUSTOMER_SUPPORT'], implemented: true },
  { path: '/customer-support/tickets', label: 'Tickets', description: 'Assigned customer support tickets.', icon: ListTodo, section: 'Workspace', roles: ['CUSTOMER_SUPPORT'], implemented: true },
];

export const adminNavSections: AdminNavSection[] = ['Workspace', 'Operations', 'Support', 'Content', 'Management'];

export function canAccessAdminItem(
  item: AdminNavItem,
  role: AdminRole | null | undefined,
  permissions: string[] = [],
) {
  if (!role) return false;
  if (item.roles && !item.roles.includes(role)) return false;
  if (role === 'SUPER_ADMIN') return true;
  if (!item.permissions?.length) return true;
  const permissionSet = new Set(permissions);
  return item.permissions.some((permission) => permissionSet.has(permission));
}

// Normalize portal-specific paths to their /admin/* equivalent for lookups,
// OR return the exact path for staff/customer-support paths.
export const normalizeAdminPath = (pathname: string) => {
  if (pathname.startsWith('/super-admin/')) return pathname.replace('/super-admin/', '/admin/');
  if (pathname.startsWith('/support/')) return pathname.replace('/support/', '/customer-support/');
  return pathname;
};

export const findAdminNavItem = (pathname: string) => {
  const normalized = normalizeAdminPath(pathname);
  return adminNavigation.find((item) => item.path === normalized || item.path === pathname);
};
