import { baseApi } from './baseApi';

export interface SupportDashboardSummary {
  assigned: number;
  in_progress: number;
  urgent: number;
  overdue: number;
  waiting_for_member: number;
  escalated: number;
  resolved_today: number;
}

export interface SupportDashboardData {
  summary: SupportDashboardSummary;
  average_first_response_minutes: number | null;
  recent_tickets: any[];
  recent_activity: any[];
  unread_notifications: number;
}

export interface CSQueueQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  overdue?: boolean;
  ordering?: string;
  available?: boolean;
}

export const customerSupportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSupportDashboard: builder.query<SupportDashboardData, void>({
      query: () => ({ url: '/customer-support/dashboard/' }),
      providesTags: ['CSDashboard'],
    }),
    getAssignedTickets: builder.query<{ count: number; results: any[] }, CSQueueQuery>({
      query: (params) => ({
        url: '/customer-support/tickets/',
        params: params as any,
      }),
      providesTags: ['CSQueue'],
    }),
    getTicketDetails: builder.query<any, string>({
      query: (id) => ({ url: `/customer-support/tickets/${id}/` }),
      providesTags: (_result, _err, id) => [{ type: 'CSQueue', id }],
    }),
    replyToTicket: builder.mutation<any, { ticketId: string; message: string }>({
      query: ({ ticketId, message }) => ({
        url: `/customer-support/tickets/${ticketId}/`,
        method: 'POST',
        params: { action: 'reply' },
        body: { message },
      }),
      invalidatesTags: (_result, _err, { ticketId }) => ['CSQueue', 'CSDashboard', { type: 'CSQueue', id: ticketId }],
    }),
    addInternalNote: builder.mutation<any, { ticketId: string; message: string }>({
      query: ({ ticketId, message }) => ({
        url: `/customer-support/tickets/${ticketId}/`,
        method: 'POST',
        params: { action: 'note' },
        body: { message },
      }),
      invalidatesTags: (_result, _err, { ticketId }) => ['CSQueue', 'CSDashboard', { type: 'CSQueue', id: ticketId }],
    }),
    updateTicketStatus: builder.mutation<any, { ticketId: string; status: string; reason?: string }>({
      query: ({ ticketId, status, reason }) => ({
        url: `/customer-support/tickets/${ticketId}/`,
        method: 'POST',
        params: { action: 'status' },
        body: { status, reason },
      }),
      invalidatesTags: (_result, _err, { ticketId }) => ['CSQueue', 'CSDashboard', { type: 'CSQueue', id: ticketId }],
    }),
    escalateTicket: builder.mutation<any, { ticketId: string; reason: string }>({
      query: ({ ticketId, reason }) => ({
        url: `/customer-support/tickets/${ticketId}/`,
        method: 'POST',
        params: { action: 'status' },
        body: { status: 'ESCALATED', reason },
      }),
      invalidatesTags: (_result, _err, { ticketId }) => ['CSQueue', 'CSDashboard', { type: 'CSQueue', id: ticketId }],
    }),
    resolveTicket: builder.mutation<any, { ticketId: string; reason?: string }>({
      query: ({ ticketId, reason }) => ({
        url: `/customer-support/tickets/${ticketId}/`,
        method: 'POST',
        params: { action: 'status' },
        body: { status: 'RESOLVED', reason },
      }),
      invalidatesTags: (_result, _err, { ticketId }) => ['CSQueue', 'CSDashboard', { type: 'CSQueue', id: ticketId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSupportDashboardQuery,
  useGetAssignedTicketsQuery,
  useGetTicketDetailsQuery,
  useReplyToTicketMutation,
  useAddInternalNoteMutation,
  useUpdateTicketStatusMutation,
  useEscalateTicketMutation,
  useResolveTicketMutation,
} = customerSupportApi;
