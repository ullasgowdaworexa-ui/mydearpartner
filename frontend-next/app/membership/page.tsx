'use client';

import { useAuth } from '@/legacy/contexts/AuthContext';
import MemberMembershipPage from '@/components/membership/member-membership-page';
import PublicMembershipPage from '@/components/membership/public-membership-page';

export default function MembershipPage() {
  const { isAuthenticated, user } = useAuth();
  
  // If authenticated member, show member page; otherwise show public page
  if (isAuthenticated && user?.account_type === 'MEMBER') {
    return <MemberMembershipPage />;
  }
  
  // For public users or other account types, show the public landing page
  return <PublicMembershipPage />;
}