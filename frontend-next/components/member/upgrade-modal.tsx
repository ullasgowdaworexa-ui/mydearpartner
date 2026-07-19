'use client';

import { motion } from 'framer-motion';
import { X, Check, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMembership } from './membership-provider';
import { useGetMembershipPlansQuery, type MembershipPlan } from '@/legacy/services/membershipApi';

interface UpgradeModalProps {
  feature: 'messaging' | 'advanced_search' | 'contact_details' | 'all_photos';
  onClose: () => void;
}

const featureConfig = {
  messaging: {
    icon: '💬',
    title: 'Messaging',
    description: 'Send direct messages to connections',
    benefits: [
      'Direct messaging with connections',
      'Chat history saved',
      'Real-time notifications',
      'Message at no extra cost',
    ],
    planCheck: (plan: MembershipPlan) =>
      plan.messaging_mode !== 'DISABLED' || (plan as any).can_message === true,
  },
  advanced_search: {
    icon: '🔍',
    title: 'Advanced Search',
    description: 'Find your match with detailed filters',
    benefits: [
      'Filter by income, education, caste',
      'Location-based search',
      'Horoscope compatibility',
      'Save search preferences',
    ],
    planCheck: (plan: MembershipPlan) => plan.can_use_advanced_search === true,
  },
  contact_details: {
    icon: '📞',
    title: 'Contact Information',
    description: 'Get full contact details of connections',
    benefits: [
      'View phone number',
      'See email address',
      'Save contact info',
      'Share safely',
    ],
    planCheck: (plan: MembershipPlan) => plan.contact_access_mode !== 'NONE',
  },
  all_photos: {
    icon: '📸',
    title: 'All Photos',
    description: 'View all approved photos',
    benefits: [
      'See all profile photos',
      'Photo validation',
      'Album view',
    ],
    planCheck: (plan: MembershipPlan) =>
      plan.photo_access_mode === 'ALL_APPROVED' || plan.photo_access_mode === 'ALL',
  },
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (!num) return 'Free';
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatDuration(days: number | null): string {
  if (!days) return '';
  if (days <= 31) return '1 Month';
  if (days <= 92) return '3 Months';
  if (days <= 185) return '6 Months';
  if (days <= 370) return '12 Months';
  return `${days} Days`;
}

export default function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const { membershipSummary } = useMembership();
  const { data: allPlans = [], isLoading } = useGetMembershipPlansQuery();
  const config = featureConfig[feature];

  // Only show active, paid plans that include this feature (sorted by display_order)
  const eligiblePlans = allPlans
    .filter((p) => p.slug !== 'free' && config.planCheck(p))
    .sort((a, b) => a.display_order - b.display_order);

  // Name of the cheapest plan that has the feature
  const requiredPlanName = eligiblePlans[0]?.display_name || eligiblePlans[0]?.name || 'Gold';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-3xl">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{config.title}</h3>
            <p className="text-sm text-slate-600">{config.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Feature Icon */}
          <div className="text-center">
            <div className="text-6xl mb-3 inline-block">{config.icon}</div>
            <p className="text-sm text-slate-600">
              Available with <span className="font-bold text-rose-600">{requiredPlanName}</span> and above
            </p>
          </div>

          {/* Current Plan Info */}
          {membershipSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-900 uppercase mb-1">
                Your Current Plan
              </p>
              <p className="text-lg font-bold text-blue-900">{membershipSummary.plan_name}</p>
              <p className="text-sm text-blue-700 mt-1">
                {membershipSummary.is_free
                  ? 'Upgrade to unlock this feature'
                  : '✓ This feature is included in your plan'}
              </p>
            </div>
          )}

          {/* Benefits */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">What you'll get</h4>
            <div className="space-y-2">
              {config.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 text-sm text-slate-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          {/* Plans from database */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Plans that include this feature</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
              </div>
            ) : eligiblePlans.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No paid plans available.</p>
            ) : (
              <div className="space-y-3">
                {eligiblePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-xl p-4 transition-all ${
                      plan.is_featured
                        ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/20'
                        : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                          {plan.display_name || plan.name}
                          {plan.is_featured && (
                            <span className="text-[10px] font-black uppercase bg-amber-400 text-white px-1.5 py-0.5 rounded-full">
                              Popular
                            </span>
                          )}
                        </h5>
                        {plan.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                        )}
                      </div>
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-slate-900">
                        {formatPrice(plan.price)}
                        {plan.duration_days && (
                          <span className="text-sm text-slate-500 font-normal ml-1">
                            / {formatDuration(plan.duration_days)}
                          </span>
                        )}
                      </span>
                      <Link
                        href="/membership"
                        onClick={onClose}
                        className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        Choose <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-2">
            <Link
              href="/membership"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <span>View All Plans</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}