'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Gem, Crown, Star, Heart, Loader2, X, ArrowUpCircle, AlertTriangle, 
  Clock, Shield, Zap, Users, MessageCircle, Eye, Search, Camera, 
  Sparkles, Gift, Award, TrendingUp, Lock, Unlock, Calendar,
  Phone, Mail, Globe, UserCheck, Filter, Image, ChevronRight
} from 'lucide-react';
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

const planColors: Record<string, string> = {
  'free': 'from-gray-400 to-gray-600',
  'gold': 'from-yellow-400 to-yellow-600',
  'platinum': 'from-purple-400 to-purple-600', 
  'premium': 'from-indigo-400 to-indigo-600',
  'elite': 'from-pink-400 to-rose-600',
};

const planFeatureIcons: Record<string, any> = {
  'profile_unlock': Eye,
  'interests': Heart,
  'messaging': MessageCircle,
  'search': Search,
  'contact': Phone,
  'photos': Camera,
  'horoscope': Sparkles,
  'priority': TrendingUp,
  'boost': Zap,
  'verification': Shield,
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
    // Block free plan selection for paid users (strict upgrade-only rule)
    if (plan.slug === 'free') {
      setErrorMsg('You cannot downgrade to a free plan. Contact support if you need to cancel your membership.');
      setCheckoutStep('error');
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

  const getFeatures = (plan: MembershipPlan): Array<{icon: any, text: string, highlight?: boolean}> => {
    const features = [];
    
    if (plan.slug === 'free') {
      features.push(
        { icon: UserCheck, text: 'Create your profile', highlight: false },
        { icon: Eye, text: 'Browse profiles', highlight: false },
        { icon: Unlock, text: `${plan.daily_profile_unlock_limit || 5} profile views/day`, highlight: false },
        { icon: Heart, text: `${plan.interest_limit || 3} interests/day`, highlight: false },
        { icon: Search, text: 'Basic search filters', highlight: false },
        { icon: Lock, text: 'Limited messaging', highlight: false }
      );
    } else {
      features.push(
        { icon: Check, text: 'Everything in Free', highlight: false }
      );
      
      if (plan.daily_profile_unlock_limit) {
        features.push({ 
          icon: Eye, 
          text: `${plan.daily_profile_unlock_limit} profile views/day`, 
          highlight: plan.daily_profile_unlock_limit > 10 
        });
      } else {
        features.push({ icon: Eye, text: 'Unlimited profile views', highlight: true });
      }
      
      if (plan.interest_limit) {
        features.push({ 
          icon: Heart, 
          text: `${plan.interest_limit} interests/day`,
          highlight: plan.interest_limit > 10
        });
      } else {
        features.push({ icon: Heart, text: 'Unlimited interests', highlight: true });
      }
      
      if (plan.messaging_mode !== 'DISABLED') {
        features.push({ icon: MessageCircle, text: 'Direct messaging', highlight: true });
      }
      
      if (plan.can_use_advanced_search) {
        features.push({ icon: Filter, text: 'Advanced search filters', highlight: true });
      }
      
      if (plan.can_view_received_interests) {
        features.push({ icon: TrendingUp, text: 'See who liked you', highlight: true });
      }
      
      if (plan.contact_access_mode !== 'NONE') {
        features.push({ icon: Phone, text: 'Contact information access', highlight: true });
      }
      
      if (plan.photo_access_mode === 'ALL_APPROVED' || plan.photo_access_mode === 'ALL') {
        features.push({ icon: Image, text: 'View all photos', highlight: true });
      }
      
      if (plan.can_use_horoscope) {
        features.push({ icon: Sparkles, text: 'Horoscope matching', highlight: true });
      }
      
      // Premium features for higher tiers
      if (plan.slug === 'platinum' || plan.slug === 'elite') {
        features.push({ icon: Shield, text: 'Profile verification badge', highlight: true });
        features.push({ icon: Zap, text: 'Profile boost', highlight: true });
      }
      
      if (plan.slug === 'elite') {
        features.push({ icon: Crown, text: 'Priority support', highlight: true });
        features.push({ icon: Award, text: 'Elite member badge', highlight: true });
      }
    }
    return features;
  };

  const isCurrentPlan = (slug: string) => summary?.plan_slug === slug && summary?.is_free === false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Find Your Perfect Match</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-rose-100">
              Choose Your Journey
            </h1>
            <p className="text-xl text-rose-100 max-w-2xl mx-auto leading-relaxed">
              Unlock premium features and increase your chances of finding true love with our carefully crafted membership plans
            </p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        {/* Current Membership Status */}
        {summary?.has_active_plan && !summary?.is_free && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${planColors[summary.plan_slug] || 'from-indigo-500 to-purple-600'} p-8`}>
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    {React.createElement(iconMap[summary.plan_slug] || Star, { className: "w-10 h-10 text-white" })}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Your {summary.plan_name} Plan</h2>
                    <div className="flex items-center gap-4 text-white/90">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {summary.days_remaining !== null && summary.days_remaining !== undefined
                            ? `${summary.days_remaining} days remaining`
                            : 'Active'}
                        </span>
                      </div>
                      {summary.end_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Until {new Date(summary.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-white/90 text-sm text-right">
                    <p>Need help with your plan?</p>
                    <p className="font-medium">Contact our support team</p>
                  </div>
                  <MessageCircle className="w-6 h-6 text-white/80" />
                </div>
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

        {/* Verification Notice */}
        {verification && !verification.is_verified && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Account Verification Required</h3>
                <p className="text-amber-800 mb-4">Complete your profile verification to unlock premium features: {verification.next_action}</p>
                <a 
                  href="/verification" 
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  Complete Verification
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
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
              const gradientClass = planColors[plan.slug] || 'from-gray-400 to-gray-600';

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
                      <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${gradientClass} text-white`}>
                        <Icon className="w-6 h-6" />
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
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            feature.highlight ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <feature.icon className={`w-3 h-3 ${
                              feature.highlight ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <span className={`${
                            feature.text.startsWith('Everything') ? 'text-gray-500 italic' : 
                            feature.highlight ? 'text-gray-900 font-medium' : 'text-gray-700'
                          }`}>
                            {feature.text}
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
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isActivating || (plan.slug !== 'free' && verification?.is_verified === false)}
                        className={`w-full py-3 px-4 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                          plan.is_featured
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
                          : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600'
                        }`}
                      >
                        {isActivating ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Activating...
                          </span>
                        ) : verification?.is_verified === false ? (
                          'Complete verification to upgrade'
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <ArrowUpCircle className="w-4 h-4" />
                            Upgrade to {planName}
                          </span>
                        )}
                      </button>
                    ) : plan.slug === 'free' ? (
                      <button
                        disabled
                        className="w-full py-3 px-4 rounded-lg font-bold bg-gray-300 text-gray-600 cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Contact Support to Cancel
                        </span>
                      </button>
                    ) : upgradeInfo?.is_downgrade ? (
                      <button
                        disabled
                        className="w-full py-3 px-4 rounded-lg font-bold bg-gray-300 text-gray-600 cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" />
                          Downgrade Not Allowed
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isActivating || (plan.slug !== 'free' && verification?.is_verified === false)}
                        className={`w-full py-3 px-4 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                          plan.is_featured
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
                          : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600'
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
                          <span className="flex items-center justify-center gap-2">
                            <Gift className="w-4 h-4" />
                            Get {planName}
                          </span>
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
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Why Choose Our Premium Plans?</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Secure Payment', desc: 'Bank-level encryption & security', color: 'from-blue-400 to-blue-600' },
              { icon: Zap, title: 'Instant Activation', desc: 'Premium features unlock immediately', color: 'from-yellow-400 to-yellow-600' },
              { icon: Users, title: '24/7 Support', desc: 'Dedicated support team always ready', color: 'from-green-400 to-green-600' },
              { icon: Globe, title: 'Money Back Guarantee', desc: '7-day full refund policy', color: 'from-purple-400 to-purple-600' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
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
