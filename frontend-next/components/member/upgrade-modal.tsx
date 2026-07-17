'use client';

import { motion } from 'framer-motion';
import { X, Check, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useMembership } from './membership-provider';

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
      '✓ Direct messaging with connections',
      '✓ Chat history saved',
      '✓ Real-time notifications',
      '✓ Message at no extra cost',
    ],
    requiredPlan: 'Gold',
  },
  advanced_search: {
    icon: '🔍',
    title: 'Advanced Search',
    description: 'Find your match with detailed filters',
    benefits: [
      '✓ Filter by income, education',
      '✓ Location-based search',
      '✓ Horoscope compatibility',
      '✓ Save search preferences',
    ],
    requiredPlan: 'Gold',
  },
  contact_details: {
    icon: '📞',
    title: 'Contact Information',
    description: 'Get full contact details of connections',
    benefits: [
      '✓ View phone number',
      '✓ See email address',
      '✓ Save contact info',
      '✓ Share safely',
    ],
    requiredPlan: 'Gold',
  },
  all_photos: {
    icon: '📸',
    title: 'All Photos',
    description: 'View all approved photos',
    benefits: [
      '✓ See all profile photos',
      '✓ Photo validation',
      '✓ Album view',
      '✓ Download option',
    ],
    requiredPlan: 'Gold',
  },
};

export default function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const { membershipSummary } = useMembership();
  const config = featureConfig[feature];

  const plans = [
    {
      name: 'Gold',
      price: '₹2,999',
      period: '3 Months',
      hasFeature: true,
      description: 'Accelerate your search',
    },
    {
      name: 'Platinum',
      price: '₹5,999',
      period: '6 Months',
      hasFeature: true,
      description: 'AI-powered matchmaking',
    },
    {
      name: 'Elite',
      price: '₹14,999',
      period: '12 Months',
      hasFeature: true,
      description: 'Premium experience',
    },
  ];

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
            <p className="text-sm text-slate-600">Available with {config.requiredPlan} and above</p>
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
                  ? '✓ Free features included'
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

          {/* Plans */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Choose a plan</h4>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="border border-slate-200 rounded-xl p-4 hover:border-rose-500 hover:bg-rose-50 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-bold text-slate-900">{plan.name}</h5>
                      <p className="text-xs text-slate-600">{plan.description}</p>
                    </div>
                    {plan.hasFeature && <Check className="w-5 h-5 text-green-500" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      {plan.price}
                      <span className="text-sm text-slate-600 font-normal ml-1">
                        / {plan.period}
                      </span>
                    </span>
                    <Link
                      href="/membership"
                      className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      Choose <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-4">
            <Link
              href="/membership"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <span>Upgrade Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-lg border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-slate-500 text-center">
            All plans include full access to messaging, advanced search, and contact details.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}