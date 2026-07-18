import { baseApi } from './baseApi';

export interface VerificationStatus {
  account_status: 'INCOMPLETE' | 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  is_verified: boolean;
  contact: {
    status: 'incomplete' | 'approved';
    name: string;
    reason?: string | null;
  };
  profile: {
    status: 'incomplete' | 'pending' | 'approved' | 'rejected';
    submitted_at: string | null;
    reviewed_at: string | null;
    reason: string | null;
  };
  primary_photo: {
    status: 'incomplete' | 'pending' | 'approved' | 'rejected';
    submitted_at: string | null;
    reviewed_at: string | null;
    reason: string | null;
  };
  documents: {
    status: 'incomplete' | 'pending' | 'approved' | 'rejected';
    submitted_at: string | null;
    reviewed_at: string | null;
    reason: string | null;
  };
  next_action: string;
  membership_pending: boolean;
}

export const verificationStatusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVerificationStatus: builder.query<VerificationStatus, void>({
      query: () => ({
        url: '/member-auth/verification/status/',
        method: 'GET',
      }),
      transformResponse: (response: any) => response,
      providesTags: ['VerificationStatus'],
    }),
  }),
});

export const {
  useGetVerificationStatusQuery,
} = verificationStatusApi;
