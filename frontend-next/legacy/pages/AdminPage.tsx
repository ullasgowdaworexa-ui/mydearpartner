'use client';

import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from '@/lib/router-compat';
import { findAdminNavItem } from '../admin/navigation';
import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboardPage from './admin/AdminDashboardPage';
import AdminUsersPage from './admin/AdminUsersPage';
import AdminTicketsPage from './admin/AdminTicketsPage';
import AdminEnquiriesPage from './admin/AdminEnquiriesPage';
import AdminAccountsPage from './admin/AdminAccountsPage';
import AdminRolesPage from './admin/AdminRolesPage';
import AdminActivityPage from './admin/AdminActivityPage';
import AdminPaymentsPage from './admin/AdminPaymentsPage';
import AdminProfileApprovalsPage from './admin/AdminProfileApprovalsPage';
import AdminPhotoApprovalsPage from './admin/AdminPhotoApprovalsPage';
import AdminDocumentVerificationPage from './admin/AdminDocumentVerificationPage';
import AdminMembershipsPage from './admin/AdminMembershipsPage';
import AdminComplaintsPage from './admin/AdminComplaintsPage';
import AdminReportedProfilesPage from './admin/AdminReportedProfilesPage';
import AdminSuccessStoriesPage from './admin/AdminSuccessStoriesPage';
import AdminBlogsPage from './admin/AdminBlogsPage';
import AdminFAQsPage from './admin/AdminFAQsPage';
import AdminTestimonialsPage from './admin/AdminTestimonialsPage';
import AdminReportsPage from './admin/AdminReportsPage';
import AdminRefundsPage from './admin/AdminRefundsPage';
import AdminStaffActivityPage from './admin/AdminStaffActivityPage';
import AdminNotificationsPage from './admin/AdminNotificationsPage';
import AdminSystemPage from './admin/AdminSystemPage';
import AdminStaffPage from './admin/AdminStaffPage';
import AdminCustomerSupportPage from './admin/AdminCustomerSupportPage';
import AdminAssignmentsPage from './admin/AdminAssignmentsPage';
import { AdminPermissionRoute } from './admin/AdminModulePage';
import AdminPermissionsPage from './admin/AdminPermissionsPage';

const guarded = (path: string, children: ReactNode) => {
  const item = findAdminNavItem(path);
  return item ? <AdminPermissionRoute item={item}>{children}</AdminPermissionRoute> : children;
};

export default function AdminPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={guarded('/admin/dashboard', <AdminDashboardPage />)} />
        <Route path="members" element={guarded('/admin/members', <AdminUsersPage />)} />
        <Route path="members/:id" element={guarded('/admin/members', <AdminUsersPage />)} />
        <Route path="support-tickets" element={guarded('/admin/support-tickets', <AdminTicketsPage />)} />
        <Route path="support-tickets/:id" element={guarded('/admin/support-tickets', <AdminTicketsPage />)} />
        <Route path="assigned-tickets" element={guarded('/admin/assigned-tickets', <AdminTicketsPage />)} />
        <Route path="contact-enquiries" element={guarded('/admin/contact-enquiries', <AdminEnquiriesPage />)} />
        <Route path="admin-management" element={guarded('/admin/admin-management', <AdminAccountsPage />)} />
        
        {/* Staff Management Subroutes */}
        <Route path="staff" element={guarded('/admin/staff', <AdminStaffPage />)} />
        <Route path="staff/create" element={guarded('/admin/staff', <AdminStaffPage />)} />
        <Route path="staff/:id" element={guarded('/admin/staff', <AdminStaffPage />)} />
        <Route path="staff/:id/edit" element={guarded('/admin/staff', <AdminStaffPage />)} />

        {/* Customer Support Subroutes */}
        <Route path="customer-support" element={guarded('/admin/customer-support', <AdminCustomerSupportPage />)} />
        <Route path="customer-support/create" element={guarded('/admin/customer-support', <AdminCustomerSupportPage />)} />
        <Route path="customer-support/:id" element={guarded('/admin/customer-support', <AdminCustomerSupportPage />)} />
        <Route path="customer-support/:id/edit" element={guarded('/admin/customer-support', <AdminCustomerSupportPage />)} />

        <Route path="assignments" element={guarded('/admin/assignments', <AdminAssignmentsPage />)} />
        <Route path="roles-permissions" element={guarded('/admin/roles-permissions', <AdminRolesPage />)} />
        <Route path="permissions" element={guarded('/admin/permissions', <AdminPermissionsPage />)} />
        
        {/* Verification Queues */}
        <Route path="profile-verifications" element={guarded('/admin/profile-verifications', <AdminProfileApprovalsPage />)} />
        <Route path="photo-verifications" element={guarded('/admin/photo-verifications', <AdminPhotoApprovalsPage />)} />
        <Route path="document-verifications" element={guarded('/admin/document-verifications', <AdminDocumentVerificationPage />)} />
        <Route path="reported-profiles" element={guarded('/admin/reported-profiles', <AdminReportedProfilesPage />)} />

        {/* Memberships & Finance */}
        <Route path="memberships" element={guarded('/admin/memberships', <AdminMembershipsPage />)} />
        <Route path="memberships/subscriptions" element={guarded('/admin/memberships', <AdminMembershipsPage />)} />
        <Route path="memberships/payments" element={guarded('/admin/memberships/payments', <AdminPaymentsPage />)} />
        <Route path="memberships/refunds" element={guarded('/admin/memberships/refunds', <AdminRefundsPage />)} />
        <Route path="complaints" element={guarded('/admin/complaints', <AdminComplaintsPage />)} />
        <Route path="reports" element={guarded('/admin/reports', <AdminReportsPage />)} />

        {/* Content */}
        <Route path="content/success-stories" element={guarded('/admin/content/success-stories', <AdminSuccessStoriesPage />)} />
        <Route path="content/blogs" element={guarded('/admin/content/blogs', <AdminBlogsPage />)} />
        <Route path="content/faqs" element={guarded('/admin/content/faqs', <AdminFAQsPage />)} />
        <Route path="content/testimonials" element={guarded('/admin/content/testimonials', <AdminTestimonialsPage />)} />
        <Route path="notifications" element={guarded('/admin/notifications', <AdminNotificationsPage />)} />

        {/* Management */}
        <Route path="staff-activity" element={guarded('/admin/staff-activity', <AdminStaffActivityPage />)} />
        <Route path="activity" element={guarded('/admin/activity', <AdminActivityPage />)} />
        <Route path="settings" element={guarded('/admin/settings', <AdminSystemPage mode="settings" />)} />
        <Route path="backups" element={guarded('/admin/backups', <AdminSystemPage mode="backups" />)} />

        {/* Fallback Redirections */}
        <Route path="users" element={<Navigate to="/admin/members" replace />} />
        <Route path="profile-approvals" element={<Navigate to="/admin/profile-verifications" replace />} />
        <Route path="photo-approvals" element={<Navigate to="/admin/photo-verifications" replace />} />
        <Route path="document-verification" element={<Navigate to="/admin/document-verifications" replace />} />
        <Route path="payments" element={<Navigate to="/admin/memberships/payments" replace />} />
        <Route path="refunds" element={<Navigate to="/admin/memberships/refunds" replace />} />
        <Route path="success-stories" element={<Navigate to="/admin/content/success-stories" replace />} />
        <Route path="blogs" element={<Navigate to="/admin/content/blogs" replace />} />
        <Route path="faqs" element={<Navigate to="/admin/content/faqs" replace />} />
        <Route path="testimonials" element={<Navigate to="/admin/content/testimonials" replace />} />
        <Route path="activity-logs" element={<Navigate to="/admin/activity" replace />} />

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
}
