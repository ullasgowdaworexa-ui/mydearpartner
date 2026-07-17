'use client';

import { Navigate, Route, Routes } from '@/lib/router-compat';
import AdminLayout from '../components/admin/AdminLayout';
import CustomerSupportDashboardPage from './admin/CustomerSupportDashboardPage';
import CustomerSupportQueuePage from './admin/CustomerSupportQueuePage';

export default function CustomerSupportPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Navigate to="/customer-support/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerSupportDashboardPage />} />
        <Route path="tickets" element={<CustomerSupportQueuePage />} />
        <Route path="*" element={<Navigate to="/customer-support/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
}

