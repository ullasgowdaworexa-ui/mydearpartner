'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Crown, Star, Heart, Loader2, X, ArrowRight, Shield, Headphones, Gift } from 'lucide-react';
import { useGetMembershipPlansQuery, type MembershipPlan } from '@/legacy/services/membershipApi';
import Link from 'next/link';

// Icon mapping for different plan types
const iconMap: Record<string, any> = {
  'free': Heart,
  'gold': Star,
  'platinum': Sparkles,
  'elite': Crown,
};

// FAQ data
const faqs = [
  {
    q: 'Can I upgrade my plan anytime?',
    a: 'Yes, you can upgrade at any time. Just select a new plan and it will be activated instantly.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Absolutely. All payments are encrypted with 256-bit SSL and processed through PCI-DSS compliant payment gateways.',
  },
  {
    q: 'What is the refund policy?',
    a: 'We offer a 7-day refund policy for paid plans. If you are not satisfied, contact our support team within 7 days of purchase.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept all major credit/debit cards, UPI (GPay, PhonePe, Paytm), Net Banking, and EMI options.',
  },
  {
    q: 'Can I cancel my plan anytime?',
    a: 'Yes, you can downgrade to the Free plan or cancel anytime. No questions asked.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! The Free plan is always available with 5 profile unlocks and 3 interests per day. Try it risk-free.',
  },
];

// Trust indicators
const trustIndicators = [
  { icon: Shield, title: 'Secure Payment', desc: '256-bit SSL encryption' },
  { icon: Shield, title: 'Verified Profiles', desc: 'Government ID verified' },
  { icon: Headphones, title: '24/7 Support', desc: 'Always here for you' },
  { icon: Gift, title: '7-Day Refund', desc: 'No questions asked' },
];

export default function PublicMembershipPage() {
  const { data: plans = [], isLoading, error } = useGetMembershipPlansQuery();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-2">Failed to load membership plans</div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-500 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

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
      
      if (plan.messaging_mode !== 'DISABLED') {
        features.push('Direct messaging');
      }
      
      if (plan.can_use_advanced_search) {
        features.push('Advanced search filters');
      }
      
      if (plan.contact_access_mode !== 'NONE') {
        features.push('Contact information access');
      }
      
      if (plan.photo_access_mode === 'ALL_APPROVED' || plan.photo_access_mode === 'ALL') {
        features.push('View all photos');
      }
      
      if (plan.can_use_horoscope) {
        features.push('Horoscope matching');
      }
    }
    
    return features;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-16 px-4 text-center"
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-gray-600">
            Upgrade your account to unlock exclusive features and find your match faster
          </p>
        </div>
      </motion.section>

      {/* Plans Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[...plans]
              .sort((a, b) => a.display_order - b.display_order)
              .map((plan, index) => {
                const Icon = iconMap[plan.slug] || Star;
                const features = getFeatures(plan);

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative rounded-2xl border-2 transition-all bg-white shadow-lg overflow-hidden ${
                      plan.is_featured
                        ? 'border-amber-500 ring-2 ring-amber-500/20 md:scale-105'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Featured Badge */}
                    {plan.is_featured && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold py-2 text-center">
                        Most Popular
                      </div>
                    )}

                    <div className={`p-6 ${plan.is_featured ? 'pt-12' : 'pt-8'}`}>
                      {/* Icon & Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{plan.display_name}</h3>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                        </div>
                      </div>

                      {/* Price */}
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

                      {/* Features */}
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
                      <Link
                        href={plan.slug === 'free' ? '/register' : '/register?plan=' + plan.slug}
                        className={`w-full py-3 px-4 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-2 ${
                          plan.slug === 'free'
                            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            : plan.is_featured
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg'
                            : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-lg'
                        }`}
                      >
                        {plan.slug === 'free' ? 'Start Free' : 'Get ' + plan.display_name}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
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
            className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-16"
          >
            {trustIndicators.map(({ icon: Icon, title, desc }, idx) => (
              <div key={idx} className="text-center p-4">
                <div className="flex justify-center mb-2">
                  <Icon className="w-6 h-6 text-rose-500" />
                </div>
                <div className="font-semibold text-gray-900 mb-1">{title}</div>
                <div className="text-sm text-gray-600">{desc}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-white/50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Have questions? We have answers.
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + idx * 0.05 }}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openFaq === idx ? 180 : 0 }}
                    className="flex-shrink-0"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200"
                    >
                      <div className="px-6 py-4 text-gray-700">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="py-16 px-4"
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to find your perfect match?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join over 50,000 happy couples who found their life partner on My Dear Partner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-bold hover:from-rose-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
            >
              Start for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/success-stories"
              className="px-8 py-3 border border-gray-300 text-gray-900 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
              View Success Stories
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}