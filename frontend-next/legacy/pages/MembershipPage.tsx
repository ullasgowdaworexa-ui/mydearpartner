'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Sparkles, Crown, Star, Shield, Heart, ArrowRight,
  Gift, Headphones, ChevronDown, Zap, X, CreditCard, ShieldCheck, Loader2
} from 'lucide-react';
import { Link, useNavigate } from '@/lib/router-compat';
import { useAuth, UserType } from '../contexts/AuthContext';
import { fetchApi } from '../services/apiClient';

const plans = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start your journey',
    price: 'â‚¹0',
    period: null,
    perMonth: null,
    badge: null,
    accent: false,
    dark: false,
    icon: Heart,
    features: [
      'Create your profile',
      'Browse profiles',
      'Send 5 interests per day',
      'Basic search filters',
      'View limited photos',
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    tagline: 'Accelerate your search',
    price: 'â‚¹2,999',
    period: '3 Months',
    perMonth: 'â‰ˆ â‚¹1,000 / month',
    badge: null,
    accent: false,
    dark: false,
    icon: Star,
    features: [
      'Everything in Free',
      'Unlimited interests',
      'Advanced search filters',
      'View all photos',
      'Direct messaging',
      'Profile highlighting',
      'Email support',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tagline: 'AI-powered matchmaking',
    price: 'â‚¹5,999',
    period: '6 Months',
    perMonth: 'â‰ˆ â‚¹1,000 / month',
    badge: 'âœ¦ Most Popular',
    accent: true,
    dark: false,
    icon: Sparkles,
    features: [
      'Everything in Gold',
      'AI matchmaking engine',
      'Priority profile visibility',
      'Video call feature',
      'Relationship manager',
      'Profile verification status',
      'Phone support',
      'Horoscope matching',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'White-glove concierge',
    price: 'â‚¹14,999',
    period: '12 Months',
    perMonth: 'â‰ˆ â‚¹1,250 / month',
    badge: 'âœ¦ Premium',
    accent: false,
    dark: true,
    icon: Crown,
    features: [
      'Everything in Platinum',
      'Dedicated matchmaker',
      'Premium profile showcase',
      'Background verification',
      'Concierge service',
      'Exclusive events access',
      'Priority 24/7 support',
      'Guaranteed matches',
      'Wedding planning assistance',
    ],
  },
];

const faqs = [
  { q: 'Can I upgrade my plan anytime?',            a: 'Yes, you can upgrade at any time. The remaining days on your current plan will be adjusted proportionally to your new plan.' },
  { q: 'Is my payment information secure?',          a: 'Absolutely. All payments are encrypted with 256-bit SSL and processed through PCI-DSS compliant payment gateways.' },
  { q: 'What is the refund policy?',                 a: 'We offer a 7-day refund policy for paid plans. If you are not satisfied, contact our support team within 7 days of purchase.' },
  { q: 'What payment methods are accepted?',         a: 'We accept all major credit/debit cards, UPI (GPay, PhonePe, Paytm), Net Banking, and EMI options via leading banks.' },
  { q: 'What does "Guaranteed Matches" mean in Elite?', a: 'Our Elite concierge team will personally shortlist and introduce at least 10 highly compatible profiles within your membership period, or extend your plan for free.' },
];

const trust = [
  { icon: Shield,      title: 'Secure Payment',    desc: '256-bit SSL encryption' },
  { icon: Shield,      title: 'Verified Profiles', desc: 'Government ID verified' },
  { icon: Headphones,  title: '24/7 Support',      desc: 'Always here for you' },
  { icon: Gift,        title: '7-Day Refund',      desc: 'No questions asked' },
];

export default function MembershipPage() {
  const { isAuthenticated, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'processing' | 'success' | 'error'>('details');
  const [errorMsg, setErrorMsg] = useState('');
  const [activatedExpiry, setActivatedExpiry] = useState('');

  const handleSelectPlan = (plan: any) => {
    if (plan.id === 'free') {
      if (isAuthenticated) {
        navigate('/dashboard');
      } else {
        navigate('/register');
      }
      return;
    }

    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    setSelectedPlan(plan);
    setCheckoutStep('details');
    setErrorMsg('');
  };



  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setCheckoutStep('processing');
    setErrorMsg('');

    try {
      const order = await fetchApi<any>('/payments/create-order/', {
        method: 'POST',
        body: JSON.stringify({ plan_slug: selectedPlan.id, gateway: 'razorpay' })
      });

      // Automated Mock Verification in Dev/Sandbox
      if (order.verification_signature && order.gateway_reference) {
        await fetchApi<any>('/payments/verify/', {
          method: 'POST',
          body: JSON.stringify({
            payment_id: order.order_id,
            gateway_reference: order.gateway_reference,
            signature: order.verification_signature
          })
        });

        setCheckoutStep('success');
        if (updateUser) {
          const freshUser = await fetchApi<UserType>('/member-auth/me/');
          updateUser(freshUser);
        }
        return;
      }

      // Real Razorpay Checkout Flow
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      const options = {
        key: order.razorpay_key_id || 'rzp_test_placeholder',
        amount: Math.round(Number(order.amount) * 100),
        currency: order.currency || 'INR',
        name: 'My Dear Partner',
        description: `${selectedPlan.name} Plan Membership`,
        order_id: order.gateway_order_id || order.order_id,
        handler: async function (response: any) {
          try {
            setCheckoutStep('processing');
            await fetchApi<any>('/payments/verify/', {
              method: 'POST',
              body: JSON.stringify({
                payment_id: order.order_id,
                gateway_reference: response.razorpay_payment_id,
                signature: response.razorpay_signature
              })
            });

            setCheckoutStep('success');
            if (updateUser) {
              const freshUser = await fetchApi<UserType>('/member-auth/me/');
              updateUser(freshUser);
            }
          } catch (err: any) {
            setErrorMsg(err.message || 'Payment verification failed.');
            setCheckoutStep('error');
          }
        },
        prefill: {
          name: user ? `${user.first_name} ${user.last_name}` : '',
          email: user?.email || '',
          contact: user?.mobile_number || ''
        },
        theme: {
          color: '#F43F5E'
        },
        modal: {
          ondismiss: function () {
            setCheckoutStep('details');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during payment processing.');
      setCheckoutStep('error');
    }
  };

  return (
    <div className="mp-page">

      {/* ── Active Membership Banner ──────────────── */}
      {isAuthenticated && user?.account_type === 'MEMBER' && (
        <section className="mp-active-membership-banner" style={{ background: '#fff', borderBottom: '1px solid var(--line)', padding: '2rem 0' }}>
          <div className="mp-shell" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--theme-primary-50, #fff7f6)', border: '1px solid var(--theme-primary-200, #fda4af)', padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Active Plan</span>
                  <span className="font-extrabold text-lg text-slate-800">{(user as any).active_membership?.plan_name || 'Free'}</span>
                </div>
                {(user as any).active_membership?.end_date ? (
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Expires on {new Date((user as any).active_membership.end_date).toLocaleDateString()} ({(user as any).active_membership.days_remaining} days remaining)
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 font-semibold mt-1">No expiration date</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', padding: '0.75rem 1.25rem', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'bold' }}>DAILY VIEWS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'black', color: '#1e293b' }}>
                    {(user as any).active_membership?.limits?.daily_views_used ?? 0} / {(user as any).active_membership?.limits?.daily_views_limit ?? 10}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem 1.25rem', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'bold' }}>DAILY INTERESTS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'black', color: '#1e293b' }}>
                    {(user as any).active_membership?.limits?.daily_interests_used ?? 0} / {(user as any).active_membership?.limits?.daily_interests_limit ?? 5}
                  </div>
                </div>
              </div>
            </div>
            
            {(user as any).pending_request && (
              <div style={{ marginTop: '1rem', background: '#fffbeb', border: '1px solid #fde68a', padding: '1rem', borderRadius: '1rem', color: '#78350f', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ Membership Request: Pending Approval (Requested {(user as any).pending_request.plan_name} on {new Date((user as any).pending_request.requested_at).toLocaleDateString()}). You cannot submit another request until this is resolved.
              </div>
            )}
          </div>
        </section>
      )}

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mp-hero">
        <div className="mp-hero-glow mp-hero-glow-1" />
        <div className="mp-hero-glow mp-hero-glow-2" />
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .7 }}
          className="mp-hero-inner"
        >
          <div className="mp-hero-badge">
            <Zap /> Find your perfect match faster
          </div>
          <h1>Simple, transparent <em>pricing.</em></h1>
          <p>Choose the plan that fits your journey. Upgrade or cancel anytime, no hidden fees.</p>
        </motion.div>
      </section>

      {/* â”€â”€ Plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mp-plans-section">
        <div className="mp-shell">
          <div className="mp-plans-grid">
            {plans.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  id={`plan-${plan.id}`}
                  initial={{ opacity: 0, y: 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className={`mp-plan-card ${plan.accent ? 'mp-plan-accent' : ''} ${plan.dark ? 'mp-plan-dark' : ''}`}
                >
                  {plan.badge && (
                    <div className="mp-plan-badge">{plan.badge}</div>
                  )}

                  <div className="mp-plan-header">
                    <div className="mp-plan-icon">
                      <Icon />
                    </div>
                    <div className="mp-plan-name">{plan.name}</div>
                    <div className="mp-plan-tagline">{plan.tagline}</div>
                    <div className="mp-plan-price">
                      <span className="mp-plan-amount">{plan.price}</span>
                      {plan.period && <span className="mp-plan-period">/ {plan.period}</span>}
                    </div>
                    {plan.perMonth && (
                      <div className="mp-plan-per-month">{plan.perMonth}</div>
                    )}
                  </div>

                  <div className="mp-plan-body">
                    {(() => {
                      const isActive = (user as any)?.active_membership?.plan_slug === plan.id;
                      const isPending = (user as any)?.pending_request?.plan_slug === plan.id;
                      const hasAnyPending = !!(user as any)?.pending_request;
                      
                      let btnText = plan.id === 'free' ? 'Get started free' : `Choose ${plan.name}`;
                      if (isActive) btnText = 'Active Plan';
                      else if (isPending) btnText = 'Request Pending';
                      
                      return (
                        <button type="button"
                          disabled={isActive || isPending || (hasAnyPending && plan.id !== 'free')}
                          onClick={() => handleSelectPlan(plan)}
                          id={`plan-cta-${plan.id}`}
                          className={`mp-plan-cta ${plan.accent ? 'mp-plan-cta-accent' : plan.dark ? 'mp-plan-cta-dark' : 'mp-plan-cta-base'}`}
                          style={{
                            opacity: (isActive || isPending || (hasAnyPending && plan.id !== 'free')) ? 0.5 : 1,
                            cursor: (isActive || isPending || (hasAnyPending && plan.id !== 'free')) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {btnText}
                          <ArrowRight />
                        </button>
                      );
                    })()}

                    <ul className="mp-plan-features">
                      {plan.features.map((feat) => (
                        <li key={feat} className={feat.startsWith('Everything') ? 'mp-feat-inherit' : ''}>
                          <span className="mp-feat-check"><Check /></span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* â”€â”€ Trust badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mp-trust-grid"
          >
            {trust.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="mp-trust-card">
                <div className="mp-trust-icon"><Icon /></div>
                <strong>{title}</strong>
                <span>{desc}</span>
              </div>
            ))}
          </motion.div>

          {/* â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mp-faq-section"
          >
            <div className="mp-faq-head">
              <span className="mp-eyebrow">Before you commit</span>
              <h2>Frequently asked questions</h2>
            </div>
            <div className="mp-faq-list">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  id={`faq-membership-${i}`}
                  className={`mp-faq-item${openFaq === i ? ' open' : ''}`}
                >
                  <button type="button"
                    className="mp-faq-btn"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <div className="mp-faq-chevron">
                      <ChevronDown />
                    </div>
                  </button>
                  <div
                    className="mp-faq-answer-grid"
                    aria-hidden={openFaq !== i}
                  >
                    <div className="mp-faq-answer">
                        <p>{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* â”€â”€ Bottom CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mp-cta-banner"
          >
            <div className="mp-cta-glow" />
            <div className="mp-cta-inner">
              <Heart className="mp-cta-spark text-amber-300" />
              <h3>Ready to find your perfect match?</h3>
              <p>Join over 50,000 happy couples who found their life partner on My Dear Partner.</p>
              <div className="mp-cta-actions">
                <Link to="/register" id="membership-cta-register" className="mp-cta-primary">
                  Start for free <ArrowRight />
                </Link>
                <Link to="/search" id="membership-cta-browse" className="mp-cta-ghost">
                  Browse profiles
                </Link>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* â”€â”€ Secure Checkout Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              
              {/* Header */}
              <div className="relative p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-indigo-50">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-rose-500" />
                    Request Plan Activation
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Submit request for manual activation review</p>
                </div>
                <button type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 rounded-full hover:bg-slate-200/50 text-slate-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Steps Layout */}
              <div className="p-6">
                {checkoutStep === 'details' && (
                  <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                    {/* Plan summary widget */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Plan</div>
                        <div className="text-lg font-black text-slate-800">{selectedPlan.name} Plan</div>
                        <div className="text-xs text-slate-500 mt-0.5">Valid for {selectedPlan.period || 'unlimited time'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-rose-500">{selectedPlan.price}</div>
                        <div className="text-[10px] text-slate-400">Manual Activation</div>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3.5 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
                        {errorMsg}
                      </div>
                    )}

                    <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl text-xs text-slate-500 leading-relaxed">
                      ðŸ’¡ <strong>Manual Activation Mode</strong>: Online payments are currently offline. Clicking the button below will submit an activation request to our trust team. They will review and activate your plan shortly.
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-gradient-to-r gradient-primary text-slate-900 font-black text-sm shadow-xl shadow-[var(--theme-primary-500)]/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-5 h-5 text-slate-800" /> Submit Activation Request
                      </button>
                    </div>
                  </form>
                )}

                {checkoutStep === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                    <h4 className="text-lg font-bold text-slate-800">Submitting your request...</h4>
                    <p className="text-xs text-slate-500 max-w-xs text-center font-medium">
                      Registering manual activation request on servers. Please do not close or reload.
                    </p>
                  </div>
                )}

                {checkoutStep === 'success' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center shadow-lg border border-green-100">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-800">Request Submitted!</h4>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Pending administrative approval</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 w-full space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Plan Requested</span>
                        <span className="text-slate-800 font-bold">{selectedPlan.name} Tier</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Price</span>
                        <span className="text-slate-800 font-bold">{selectedPlan.price}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Status</span>
                        <span className="text-amber-600 font-bold">Pending Review</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 max-w-xs font-medium leading-relaxed">
                      Our system administrators have received your request. Your dashboard will reflect the updated plan once approved.
                    </p>

                    <button type="button"
                      onClick={() => {
                        setSelectedPlan(null);
                        navigate('/dashboard');
                      }}
                      className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xl transition-all cursor-pointer"
                    >
                      Go to Member Dashboard
                    </button>
                  </div>
                )}

                {checkoutStep === 'error' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-lg border border-rose-100">
                      <X className="w-8 h-8 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800">Transaction Failed</h4>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Payment authorization verification rejected</p>
                    </div>

                    <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl w-full text-xs text-rose-800 font-medium leading-relaxed">
                      {errorMsg || 'Your transaction request was rejected. Please review payment card info or contact support.'}
                    </div>

                    <div className="flex gap-3 w-full">
                      <button type="button"
                        onClick={() => setSelectedPlan(null)}
                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button type="button"
                        onClick={() => setCheckoutStep('details')}
                        className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg transition-all"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
