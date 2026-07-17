import type { Metadata } from 'next';
import AdminLoginPage from '@/legacy/pages/AdminLoginPage';
export const metadata: Metadata = { title: 'Customer Support Login', robots: { index: false, follow: false } };
export default function Page() { return <AdminLoginPage accountType="CUSTOMER_SUPPORT" dashboardPath="/support/dashboard" />; }
