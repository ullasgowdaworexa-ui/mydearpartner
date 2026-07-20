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
  can_view_received_interests?: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  entitlements?: Record<string, unknown>;
}

export interface RazorpayOrder {
  internal_order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  demo_mode: boolean;
  plan: { id: string; name: string; duration_days: number };
}

export interface PaymentVerification {
  success: boolean;
  payment_status: string;
  membership_status: string;
  membership: {
    id?: string;
    status?: string;
    plan_name: string;
    starts_at?: string;
    expires_at: string;
  };
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
export interface MembershipRequestResponse {
  id: string;
  plan_name: string;
  plan_slug: string;
  status: 'pending';
  requested_at: string;
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

    createMembershipOrder: builder.mutation<RazorpayOrder, { plan_id: string }>({
      query: ({ plan_id }) => ({
        url: '/payments/orders/',
        method: 'POST',
        body: { membership_plan_id: plan_id },
      }),
    }),

    verifyMembershipPayment: builder.mutation<PaymentVerification, {
      internal_order_id: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
    }>({
      query: (body) => ({
        url: '/payments/verify/',
        method: 'POST',
        body,
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

    getPaymentOrderStatus: builder.query<{
      order_status: string;
      payment_status: string | null;
      membership_status: string | null;
      refund_status: string | null;
      can_retry: boolean;
      can_request_refund: boolean;
    }, string>({
      query: (id) => ({
        url: `/payments/orders/${id}/status/`,
        method: 'GET',
      }),
    }),

    getPaymentHistory: builder.query<any[], void>({
      query: () => ({
        url: '/payments/history/',
        method: 'GET',
      }),
    }),

    requestRefund: builder.mutation<any, { orderId: string; reason: string; details?: string }>({
      query: ({ orderId, ...body }) => ({
        url: `/payments/${orderId}/refund-request/`,
        method: 'POST',
        body,
      }),
    }),

    getRefundStatus: builder.query<any, string>({
      query: (id) => ({
        url: `/payments/refunds/${id}/`,
        method: 'GET',
      }),
    }),

    getAvailableUpgrades: builder.query<{ plans: any[] }, void>({
      query: () => ({
        url: '/member-auth/membership/available-upgrades/',
        method: 'GET',
      }),
      providesTags: ['MembershipSummary'],
    }),

    upgradeMembership: builder.mutation<{ message: string }, { plan_slug: string }>({
      query: ({ plan_slug }) => ({
        url: '/member-auth/membership/upgrade/',
        method: 'POST',
        body: { plan_slug },
      }),
      invalidatesTags: ['MembershipSummary'],
    }),

    activateFreePlan: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/member-auth/membership/activate-free/',
        method: 'POST',
      }),
      invalidatesTags: ['MembershipSummary'],
    }),

    cancelMembership: builder.mutation<{ message: string }, { reason?: string }>({
      query: (body) => ({
        url: '/member-auth/membership/cancel/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MembershipSummary'],
    }),

    getMembershipStatusDetail: builder.query<{ summary: any; current_plan_slug: string; available_upgrades: any[] }, void>({
      query: () => ({
        url: '/member-auth/membership/status/',
        method: 'GET',
      }),
      providesTags: ['MembershipSummary'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetMembershipPlansQuery,
  useCreateMembershipOrderMutation,
  useVerifyMembershipPaymentMutation,
  useGetMembershipSummaryQuery,
  useDeactivateMembershipMutation,
  useGetPaymentOrderStatusQuery,
  useGetPaymentHistoryQuery,
  useRequestRefundMutation,
  useGetRefundStatusQuery,
  useGetAvailableUpgradesQuery,
  useUpgradeMembershipMutation,
  useActivateFreePlanMutation,
  useCancelMembershipMutation,
  useGetMembershipStatusDetailQuery,
} = membershipApi;
