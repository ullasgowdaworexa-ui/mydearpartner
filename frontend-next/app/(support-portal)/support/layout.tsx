import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { ClientAuthGuard } from '@/components/auth/client-auth-guard';
import { PortalLayout } from '@/components/layout/portal-layout';

export const metadata: Metadata = { title: 'Customer Support portal', robots: { index: false, follow: false } };

export default function SupportPortalLayout({ children }: { children: ReactNode }) {
  return <ClientAuthGuard allowed={['CUSTOMER_SUPPORT']} loginPath="/support/login">
    <PortalLayout><Suspense fallback={<div className="portal-loading">Loading support queue…</div>}>{children}</Suspense></PortalLayout>
  </ClientAuthGuard>;
}
