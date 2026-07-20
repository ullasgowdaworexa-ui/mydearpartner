'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { supportService, SupportTicket, TicketReply } from '../services/supportService';
import {
  StatsSkeleton,
  TicketListSkeleton,
  ConversationSkeleton
} from '../components/SkeletonLoader';
import {
  FileText,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  X,
  Upload,
  ArrowLeft,
  CornerDownRight,
  Download,
  Info,
  LifeBuoy,
  Send,
  Star,
  Paperclip,
  Image as ImageIcon
} from 'lucide-react';

// ─── Attachment Preview helper ──────────────────────────────────────────────
function AttachmentPreview({ url, filename, mimeType }: { url?: string | null; filename?: string; mimeType?: string }) {
  if (!url) return null;
  const isImage = mimeType?.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif)$/i.test(filename || url);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mt-2">
        <img
          src={url}
          alt={filename || 'Attachment'}
          className="max-h-52 rounded-xl border border-gray-100 shadow-sm object-cover hover:opacity-90 transition-opacity"
          style={{ maxWidth: '100%' }}
        />
        <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />{filename || 'View image'}
        </span>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="attachment-badge-link mt-2 inline-flex">
      {/\.pdf$/i.test(filename || url) ? <FileText className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
      {filename || 'Download attachment'}
    </a>
  );
}
// ────────────────────────────────────────────────────────────────────────────

// Values MUST match the seeded SupportCategory.code values in backend
// apps/core/baseline.py (GENERAL, PAYMENTS, PROFILE_VERIFICATION, TECHNICAL,
// REFUNDS, SAFETY). Sending any other value returns "Choose a valid support category."
const CATEGORY_OPTIONS: { value: string; label: string; icon: string; blurb: string; subjectHint: string }[] = [
  { value: 'PAYMENTS', label: 'Payments & Plans', icon: '💳', blurb: 'Plan unlocks, billing and subscription queries.', subjectHint: 'Issue with my plan / payment' },
  { value: 'REFUNDS', label: 'Refunds', icon: '💰', blurb: 'Request a refund for a completed payment.', subjectHint: 'Refund request for my order' },
  { value: 'PROFILE_VERIFICATION', label: 'Account & Verification', icon: '🪪', blurb: 'Profile, login and KYC document checks.', subjectHint: 'Need help with verification' },
  { value: 'SAFETY', label: 'Report a Profile', icon: '🚩', blurb: 'Flag fake, duplicate or abusive members.', subjectHint: 'Report a suspicious profile' },
  { value: 'TECHNICAL', label: 'Technical Issue', icon: '🛠️', blurb: 'Site or app bugs, upload failures.', subjectHint: 'Something is not working' },
  { value: 'GENERAL', label: 'General Enquiry', icon: '💬', blurb: 'Anything else we can help with.', subjectHint: 'General question' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

function categoryMeta(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

export default function SupportPage() {
  const navigate = useNavigate();
  const { id: routeTicketId } = useParams<{ id?: string }>();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Loading & Action states
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'detail'>('list');

  // Modal for new ticket creation
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newSubject, setNewSubject] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('OTHER');
  const [newPriority, setNewPriority] = useState<string>('NORMAL');
  const [newAttachment, setNewAttachment] = useState<File | undefined>(undefined);
  const [newAttachmentPreview, setNewAttachmentPreview] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Reply & Feedback states
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [replyAttachment, setReplyAttachment] = useState<File | undefined>(undefined);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const conversationEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 300ms Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await supportService.listTickets(statusFilter);
      setTickets(data.results);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!routeTicketId) {
      setSelectedTicket(null);
      setReplies([]);
      return;
    }
    supportService.getTicketDetails(routeTicketId)
      .then((details) => {
        setSelectedTicket(details);
        setReplies(details.replies || []);
        setFeedbackSubmitted(Boolean((details as any).feedback));
        setActiveMobileTab('detail');
      })
      .catch((error) => setErrorMsg(error instanceof Error ? error.message : 'Failed to retrieve ticket details.'));
  }, [routeTicketId]);

  // Scroll to end of conversation thread on detail load
  useEffect(() => {
    if (selectedTicket) {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies, selectedTicket]);

  const handleSelectTicket = async (ticket: SupportTicket) => {
    navigate(`/tickets/${ticket.id}`, { preventScrollReset: true });
    setErrorMsg(null);
    try {
      const details = await supportService.getTicketDetails(ticket.id);
      setSelectedTicket(details);
      setReplies(details.replies || []);
      setFeedbackSubmitted(!!(details as any).feedback);
      setReplyMessage('');
      setReplyAttachment(undefined);
      setActiveMobileTab('detail');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve ticket details.');
    }
  };

  const openCreateModal = (presetCategory = 'GENERAL') => {
    setNewCategory(presetCategory);
    setNewSubject(categoryMeta(presetCategory).subjectHint);
    setNewPriority('NORMAL');
    setNewDescription('');
    setNewAttachment(undefined);
    if (newAttachmentPreview) URL.revokeObjectURL(newAttachmentPreview);
    setNewAttachmentPreview(null);
    setAttachmentError(null);
    setCreateError(null);
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
  const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    if (newAttachmentPreview) {
      URL.revokeObjectURL(newAttachmentPreview);
      setNewAttachmentPreview(null);
    }
    const file = e.target.files?.[0];
    if (!file) {
      setNewAttachment(undefined);
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachmentError('Only JPG, PNG, WEBP or PDF files are supported.');
      setNewAttachment(undefined);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError('File is too large. Maximum size is 5MB.');
      setNewAttachment(undefined);
      return;
    }
    setNewAttachment(file);
    if (file.type.startsWith('image/')) {
      setNewAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const validateTicketForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    if (!newSubject.trim()) {
      errors.subject = 'Subject is required.';
    } else if (newSubject.length < 5) {
      errors.subject = 'Subject must be at least 5 characters.';
    }
    if (!newDescription.trim()) {
      errors.description = 'Description is required.';
    } else if (newDescription.length < 15) {
      errors.description = 'Description must explain the issue (at least 15 characters).';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTicketForm()) return;

    setSubmitLoading(true);
    setCreateError(null);
    setErrorMsg(null);
    try {
      const created = await supportService.createTicket(
        newSubject,
        newDescription,
        newCategory,
        newPriority,
        newAttachment
      );
      setTickets([created, ...tickets]);
      setIsModalOpen(false);
      setNewSubject('');
      setNewDescription('');
      setNewCategory('GENERAL');
      setNewPriority('NORMAL');
      setNewAttachment(undefined);
      if (newAttachmentPreview) {
        URL.revokeObjectURL(newAttachmentPreview);
        setNewAttachmentPreview(null);
      }
      setValidationErrors({});
      handleSelectTicket(created);
    } catch (err: any) {
      console.error(err);
      setCreateError(err?.message || 'Failed to create support ticket. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSubmitLoading(true);
    try {
      const newReply = await supportService.replyTicket(
        selectedTicket.id,
        replyMessage,
        replyAttachment
      );
      setReplies([...replies, newReply]);
      setReplyMessage('');
      setReplyAttachment(undefined);

      setSelectedTicket({
        ...selectedTicket,
        status: selectedTicket.status === 'WAITING_FOR_USER' ? 'IN_PROGRESS' : selectedTicket.status,
        last_reply_at: new Date().toISOString()
      });
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!selectedTicket) return;
    try {
      await supportService.confirmResolution(
        selectedTicket.id,
        feedbackRating,
        feedbackText
      );
      setFeedbackSubmitted(true);
      setSelectedTicket({
        ...selectedTicket,
        status: 'RESOLVED',
        resolved_at: new Date().toISOString()
      });
      alert('Resolution confirmed. Thank you for your feedback!');
      void loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback.');
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      const updated = await supportService.reopenTicket(selectedTicket.id);
      setSelectedTicket(updated);
      setReplies(updated.replies || []);
      setFeedbackSubmitted(false);
      alert('Ticket reopened successfully.');
      void loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket.');
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // Client side filters application
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    const matchesPriority = priorityFilter ? t.priority === priorityFilter : true;
    return matchesSearch && matchesPriority;
  });

  // Calculate statistics metrics
  const activeCount = tickets.filter(t => ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(t.status)).length;
  const waitingCount = tickets.filter(t => t.status === 'WAITING_FOR_USER').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const highPriorityCount = tickets.filter(t => ['HIGH', 'URGENT'].includes(t.priority)).length;

  const statusTabs = [
    { value: '', label: 'All' },
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'WAITING_FOR_USER', label: 'Awaiting You' },
    { value: 'RESOLVED', label: 'Resolved' },
  ];

  return (
    <div className="support-container mt-20">

      {/* 1. Header Row */}
      <div className="support-header-row">
        <div>
          <span className="support-eyebrow"><LifeBuoy className="w-4 h-4" /> Help Center</span>
          <h1 className="text-3xl font-extrabold font-display text-gray-900">We&apos;re here to help</h1>
          <p className="text-sm text-gray-500 mt-1">Raise a ticket, track its status, and chat with our support team — all in one place.</p>
        </div>
        <button
          type="button"
          className="support-create-btn"
          onClick={() => openCreateModal('OTHER')}
        >
          <Plus className="w-5 h-5" /> New Ticket
        </button>
      </div>

      {/* 2. Statistics Cards */}
      {loading ? <StatsSkeleton /> : (
        <div className="support-stats-grid">
          <div className="stat-card border-l-4 border-indigo-500 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="stat-label">Total Tickets</span>
                <span className="stat-value">{tickets.length}</span>
              </div>
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
          <div className="stat-card border-l-4 border-blue-500 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="stat-label">Active</span>
                <span className="stat-value">{activeCount}</span>
              </div>
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="stat-card border-l-4 border-amber-500 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="stat-label">Awaiting You</span>
                <span className="stat-value">{waitingCount}</span>
              </div>
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <div className="stat-card border-l-4 border-green-500 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="stat-label">Resolved</span>
                <span className="stat-value">{resolvedCount}</span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="stat-card border-l-4 border-red-500 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="stat-label">High Priority</span>
                <span className="stat-value text-red-600">{highPriorityCount}</span>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Error alert wrapper */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 mb-6 flex justify-between items-center text-sm font-semibold">
          <span>{errorMsg}</span>
          <button type="button" className="text-red-950 font-bold" onClick={() => setErrorMsg(null)}>Dismiss</button>
        </div>
      )}

      {/* 3. Filters Bar */}
      <div className="support-filters-bar">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets or IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="support-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="support-status-tabs">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`support-status-tab ${statusFilter === tab.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="support-select-filter"
          aria-label="Filter by priority"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* 4. Split Pane Workspace */}
      <div className="support-workspace-layout">

        {/* Left Column: Ticket List */}
        <div className={`support-list-viewport ${activeMobileTab === 'detail' ? 'hidden lg:block' : ''}`}>
          <div className="list-viewport-header">
            <h2>Your Support Tickets</h2>
            <span className="ticket-count-badge">{filteredTickets.length} tickets</span>
          </div>

          <div className="list-viewport-content">
            {loading ? <TicketListSkeleton /> : filteredTickets.length === 0 ? (
              <div className="support-empty-list-box">
                <span className="text-4xl">🎫</span>
                <h3>No Support Tickets Found</h3>
                <p className="text-xs text-gray-500 max-w-[240px] mx-auto mt-1">
                  {tickets.length === 0
                    ? "You haven't raised any tickets yet. We're happy to help whenever you need us."
                    : "We couldn't find any tickets matching your search or filter."}
                </p>
                <button
                  type="button"
                  className="btn-outline text-xs mt-4 py-1.5 px-3"
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); setPriorityFilter(''); }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`support-ticket-card ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="ticket-card-id">#{ticket.ticket_number}</span>
                    <span className="ticket-card-date">{formatDate(ticket.created_at).split(',')[0]}</span>
                  </div>
                  <h3 className="ticket-card-subject">{ticket.subject}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className={`status-badge stat-${ticket.status.toLowerCase().replace('_', '-')}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className={`priority-badge prio-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                    <span className="category-badge">
                      {ticket.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Conversation */}
        <div className={`support-detail-viewport ${activeMobileTab === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicket ? (
            <div className="flex flex-col h-full w-full">

              {/* Mobile Back header */}
              <div className="lg:hidden p-3 bg-gray-50 border-b border-gray-100 flex items-center">
                <button
                  type="button"
                  onClick={() => { setActiveMobileTab('list'); navigate('/tickets', { replace: true, preventScrollReset: true }); }}
                  className="flex items-center gap-1.5 text-sm font-bold text-[var(--theme-primary-700)] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to tickets
                </button>
              </div>

              {/* Detail Header */}
              <div className="detail-panel-header">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">
                      Ticket #{selectedTicket.ticket_number} · Raised on {formatDate(selectedTicket.created_at).split(',')[0]}
                    </span>
                    <h2>{selectedTicket.subject}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`status-badge stat-${selectedTicket.status.toLowerCase().replace('_', '-')}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className={`priority-badge prio-${selectedTicket.priority.toLowerCase()}`}>
                        {selectedTicket.priority}
                      </span>
                      <span className="category-badge">
                        {selectedTicket.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTicket.sla_deadline && (
                  <div className={`sla-deadline-box ${new Date(selectedTicket.sla_deadline) < new Date() ? 'overdue' : ''}`}>
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {new Date(selectedTicket.sla_deadline) < new Date()
                        ? `Overdue — target was: ${formatDate(selectedTicket.sla_deadline)}`
                        : `Target resolution: ${formatDate(selectedTicket.sla_deadline)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Conversation timeline */}
              <div className="detail-panel-body">

                {/* Original description */}
                <div className="description-detail-card">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1.5">
                    <span>You reported</span>
                    <span>{formatDate(selectedTicket.created_at)}</span>
                  </div>
                  <p className="description-detail-text">{selectedTicket.description}</p>
                  {(selectedTicket.attachments && selectedTicket.attachments.length > 0)
                    ? selectedTicket.attachments.map((att: any) => (
                        <AttachmentPreview key={att.id} url={att.download_url} filename={att.original_filename} mimeType={att.mime_type} />
                      ))
                    : <AttachmentPreview url={selectedTicket.attachment} />
                  }
                </div>

                {/* Replies */}
                {replies.map((reply) => {
                  const isUserSender = reply.sender?.id === selectedTicket.user?.id || reply.author?.id === selectedTicket.user?.id;
                  return (
                    <div
                      key={reply.id}
                      className={`chat-bubble-wrapper ${isUserSender ? 'user-reply' : 'agent-reply'}`}
                    >
                      <div className={`chat-avatar ${isUserSender ? 'avatar-user' : 'avatar-agent'}`}>
                        {isUserSender ? 'You' : (reply.sender?.full_name || reply.author?.full_name || 'Support').slice(0, 2)}
                      </div>
                      <div className="chat-bubble-card">
                        <div className="chat-bubble-meta flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1 text-gray-400/80">
                          <span>{isUserSender ? 'You' : (reply.sender?.full_name || reply.author?.full_name || 'Support Specialist')}</span>
                          <span>{formatDate(reply.created_at)}</span>
                        </div>
                        <p className="chat-bubble-text text-sm leading-relaxed">{reply.message}</p>
                        {(reply.attachments && reply.attachments.length > 0)
                          ? reply.attachments.map((att: any) => (
                              <AttachmentPreview key={att.id} url={att.download_url} filename={att.original_filename} mimeType={att.mime_type} />
                            ))
                          : <AttachmentPreview url={reply.attachment} />
                        }
                      </div>
                    </div>
                  );
                })}
                <div ref={conversationEndRef} />
              </div>

              {/* Footer actions / reply */}
              <div className="detail-panel-footer">
                {selectedTicket.status === 'RESOLVED' ? (
                  <div className="resolution-review-card">
                    <h3>How did we do?</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Your ticket is resolved. Let us know how we did — your feedback helps us improve.
                    </p>

                    {!feedbackSubmitted ? (
                      <div className="space-y-4">
                        <div className="star-rating-row">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className={`star-icon-btn ${star <= feedbackRating ? 'selected' : ''}`}
                              aria-label={`Rate ${star} star`}
                            >
                              <Star className="w-7 h-7" fill={star <= feedbackRating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder="Anything you'd like to share? (optional)"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="support-textarea-field"
                        />
                        <div className="flex gap-3 justify-center">
                          <button type="button" className="btn-primary py-2 px-5 text-sm" onClick={handleConfirmResolution}>
                            Submit & Close
                          </button>
                          <button type="button" className="btn-secondary py-2 px-5 text-sm" onClick={handleReopenTicket}>
                            Reopen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-green-700 font-bold text-sm">✓ Thank you! Your ticket is closed.</p>
                        <button type="button" className="btn-outline mt-3 text-xs py-1.5 px-4" onClick={handleReopenTicket}>
                          Reopen Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedTicket.status === 'CLOSED' ? (
                  <div className="resolution-review-card text-center">
                    <p className="text-sm font-semibold text-gray-500 mb-3">This ticket is closed.</p>
                    <button type="button" className="btn-secondary py-2 px-6 text-sm" onClick={handleReopenTicket}>
                      Reopen Ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReplySubmit} className="reply-editor-form">
                    <textarea
                      placeholder="Write a reply to the support team..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="support-textarea-field"
                      required
                    />
                    <div className="flex justify-between items-center gap-4 mt-2">
                      <button
                        type="button"
                        className="btn-outline flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-3.5 h-3.5" /> {replyAttachment ? replyAttachment.name : 'Attach'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpeg,.jpg,.png,.webp,.pdf"
                        className="hidden"
                        onChange={(e) => setReplyAttachment(e.target.files?.[0])}
                      />
                      <button
                        type="submit"
                        className="btn-primary py-2 px-6 text-sm flex items-center gap-2"
                        disabled={submitLoading || !replyMessage.trim()}
                      >
                        {submitLoading ? 'Sending...' : (<><Send className="w-4 h-4" /> Send</>)}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          ) : (

            // Empty placeholder
            <div className="support-detail-empty-placeholder">
              <span className="empty-illustration">💌</span>
              <h2>How can we help you today?</h2>
              <p className="text-gray-500 max-w-sm mx-auto text-sm mt-1 mb-8">
                Pick a topic to get started, or raise a ticket and our team will get back to you shortly.
              </p>

              <div className="support-category-grid">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className="support-category-tile"
                    onClick={() => openCreateModal(cat.value)}
                  >
                    <span className="support-category-icon">{cat.icon}</span>
                    <span className="support-category-label">{cat.label}</span>
                    <span className="support-category-blurb">{cat.blurb}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-primary py-3 px-8 text-base shadow-lg mt-8"
                onClick={() => openCreateModal('GENERAL')}
              >
                <Plus className="w-5 h-5 mr-1 inline" /> Raise a Ticket
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 5. Create Ticket Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in-up">
            <div className="modal-header">
              <h2>Raise a Support Ticket</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => { setIsModalOpen(false); setValidationErrors({}); setCreateError(null); if (newAttachmentPreview) { URL.revokeObjectURL(newAttachmentPreview); setNewAttachmentPreview(null); } }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              {createError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {createError}
                </div>
              )}
              <div className="form-group">
                <label>What is it about?</label>
                <div className="support-category-chips">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`support-category-chip ${newCategory === cat.value ? 'active' : ''}`}
                      onClick={() => {
                        setNewCategory(cat.value);
                        setNewSubject(cat.subjectHint);
                      }}
                    >
                      <span aria-hidden>{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-control"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Summarize your issue..."
                  className={`form-control ${validationErrors.subject ? 'border-red-500' : ''}`}
                  value={newSubject}
                  onChange={(e) => {
                    setNewSubject(e.target.value);
                    if (validationErrors.subject) setValidationErrors({ ...validationErrors, subject: '' });
                  }}
                  required
                />
                {validationErrors.subject && (
                  <p className="text-red-500 text-xs font-bold mt-1">✕ {validationErrors.subject}</p>
                )}
              </div>

              <div className="form-group">
                <label>Describe the issue</label>
                <textarea
                  placeholder="Share the details so we can help faster..."
                  className={`form-control ${validationErrors.description ? 'border-red-500' : ''}`}
                  style={{ minHeight: '120px' }}
                  value={newDescription}
                  onChange={(e) => {
                    setNewDescription(e.target.value);
                    if (validationErrors.description) setValidationErrors({ ...validationErrors, description: '' });
                  }}
                  required
                />
                {validationErrors.description && (
                  <p className="text-red-500 text-xs font-bold mt-1">✕ {validationErrors.description}</p>
                )}
              </div>

              <div className="form-group">
                <label>Attachment (optional · image or PDF, max 5MB)</label>
                <div className="relative flex items-center justify-center border-2 border-dashed border-gray-200 hover:border-[var(--theme-primary-500)] rounded-xl py-6 transition-colors">
                  <input
                    type="file"
                    accept=".jpeg,.jpg,.png,.webp,.pdf,image/*,application/pdf"
                    onChange={handleAttachmentChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-center text-xs text-gray-500">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <span>{newAttachment ? `Selected: ${newAttachment.name}` : 'Click to upload a screenshot or document'}</span>
                  </div>
                </div>
                {newAttachmentPreview && (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newAttachmentPreview}
                      alt="Attachment preview"
                      className="max-h-44 w-auto rounded-lg border border-gray-200 object-contain"
                    />
                  </div>
                )}
                {attachmentError && (
                  <p className="text-red-500 text-xs font-bold mt-1">✕ {attachmentError}</p>
                )}
              </div>

              <div className="form-actions border-t border-gray-100 pt-4 flex gap-3">
                <button
                  type="button"
                  className="btn-secondary py-2.5 px-6 text-sm"
                  onClick={() => { setIsModalOpen(false); setValidationErrors({}); setCreateError(null); if (newAttachmentPreview) { URL.revokeObjectURL(newAttachmentPreview); setNewAttachmentPreview(null); } }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2.5 px-6 text-sm"
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
