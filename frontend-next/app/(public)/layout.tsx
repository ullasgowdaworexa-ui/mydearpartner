import { Suspense, type ReactNode } from 'react';
import Navbar from '@/legacy/components/Navbar';
import Footer from '@/legacy/components/Footer';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>
    <Suspense fallback={<div style={{ height: 80 }} />}><Navbar /></Suspense>
    <div>{children}</div>
    <Footer />
  </>;
}
