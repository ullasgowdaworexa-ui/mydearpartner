'use client';

import dynamic from 'next/dynamic';
import { notFound, usePathname } from 'next/navigation';

const Dashboard = dynamic(() => import('@/legacy/pages/admin/CustomerSupportDashboardPage'), { loading: () => <div className="portal-loading">Loading dashboard…</div> });
const Tickets = dynamic(() => import('@/legacy/pages/admin/CustomerSupportQueuePage'), { loading: () => <div className="portal-loading">Loading tickets…</div> });

export function SupportRouteResolver() {
  const path = usePathname().replace(/^\/support\/?/, '').split('/')[0] || 'dashboard';
  if (path === 'dashboard') return <Dashboard />;
  if (path === 'tickets') return <Tickets />;
  notFound();
}
