'use client';

import type { ReactNode } from 'react';
import { RealtimeProvider } from '@/providers/RealtimeProvider';

export function MemberRealtimeWrapper({ children }: { children: ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
