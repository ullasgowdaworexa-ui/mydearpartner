import type { Metadata } from 'next';
import AdminLoginPage from '@/legacy/pages/AdminLoginPage';
export const metadata: Metadata = { title: 'Staff Login', robots: { index: false, follow: false } };
export default function Page() { return <AdminLoginPage accountType="STAFF" dashboardPath="/staff/dashboard" />; }
