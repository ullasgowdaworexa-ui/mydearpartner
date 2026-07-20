'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Gem, Crown, Star, Heart, Loader2, X, ArrowUpCircle, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/legacy/contexts/AuthContext';
import { fetchApi } from '@/legacy/services/apiClient';
import { 
  useGetMembershipPlansQuery, 
  useCreateMembershipOrderMutation,
  useVerifyMembershipPaymentMutation,
  useGetMembershipSummaryQuery,
  useGetAvailableUpgradesQuery,
  useUpgradeMembershipMutation,
  useActivateFreePlanMutation,
  useCancelMembershipMutation,
  useGetMembershipStatusDetailQuery,
  type MembershipPlan 
} from '@/legacy/services/membershipApi';
import { useGetVerificationStatusQuery } from '@/legacy/services/verificationStatusApi';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; }; }
}

const iconMap: Record<string, any> = {
  'free': Heart,
  'gold': Star,
  'platinum': Gem,
  'premium': Gem,
  'elite': Crown,
};

export default function MemberMembershipPage() {
  const { updateUser } = useAuth();
  const { data: plans = [], isLoading, error } = useGetMembershipPlansQuery();
  const { data: summary, refetch: refetchSummary } = useGetMembershipSummaryQuery();
  const { data: statusDetail, refetch: refetchStatus } = useGetMembershipStatusDetailQuery(undefined, { skip: false });
  const { data: upgrades } = useGetAvailableUpgradesQuery(undefined, { skip: false });
  const [createOrder, { isLoading: isActivating }] = useCreateMembershipOrderMutation();
  const [verifyPayment] = useVerifyMembershipPaymentMutation();
  const [upgradeMembership, { isLoading: isUpgrading }] = useUpgradeMembershipMutation();
  const [activateFree] = useActivateFreePlanMutation();
  const [cancelMembership, { isLoading: isCancelling }] = useCancelMembershipMutation();
  const { data: verification, refetch: refetchVerification } = useGetVerificationStatusQuery();

  useEffect(() => {
    refetchVerification();
  }, [refetchVerification]);
  
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (document.querySelector('script[data-razorpay-checkout]')) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    document.body.appendChild(script);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-2">Failed to load membership plans</div>
          <button onClick={() => window.location.reload()} className="text-blue-500 underline">Try again</button>
        </div>
      </div>
    );
  }

  const handleSelectPlan = async (plan: MembershipPlan) => {
    if (plan.slug === 'free') {
      if (summary?.is_free === false) {
        try {
          await activateFree().unwrap();
          setSuccessMsg('Downgraded to Free plan.');
          setCheckoutStep('success');
          await refetchSummary();
          updateUser(await fetchApi<any>('/member-auth/me/'));
          setTimeout(() => setCheckoutStep('select'), 1500);
        } catch (err: any) {
          setErrorMsg(err?.data?.message || err.message || 'Failed to switch to Free plan.');
          setCheckoutStep('error');
        }
      } else {
        window.location.href = '/dashboard';
      }
      return;
    }
    
    setSelectedPlan(plan);
    setCheckoutStep('processing');
    setErrorMsg('');
    try {
      const order = await createOrder({ plan_id: plan.id }).unwrap();
      if (!window.Razorpay) throw new Error('Secure checkout could not be loaded. Please try again.');
      setCheckoutStep('select');
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'My Dear Partner',
        description: `${order.plan.name} membership`,
        order_id: order.razorpay_order_id,
        handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setCheckoutStep('processing');
          try {
            const verified = await verifyPayment({
              internal_order_id: order.internal_order_id,
              razorpay_order_id: payment.razorpay_order_id,
              razorpay_payment_id: payment.razorpay_payment_id,
              razorpay_signature: payment.razorpay_signature,
            }).unwrap();
            setSuccessMsg(`Your ${verified.membership.plan_name} membership is active until ${new Date(verified.membership.expires_at).toLocaleDateString()}.`);
            setCheckoutStep('success');
            await refetchSummary();
            updateUser(await fetchApi<any>('/member-auth/me/'));
            setTimeout(() => { window.location.href = '/dashboard'; }, 1200);
          } catch (error: any) {
            setErrorMsg(error.message || 'We could not verify your payment. Please contact support if you were charged.');
            setCheckoutStep('error');
          }
        },
        modal: { ondismiss: () => setCheckoutStep('select') },
      });
      checkout.open();
    } catch (err: any) {
      const missing = err?.errors?.missing;
      setErrorMsg(missing?.length ? `Finish these checks first: ${missing.join(', ').replaceAll('_', ' ')}.` : (err.message || 'Failed to start secure checkout'));
      setCheckoutStep('error');
    }
  };

  const handleUpgrade = async (planSlug: string) => {
    try {
      await upgradeMembership({ plan_slug: planSlug }).unwrap();
      setSuccessMsg('Plan upgraded successfully!');
      setCheckoutStep('success');
      await refetchSummary();
      updateUser(await fetchApi<any>('/member-auth/me/'));
      setTimeout(() => setCheckoutStep('select'), 1200);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || 'Upgrade failed.');
      setCheckoutStep('error');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your membership? You will lose access to all premium features.')) return;
    try {
      await cancelMembership({ reason: 'member_requested' }).unwrap();
      setSuccessMsg('Membership cancelled. You have been downgraded to Free.');
      setCheckoutStep('success');
      await refetchSummary();
      updateUser(await fetchApi<any>('/member-auth/me/'));
      setTimeout(() => setCheckoutStep('select'), 1200);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || 'Failed to cancel.');
      setCheckoutStep('error');
    }
  };

  const formatPrice = (price: string): string => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return 'Free';
    return `₹${numPrice.toLocaleString('en-IN')}`;
  };

  const formatDuration = (days: number | null): string => {
    if (!days) return '';
    if (days === 30) return '1 Month';
    if (days === 90) return '3 Months';
    if (days === 180) return '6 Months';
    if (days === 365) return '12 Months';
    return `${days} Days`;
  };

  const getFeatures = (plan: MembershipPlan): string[] => {
    const features = [];
    if (plan.slug === 'free') {
      features.push('Create your profile');
      features.push('Browse profiles');
      features.push(`${plan.daily_profile_unlock_limit || 5} profile unlocks/day`);
      features.push(`${plan.interest_limit || 3} interests/day`);
      features.push('Basic search filters');
    } else {
      features.push('Everything in Free');
      if (plan.daily_profile_unlock_limit) {
        features.push(`${plan.daily_profile_unlock_limit} profile unlocks/day`);
      } else {
        features.push('Unlimited profile unlocks');
      }
      if (plan.interest_limit) {
        features.push(`${plan.interest_limit} interests/day`);
      } else {
        features.push('Unlimited interests');
      }
      if (plan.messaging_mode !== 'DISABLED') features.push('Direct messaging');
      if (plan.can_use_advanced_search) features.push('Advanced search filters');
      if (plan.can_view_received_interests) features.push('See received interests');
      if (plan.contact_access_mode !== 'NONE') features.push('Contact information access');
      if (plan.photo_access_mode === 'ALL_APPROVED' || plan.photo_access_mode === 'ALL') features.push('View all photos');
      if (plan.can_use_horoscope) features.push('Horoscope matching');
    }
    return features;
  };

  const isCurrentPlan = (slug: string) => summary?.plan_slug === slug && summary?.is_free === false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Current Membership Banner */}
        {summary?.has_active_plan && !summary?.is_free && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold">Your {summary.plan_name} Plan</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  {summary.days_remaining !== null && summary.days_remaining !== undefined
                    ? `${summary.days_remaining} days remaining`
                    : 'Active'}
                  {summary.end_date && ` · Valid until ${new Date(summary.end_date).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                  Cancel Plan
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upgrade your account to unlock exclusive features and find your match faster
          </p>
        </motion.div>

        {verification && !verification.is_verified && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            Complete verification before purchasing a plan: {verification.next_action}.{' '}
            <a className="font-semibold underline" href="/verification">Complete verification</a>
          </div>
        )}

        {/* Expiry Warning Banner */}
        {summary?.has_active_plan && !summary?.is_free && summary?.days_remaining !== null && summary?.days_remaining !== undefined && summary?.days_remaining <= 7 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-amber-900 text-sm">
              Your membership expires in <strong>{summary.days_remaining} day{summary.days_remaining !== 1 ? 's' : ''}</strong>.{' '}
              {summary.days_remaining <= 3
                ? 'Renew now to keep your premium features active!'
                : 'Consider renewing to avoid interruption.'}
            </span>
          </motion.div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[...plans]
            .sort((a, b) => a.display_order - b.display_order)
            .map((plan, index) => {
              const Icon = iconMap[plan.slug] || Star;
              const features = getFeatures(plan);
              const planName = plan.display_name || plan.name;
              const isCurrent = isCurrentPlan(plan.slug);
              const upgradeInfo = upgrades?.plans?.find((p: any) => p.slug === plan.slug);
              const isUpgradable = upgradeInfo?.is_upgrade && !isCurrent && plan.slug !== 'free';

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-2xl border-2 transition-all bg-white shadow-lg overflow-hidden ${
                    plan.is_featured
                      ? 'border-amber-500 ring-2 ring-amber-500/20 md:scale-105'
                      : isCurrent
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.is_featured && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold py-2 text-center">
                      Most Popular
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold py-2 text-center">
                      Current Plan
                    </div>
                  )}

                  {upgradeInfo?.is_downgrade && !isCurrent && !plan.is_featured && plan.slug !== 'free' && (
                    <div className="absolute top-0 left-0 right-0 bg-gray-500 text-white text-sm font-bold py-2 text-center">
                      Lower Tier
                    </div>
                  )}

                  <div className={`p-6 ${plan.is_featured || isCurrent ? 'pt-12' : 'pt-8'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{planName}</h3>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatPrice(plan.price)}
                        </span>
                        {plan.duration_days && (
                          <span className="text-sm text-gray-600">
                            / {formatDuration(plan.duration_days)}
                          </span>
                        )}
                      </div>
                      {plan.duration_days && parseFloat(plan.price) > 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          ≈ ₹{Math.round(parseFloat(plan.price) / (plan.duration_days / 30)).toLocaleString('en-IN')} / month
                        </div>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8 text-sm">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className={feature.startsWith('Everything') ? 'text-gray-500 italic' : 'text-gray-700'}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-3 px-4 rounded-lg font-bold bg-indigo-500 text-white cursor-default"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" />
                          Current Plan
                        </span>
                      </button>
                    ) : isUpgradable ? (
                      <button
                        onClick={() => handleUpgrade(plan.slug)}
                        disabled={isUpgrading}
                        className="w-full py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-lg transition-all disabled:opacity-50"
                      >
                        {isUpgrading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Upgrading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <ArrowUpCircle className="w-4 h-4" />
                            Upgrade to {planName}
                          </span>
                        )}
                      </button>
                    ) : plan.slug === 'free' ? (
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isActivating}
                        className="w-full py-3 px-4 rounded-lg font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all disabled:opacity-50"
                      >
                        {summary?.is_free ? 'Current Plan' : 'Switch to Free'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isActivating || (plan.slug !== 'free' && verification?.is_verified === false)}
                        className={`w-full py-3 px-4 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          plan.is_featured
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg'
                          : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-lg'
                        }`}
                      >
                        {isActivating ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Activating...
                          </span>
                        ) : verification?.is_verified === false ? (
                          'Complete verification to buy'
                        ) : (
                          `Buy ${planName}`
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {[
            { icon: '🔒', title: 'Secure Payment', desc: '256-bit SSL encryption' },
            { icon: '✅', title: 'Ready instantly', desc: 'No verification wait' },
            { icon: '📞', title: '24/7 Support', desc: 'Always here for you' },
            { icon: '💰', title: 'Money Back', desc: '7-day refund policy' },
          ].map((item, idx) => (
            <div key={idx} className="text-center p-4">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
              <div className="text-sm text-gray-600">{item.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {checkoutStep === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          >
            <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Success!</h3>
              <p className="text-gray-600 mb-4">{successMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutStep === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          >
            <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Request Failed</h3>
              <p className="text-gray-600 mb-6">{errorMsg}</p>
              <button
                onClick={() => setCheckoutStep('select')}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutStep === 'processing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          >
            <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
              <Loader2 className="w-16 h-16 animate-spin text-rose-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900">Processing...</h3>
              <p className="text-gray-600">Please wait while we process your request.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
