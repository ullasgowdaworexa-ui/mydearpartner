'use client';

import SmartImage from '@/components/shared/smart-image';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Search, Check, CheckCheck, Lock, Crown
} from 'lucide-react';
import { Link, useLocation, useSearchParams, useNavigate } from '@/lib/router-compat';
import { useAuth } from '../contexts/AuthContext';
import { getConversations, getMessages, getProfile, sendMessage } from '../services/dataService';
import { fetchApi } from '../services/apiClient';
import { generateE2EKeyPair, deriveSharedKey, deriveFallbackKey, encryptMessage, decryptMessage } from '../utils/crypto';
import { useChatSocket } from '../../hooks/use-chat-socket';
import { usePresence } from '../../hooks/use-presence';

export default function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedUserId = searchParams.get('user');
  const requestedProfile = (location.state as { profile?: any } | null)?.profile;
  const [messagingMembershipEnabled, setMessagingMembershipEnabled] = useState<boolean | null>(null);
  const [membershipPlanName, setMembershipPlanName] = useState<string | null>(null);
  const [membershipCheckVersion, setMembershipCheckVersion] = useState(0);
  const isMember = user?.account_type === 'MEMBER';
  const isBlocked = isMember && messagingMembershipEnabled === false;
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState('');
  const [chatRestriction, setChatRestriction] = useState('');

  // Live presence for the conversation partners currently on screen. The hook
  // queries POST /api/v1/presence/bulk/ for these ids and patches from
  // presence.changed WS events — no global online/offline broadcast.
  const visiblePartnerIds = useMemo(
    () => conversationsList.map((c) => c.id).concat(activeConversation?.id ? [activeConversation.id] : []),
    [conversationsList, activeConversation],
  );
  const { isOnline } = usePresence(visiblePartnerIds);

  // ``is_premium`` is a display flag retained for older clients.  Messaging
  // must use the active membership entitlement so an expired or unapproved
  // upgrade never looks available in the UI and then fails with a 403.
  useEffect(() => {
    if (!isMember) {
      setMessagingMembershipEnabled(true);
      return;
    }

    let cancelled = false;
    setMessagingMembershipEnabled(null);
    fetchApi<{ can_message?: boolean; has_active_plan?: boolean; plan_name?: string }>('/member-auth/membership/summary/')
      .then((summary) => {
        // Older deployments did not include ``can_message`` in the
        // verification-aware summary. An active paid membership is the safe
        // compatibility fallback; the server still enforces the final rule
        // for the selected chat partner.
        const allowed = typeof summary.can_message === 'boolean'
          ? summary.can_message
          : Boolean(summary.has_active_plan);
        if (!cancelled) {
          setMembershipPlanName(summary.plan_name ?? null);
          setMessagingMembershipEnabled(allowed);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMembershipPlanName(null);
          setMessagingMembershipEnabled(false);
        }
      });

    return () => { cancelled = true; };
  }, [isMember, user?.id, membershipCheckVersion]);

  // E2EE cryptographic states
  const [activeSharedKey, setActiveSharedKey] = useState<CryptoKey | null>(null);
  const [e2eeAvailable, setE2eeAvailable] = useState(false);
  const [derivingKey, setDerivingKey] = useState(false);

  // Best-effort decrypt: try the current ECDH shared key first (live messages),
  // then the deterministic PBKDF2 fallback key derived from the conversation id
  // (used by older messages encrypted before ECDH keys were fully synced).
  const tryDecrypt = useCallback(async (text: string): Promise<string> => {
    if (typeof text !== 'string' || !text.startsWith('__E2EE__:')) return text;

    const attempt = async (key: CryptoKey | null): Promise<string | null> => {
      if (!key) return null;
      try {
        const out = await decryptMessage(text, key);
        return out.startsWith('🔒') ? null : out;
      } catch {
        return null;
      }
    };

    const e2ee = await attempt(activeSharedKey);
    if (e2ee) return e2ee;

    if (activeConversation?.id) {
      const fallbackKey = await deriveFallbackKey(activeConversation.id).catch(() => null);
      const recovered = await attempt(fallbackKey);
      if (recovered) return recovered;
    }

    return '🔒 Encrypted message (sent earlier)';
  }, [activeSharedKey, activeConversation?.id]);

  const handleSocketMessage = useCallback(async (data: any) => {
    if (!activeConversation || !user) return;
    let decryptedText = data.text;
    if (typeof data.text === 'string' && data.text.startsWith('__E2EE__:')) {
      decryptedText = await tryDecrypt(data.text);
    }
    const formatted = {
      id: data.id,
      senderId: data.sender_id === user.id ? 'me' : data.sender_id,
      text: decryptedText,
      time: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: data.is_read,
    };
    setMessagesList((previous) => previous.some((message) => message.id === formatted.id) ? previous : [...previous, formatted]);
  }, [activeConversation, activeSharedKey, user]);

  const { connected: socketConnected, error: socketError, send: sendSocket } = useChatSocket({
    partnerId: activeConversation?.id,
    enabled: Boolean(activeConversation?.id && user),
    onMessage: handleSocketMessage,
  });

  // Synchronize/Generate E2EE keys for the current user on mount
  useEffect(() => {
    if (!user || user.account_type !== 'MEMBER') return;
    let active = true;

    const syncKeys = async () => {
      let privKey = localStorage.getItem('mdp.e2e.private_key');
      let pubKey = localStorage.getItem('mdp.e2e.public_key');

      if (!privKey || !pubKey) {
        try {
          const keys = await generateE2EKeyPair();
          localStorage.setItem('mdp.e2e.private_key', keys.privateKeyJwk);
          localStorage.setItem('mdp.e2e.public_key', keys.publicKeyJwk);
          privKey = keys.privateKeyJwk;
          pubKey = keys.publicKeyJwk;
        } catch (err) {
          console.error('Failed to generate E2EE keys:', err);
          return;
        }
      }

      if (!active) return;

      // If backend is missing user's public key, patch it
      if (!user.chat_public_key || user.chat_public_key !== pubKey) {
        try {
          await fetchApi('/member-auth/me/', {
            method: 'PATCH',
            body: JSON.stringify({ chat_public_key: pubKey }),
          });
          user.chat_public_key = pubKey;
        } catch (err) {
          console.error('Failed to sync public key with server:', err);
        }
      }
    };

    void syncKeys();
    return () => { active = false; };
  }, [user]);

  // Derive shared symmetric key when conversation or user changes
  useEffect(() => {
    if (!activeConversation || !activeConversation.id || !user) {
      setActiveSharedKey(null);
      return;
    }

    const prepareSharedKey = async () => {
      setDerivingKey(true);
      setE2eeAvailable(false);
      const myPrivateKey = localStorage.getItem('mdp.e2e.private_key');
      const partnerPublicKey = activeConversation.profile?.chat_public_key;

      if (myPrivateKey && partnerPublicKey) {
        try {
          const derived = await deriveSharedKey(myPrivateKey, partnerPublicKey);
          setActiveSharedKey(derived);
          setE2eeAvailable(true);
          setDerivingKey(false);
          return;
        } catch (err) {
          console.warn('ECDH shared key derivation failed:', err);
        }
      }

      // No usable partner key: don't fall back to a divergent key (that would
      // make messages undecryptable on the other side). Send plaintext instead.
      setActiveSharedKey(null);
      setDerivingKey(false);
    };

    void prepareSharedKey();
  }, [activeConversation, user]);

  // Fetch active conversations list
  useEffect(() => {
    getConversations()
      .then(async (data) => {
        let rows = data || [];
        if (requestedUserId && !rows.some((row) => row.id === requestedUserId)) {
          const profile = requestedProfile || await getProfile(requestedUserId);
          rows = [{ id: requestedUserId, profile, lastMessage: '', time: '', unread: 0, online: false, messages: [] }, ...rows];
        }
        setConversationsList(rows);
        setActiveConversation(rows.find((row) => row.id === requestedUserId) || rows[0] || null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Conversations could not be loaded.'))
      .finally(() => setLoadingChats(false));
  }, [requestedProfile, requestedUserId]);

  // Fetch message history for the selected conversation
  useEffect(() => {
    if (messagingMembershipEnabled === true && activeConversation && activeConversation.id) {
      setChatRestriction('');
      setError('');
      getMessages(activeConversation.id)
        .then(async (data) => {
          if (user) {
            const formatted = await Promise.all(data.map(async (msg: any) => {
              const decryptedText = await tryDecrypt(msg.text);
              const senderId = msg.sender_id ?? msg.sender?.id;
              return {
                id: msg.id,
                senderId: senderId === user.id ? 'me' : senderId,
                text: decryptedText,
                time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: msg.is_read
              };
            }));
            setMessagesList(formatted);
          }
        })
        .catch((err) => {
          const msg = err.message || String(err);
          if (msg.toLowerCase().includes('interest') || msg.toLowerCase().includes('mutual')) {
            setChatRestriction('You can chat after both members accept the interest.');
          } else if (msg.toLowerCase().includes('free membership') || msg.toLowerCase().includes('not included')) {
            setChatRestriction('Messaging will be available after your selected membership is activated.');
          } else if (msg.toLowerCase().includes('approve') || msg.toLowerCase().includes('pending')) {
            setChatRestriction('This member is not currently available for chat.');
          } else if (msg.toLowerCase().includes('plan') || msg.toLowerCase().includes('premium') || msg.toLowerCase().includes('gold') || msg.toLowerCase().includes('upgrade')) {
            setChatRestriction('Chat is available on Gold, Platinum, and Elite plans.');
          } else {
            setError(msg || 'Message history could not be loaded.');
          }
        });
    }
  }, [activeConversation, user, activeSharedKey, messagingMembershipEnabled]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && activeConversation && user) {
      const textToSend = newMessage;
      setNewMessage('');
      setError('');

      let encryptedText = textToSend;
      if (e2eeAvailable && activeSharedKey) {
        try {
          encryptedText = await encryptMessage(textToSend, activeSharedKey);
        } catch (err) {
          console.error('Encryption failed, sending plaintext:', err);
          encryptedText = textToSend;
        }
      }

      if (socketConnected) {
        try {
          if (!sendSocket({ text: encryptedText })) await sendViaHttp(textToSend, encryptedText);
        } catch (err) {
          console.error('WS send failed, falling back to HTTP:', err);
          await sendViaHttp(textToSend, encryptedText);
        }
      } else {
        await sendViaHttp(textToSend, encryptedText);
      }
    }
  };

  const sendViaHttp = async (originalText: string, encryptedText: string) => {
    try {
      const msg = await sendMessage(activeConversation.id, encryptedText) as any;
      const formattedMsg = {
        id: msg.id,
        senderId: 'me',
        text: originalText,
        time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      setMessagesList((prev) => {
        if (prev.some((m) => m.id === formattedMsg.id)) return prev;
        return [...prev, formattedMsg];
      });
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.toLowerCase().includes('interest') || msg.toLowerCase().includes('mutual')) {
        setError('You can chat after both members accept the interest.');
      } else if (msg.toLowerCase().includes('approve') || msg.toLowerCase().includes('pending')) {
        setError('This member is not currently available for chat.');
      } else if (msg.toLowerCase().includes('plan') || msg.toLowerCase().includes('premium') || msg.toLowerCase().includes('gold') || msg.toLowerCase().includes('upgrade')) {
        setError('Chat is available on Gold, Platinum, and Elite plans.');
      } else {
        setError(msg || 'Message could not be sent.');
      }
      setNewMessage(originalText);
    }
  };

  // Auto-scroll to the latest message whenever the conversation or its
  // messages change, so the user always sees the newest content.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesList, activeConversation?.id]);

  if (isMember && messagingMembershipEnabled === null) {
    return <div className="min-h-screen pt-32 text-center text-sm text-slate-500">Checking messaging access…</div>;
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen pt-32 pb-16 bg-[#FFFAF9] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg bg-white border border-rose-100 rounded-3xl p-8 sm:p-10 text-center shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-6">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mb-4">Premium Membership Required</h2>
          <p className="text-slate-600 text-sm sm:text-base mb-8 leading-relaxed">
            Messaging is not active for this signed-in account yet. Current plan: <strong>{membershipPlanName || 'Free'}</strong>.
            {' '}Activate the plan for this account, then recheck access.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => setMembershipCheckVersion((version) => version + 1)}
              className="py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all text-center cursor-pointer border-0"
            >
              Recheck membership
            </button>
            <Link
              to="/membership"
              className="py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-sm shadow-md hover:brightness-110 transition-all text-center"
            >
              Choose Premium Plan
            </Link>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all text-center cursor-pointer border-0"
            >
              Go to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold font-display text-gray-900">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--theme-primary-600)] to-[var(--theme-primary-400)]">Messages</span>
          </h1>
        </motion.div>
        {(error || socketError) && <div className="mb-4 rounded-xl bg-red-50 text-red-800 p-3 text-sm">{error || socketError}</div>}

        <div className="rounded-[2rem] shadow-xl border border-gray-100 bg-white/60 backdrop-blur-lg border border-white/50 overflow-hidden h-[calc(100vh-180px)] flex">
          {/* Conversation List */}
          <div className={`w-full lg:w-80 xl:w-96 border-r border-gray-100 flex flex-col ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-600)]/10 text-sm"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loadingChats && <p className="p-6 text-sm text-gray-500">Loading conversationsâ€¦</p>}
              {!loadingChats && conversationsList.length === 0 && <p className="p-6 text-sm text-gray-500">No conversations yet. Open an approved profile to start one.</p>}
              {conversationsList.map((conv) => (
                <button type="button"
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv);
                    setShowMobileChat(true);
                  }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--theme-primary-50)]/20 transition-colors border-b border-gray-50 ${
                    activeConversation?.id === conv.id ? 'bg-[var(--theme-primary-50)]/30' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <SmartImage
                      src={conv.profile.photo}
                      alt={conv.profile.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {isOnline(conv.id) && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{conv.profile.name}</h4>
                      <span className="text-[10px] text-gray-400 shrink-0">{conv.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 bg-[var(--theme-primary-600)] text-white text-[10px] rounded-full flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          {activeConversation ? (
            <div className={`flex-1 flex flex-col ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setShowMobileChat(false)}
                    className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="relative">
                    <SmartImage
                      src={activeConversation.profile.photo}
                      alt={activeConversation.profile.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {isOnline(activeConversation.id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{activeConversation.profile.name}</h4>
                    <p className="text-xs text-green-500">
                      {isOnline(activeConversation.id) ? 'Online' : 'Away'}
                    </p>
                  </div>
                </div>
              </div>

              {chatRestriction ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/20">
                  <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600 text-2xl mb-4 select-none">
                    ðŸ”’
                  </div>
                  <h4 className="font-bold text-gray-800 font-display text-base mb-1">Chat Restricted</h4>
                  <p className="text-xs text-gray-400 leading-normal max-w-xs mt-1 mb-6">
                    {chatRestriction}
                  </p>
                  {chatRestriction.toLowerCase().includes('gold') || chatRestriction.toLowerCase().includes('plan') || chatRestriction.toLowerCase().includes('upgrade') ? (
                    <a
                      href="/membership"
                      className="inline-flex py-2.5 px-6 bg-[var(--theme-primary-600)] text-white hover:bg-[var(--theme-primary-700)] rounded-full text-xs font-bold transition-all shadow-sm"
                    >
                      Upgrade Plan
                    </a>
                  ) : null}
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messagesList.map((message) => {
                      const isMe = message.senderId === 'me';
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                            <div
                              className={`px-4 py-3 rounded-2xl text-sm ${
                                isMe
                                  ? 'bg-[var(--theme-primary-600)] text-white rounded-br-md'
                                  : 'bg-gray-50 text-gray-900 rounded-bl-md'
                              }`}
                            >
                              {message.text}
                            </div>
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                              <span className="text-[10px] text-gray-400">{message.time}</span>
                              {isMe && (
                                message.read ?
                                  <CheckCheck className="w-3 h-3 text-[var(--theme-primary-400)]" /> :
                                  <Check className="w-3 h-3 text-gray-300" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a message..."
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-600)]/10 text-sm"
                        />
                      </div>
                      <button type="button"
                        onClick={handleSendMessage}
                        className="p-3 rounded-xl bg-[var(--theme-primary-600)] text-white hover:bg-[var(--theme-primary-700)] transition-colors shadow-lg shadow-[var(--theme-primary-200)]"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-16 h-16 mb-2 text-gray-300 animate-pulse" />
              <p className="font-semibold text-sm">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
