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
  Info
} from 'lucide-react';

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
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  
  // Reply & Feedback states
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [replyAttachment, setReplyAttachment] = useState<File | undefined>(undefined);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const conversationEndRef = useRef<HTMLDivElement>(null);

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
      // Fetching all tickets (we filter client-side for dynamic search and query experience)
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
    if (!routeTicketId) return;
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
      // Reset fields
      setNewSubject('');
      setNewDescription('');
      setNewCategory('OTHER');
      setNewPriority('NORMAL');
      setNewAttachment(undefined);
      setValidationErrors({});
      // Select the newly created ticket
      handleSelectTicket(created);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create support ticket.');
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
      
      // Update state locally
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

  return (
    <div className="support-container mt-20">
      
      {/* 1. Header Row */}
      <div className="support-header-row">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-gray-900">Member Help Center</h1>
          <p className="text-sm text-gray-500 mt-1">Raise support tickets, check verification progress, and talk to matches assistants.</p>
        </div>
        <button 
          type="button" 
          className="support-create-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-5 h-5" /> Raise New Ticket
        </button>
      </div>

      {/* 2. Premium Colored Statistics Cards */}
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
                <span className="stat-label">Active Tickets</span>
                <span className="stat-value">{activeCount}</span>
              </div>
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="stat-card border-l-4 border-amber-500 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="stat-label">Waiting Action</span>
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

      {/* 3. Horizontal Inline Filter Controls */}
      <div className="support-filters-bar">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ticket subjects or IDs..."
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
              âœ•
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="support-select-filter"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_USER">Waiting Action</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="support-select-filter"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
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
                <span className="text-4xl">ðŸŽ«</span>
                <h3>No Support Tickets Found</h3>
                <p className="text-xs text-gray-500 max-w-[240px] mx-auto mt-1">
                  We couldn't find any tickets matching your search query or status criteria.
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

        {/* Right Column: Active Conversation thread detail view */}
        <div className={`support-detail-viewport ${activeMobileTab === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicket ? (
            <div className="flex flex-col h-full w-full">
              
              {/* Mobile Back trigger header */}
              <div className="lg:hidden p-3 bg-gray-50 border-b border-gray-100 flex items-center">
                <button 
                  type="button" 
                  onClick={() => { setActiveMobileTab('list'); navigate('/tickets', { replace: true, preventScrollReset: true }); }}
                  className="flex items-center gap-1.5 text-sm font-bold text-[var(--theme-primary-700)] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to ticket list
                </button>
              </div>

              {/* Detail Header meta */}
              <div className="detail-panel-header">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">
                      Ticket #{selectedTicket.ticket_number} Â· Raised on {formatDate(selectedTicket.created_at).split(',')[0]}
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
                        ? `Overdue - Target resolution date was: ${formatDate(selectedTicket.sla_deadline)}` 
                        : `Target Resolution Deadline: ${formatDate(selectedTicket.sla_deadline)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Chat timeline thread body */}
              <div className="detail-panel-body">
                
                {/* Original Description complaint */}
                <div className="description-detail-card">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1.5">
                    <span>Complaint Details</span>
                    <span>{formatDate(selectedTicket.created_at)}</span>
                  </div>
                  <p className="description-detail-text">{selectedTicket.description}</p>
                  {selectedTicket.attachment && (
                    <a href={selectedTicket.attachment} target="_blank" rel="noreferrer" className="attachment-badge-link">
                      <Download className="w-3.5 h-3.5" /> Download original attachment
                    </a>
                  )}
                </div>

                {/* Conversation bubbles timeline */}
                {replies.map((reply) => {
                  const isUserSender = reply.sender?.id === selectedTicket.user?.id || reply.author?.id === selectedTicket.user?.id;
                  return (
                    <div
                      key={reply.id}
                      className={`chat-bubble-wrapper ${isUserSender ? 'user-reply' : 'agent-reply'}`}
                    >
                      <div className="chat-bubble-card">
                        <div className="chat-bubble-meta flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1 text-gray-400/80">
                          <span>{isUserSender ? 'You (Member)' : (reply.sender?.full_name || reply.author?.full_name || 'Support Specialist')}</span>
                          <span>{formatDate(reply.created_at)}</span>
                        </div>
                        <p className="chat-bubble-text text-sm leading-relaxed">{reply.message}</p>
                        {reply.attachment && (
                          <a
                            href={reply.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="attachment-badge-link mt-2 inline-flex"
                          >
                            <Download className="w-3 h-3" /> View Attachment
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={conversationEndRef} />
              </div>

              {/* Actions, Ratings & Reply edit box footer */}
              <div className="detail-panel-footer">
                {selectedTicket.status === 'RESOLVED' ? (
                  <div className="resolution-review-card">
                    <h3>Review & Close Ticket</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Our support specialists have resolved your ticket. Please confirm and close this ticket by leaving a rating feedback.
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
                            >
                              â˜…
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder="Write a brief comment about your ticket resolution (optional)..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="support-textarea-field"
                        />
                        <div className="flex gap-3 justify-center">
                          <button type="button" className="btn-primary py-2 px-5 text-sm" onClick={handleConfirmResolution}>
                            Confirm & Close
                          </button>
                          <button type="button" className="btn-secondary py-2 px-5 text-sm" onClick={handleReopenTicket}>
                            Reopen Ticket
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-green-700 font-bold text-sm">âœ“ Thank you! Resolution verified and ticket has been closed.</p>
                        <button type="button" className="btn-outline mt-3 text-xs py-1.5 px-4" onClick={handleReopenTicket}>
                          Reopen Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedTicket.status === 'CLOSED' ? (
                  <div className="resolution-review-card text-center">
                    <p className="text-sm font-semibold text-gray-500 mb-3">This support ticket is closed.</p>
                    <button type="button" className="btn-secondary py-2 px-6 text-sm" onClick={handleReopenTicket}>
                      Reopen Ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReplySubmit} className="reply-editor-form">
                    <textarea
                      placeholder="Type a response message here to reply to the agent..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="support-textarea-field"
                      required
                    />
                    <div className="flex justify-between items-center gap-4 mt-2">
                      <div className="relative overflow-hidden inline-block">
                        <button type="button" className="btn-outline flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" /> {replyAttachment ? replyAttachment.name : 'Attach File'}
                        </button>
                        <input
                          type="file"
                          accept=".jpeg,.jpg,.png,.webp,.pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => setReplyAttachment(e.target.files?.[0])}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn-primary py-2 px-6 text-sm"
                        disabled={submitLoading || !replyMessage.trim()}
                      >
                        {submitLoading ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          ) : (
            
            // Seeker Default placeholder when no ticket is selected (premium help deck)
            <div className="support-detail-empty-placeholder">
              <span className="text-6xl mb-4">ðŸŽ«</span>
              <h2>Need help? Create your first support ticket.</h2>
              <p className="text-gray-500 max-w-sm mx-auto text-sm mt-1 mb-8">
                Our support team is active 24/7 to resolve profile, search, verification, or billing enquiries.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-8 text-left">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Info className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">Payment Issues</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Refunds or gold plan unlock assistance.</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Info className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">Verification</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Identity documents audit checks.</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Info className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">Membership Limits</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Daily quota counts or plans details.</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Info className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">Report Seeker</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Flag suspected duplicate or fake accounts.</p>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                className="btn-primary py-3 px-8 text-base shadow-lg"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-5 h-5 mr-1 inline" /> Create Support Ticket
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 5. Create Ticket Dialog Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in-up">
            <div className="modal-header">
              <h2>Raise New Support Ticket</h2>
              <button 
                type="button" 
                className="close-btn"
                onClick={() => { setIsModalOpen(false); setValidationErrors({}); }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-control"
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    if (!['PAYMENT', 'ACCOUNT', 'REPORT_PROFILE'].includes(e.target.value)) {
                      setNewPriority('NORMAL');
                    }
                  }}
                >
                  <option value="PAYMENT">Payment / Subscription Query</option>
                  <option value="ACCOUNT">Account Settings / Verification</option>
                  <option value="REPORT_PROFILE">Report a Seeker Profile</option>
                  <option value="TECHNICAL">Technical Site Issue</option>
                  <option value="OTHER">General / Other Inquiries</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-control"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  {['PAYMENT', 'ACCOUNT', 'REPORT_PROFILE'].includes(newCategory) && (
                    <>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent (SLA: 1 hour)</option>
                    </>
                  )}
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
                    if (validationErrors.subject) {
                      setValidationErrors({ ...validationErrors, subject: '' });
                    }
                  }}
                  required
                />
                {validationErrors.subject && (
                  <p className="text-red-500 text-xs font-bold mt-1">âœ• {validationErrors.subject}</p>
                )}
              </div>

              <div className="form-group">
                <label>Detailed Description</label>
                <textarea
                  placeholder="Describe your issue in detail so we can reproduce it..."
                  className={`form-control ${validationErrors.description ? 'border-red-500' : ''}`}
                  style={{ minHeight: '120px' }}
                  value={newDescription}
                  onChange={(e) => {
                    setNewDescription(e.target.value);
                    if (validationErrors.description) {
                      setValidationErrors({ ...validationErrors, description: '' });
                    }
                  }}
                  required
                />
                {validationErrors.description && (
                  <p className="text-red-500 text-xs font-bold mt-1">âœ• {validationErrors.description}</p>
                )}
              </div>

              <div className="form-group">
                <label>Add Attachment (Max 5MB: Image, PDF)</label>
                <div className="relative flex items-center justify-center border-2 border-dashed border-gray-200 hover:border-[var(--theme-primary-500)] rounded-xl py-6 transition-colors">
                  <input
                    type="file"
                    accept=".jpeg,.jpg,.png,.webp,.pdf"
                    onChange={(e) => setNewAttachment(e.target.files?.[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-center text-xs text-gray-500">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <span>{newAttachment ? `Selected: ${newAttachment.name}` : 'Drag & Drop or Click to upload'}</span>
                  </div>
                </div>
              </div>

              <div className="form-actions border-t border-gray-100 pt-4 flex gap-3">
                <button 
                  type="button" 
                  className="btn-secondary py-2.5 px-6 text-sm"
                  onClick={() => { setIsModalOpen(false); setValidationErrors({}); }}
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
