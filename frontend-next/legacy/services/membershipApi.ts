import { baseApi } from './baseApi';

/**
 * Membership Plan from API
 */
export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  duration_days: number | null;
  display_name: string;
  description: string;
  daily_profile_unlock_limit: number | null;
  interest_limit: number | null;
  message_limit_daily: number | null;
  messaging_mode: 'DISABLED' | 'MUTUAL_ONLY' | 'FULL';
  contact_access_mode: 'NONE' | 'MUTUAL_ONLY' | 'FULL';
  photo_access_mode: 'PRIMARY_ONLY' | 'ALL_APPROVED' | 'ALL';
  can_use_advanced_search: boolean;
  can_use_horoscope: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
}

/**
 * Membership Summary from API
 */
export interface MembershipSummary {
  has_active_plan: boolean;
  plan_name: string;
  plan_slug: string;
  is_free: boolean;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number | null;
  daily_profile_unlock_limit: number | null;
  daily_interest_limit: number | null;
  can_message: boolean;
  can_use_advanced_search: boolean;
  contact_access_mode: string;
  photo_access_mode: string;
  messaging_mode: string;
}

/**
 * Active Membership Details
 */
export interface ActiveMembership {
  id: string;
  plan: {
    id: string;
    name: string;
    slug: string;
  };
  plan_name: string;
  plan_slug: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: string;
}

/**
 * Plan Activation Response
 */
export interface ActivatePlanResponse {
  status: string;
  membership: ActiveMembership;
}

/**
 * Membership API endpoints
 */
export const membershipApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get public membership plans (no auth required)
    getMembershipPlans: builder.query<MembershipPlan[], void>({
      query: () => ({
        url: '/membership-plans/',
        method: 'GET',
      }),
      providesTags: ['MembershipPlans'],
    }),

    // Activate a membership plan
    activatePlan: builder.mutation<ActivatePlanResponse, string>({
      query: (planSlug) => ({
        url: '/member-auth/membership/activate/',
        method: 'POST',
        body: { plan_slug: planSlug },
      }),
      invalidatesTags: ['MembershipSummary'],
    }),

    // Get membership summary
    getMembershipSummary: builder.query<MembershipSummary, void>({
      query: () => ({
        url: '/member-auth/membership/summary/',
        method: 'GET',
      }),
      providesTags: ['MembershipSummary'],
    }),

    // Deactivate membership (downgrade to Free)
    deactivateMembership: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/member-auth/membership/deactivate/',
        method: 'POST',
      }),
      invalidatesTags: ['MembershipSummary'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetMembershipPlansQuery,
  useActivatePlanMutation,
  useGetMembershipSummaryQuery,
  useDeactivateMembershipMutation,
} = membershipApi;
