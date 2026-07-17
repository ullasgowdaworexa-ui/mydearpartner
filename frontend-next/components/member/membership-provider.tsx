'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useGetMembershipSummaryQuery, type MembershipSummary } from '@/legacy/services/membershipApi';

interface MembershipContextType {
  membershipSummary: MembershipSummary | null;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

const MembershipContext = createContext<MembershipContextType | null>(null);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { 
    data: membershipSummary = null, 
    isLoading, 
    error, 
    refetch 
  } = useGetMembershipSummaryQuery(undefined, {
    // Refetch when the component mounts and on focus
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  // Listen for auth cache clear events to refetch
  useEffect(() => {
    const handleAuthClear = () => {
      refetch();
    };

    window.addEventListener('auth:cache-clear', handleAuthClear);
    return () => window.removeEventListener('auth:cache-clear', handleAuthClear);
  }, [refetch]);

  const value: MembershipContextType = {
    membershipSummary,
    isLoading,
    error,
    refetch,
  };

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
}