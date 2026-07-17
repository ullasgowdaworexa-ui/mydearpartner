'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';
import ErrorBoundary from '@/legacy/components/ErrorBoundary';
import { AuthProvider } from '@/legacy/contexts/AuthContext';
import { ThemeProvider } from '@/legacy/contexts/ThemeContext';
import { ReduxProvider } from '@/store/provider';

export function Providers({ children }: { children: ReactNode }) {
  return <ErrorBoundary>
    <ReduxProvider>
      <ThemeProvider>
        <AuthProvider>
          <LazyMotion features={domAnimation}>{children}</LazyMotion>
        </AuthProvider>
      </ThemeProvider>
    </ReduxProvider>
  </ErrorBoundary>;
}
