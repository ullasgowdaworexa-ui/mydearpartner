import { Suspense, type ReactNode } from 'react';
import Navbar from '@/legacy/components/Navbar';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>
    <Suspense fallback={<div style={{ height: 80 }} />}><Navbar /></Suspense>
    {children}
  </>;
}
