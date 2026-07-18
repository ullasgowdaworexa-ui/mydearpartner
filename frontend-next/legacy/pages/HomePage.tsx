'use client';

import SmartImage from '@/components/shared/smart-image';

import { useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crown,
  HeartHandshake,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
  Heart,
  Lock,
  MessageSquare,
  Users
} from 'lucide-react';
import HeroSection from '../components/home/HeroSection';

const steps = [
  {
    icon: UserCheck, number: '01',
    title: 'Create Your Profile',
    text: 'Fill your profile with all necessary information like your personal details, family background, education, profession, interests and preference for a partner.',
  },
  {
    icon: Search, number: '02',
    title: 'Discover Compatible Matches',
    text: 'Our intelligent matching system recommends profiles based on your preferences, values, lifestyle, and compatibility—saving you time while helping you meet the right people.',
  },
  {
    icon: MessageCircle, number: '03',
    title: 'Connect with Confidence',
    text: 'Express your interest, start secure conversations, exchange details, and involve your family whenever you’re ready to take the next step.',
  },
  {
    icon: HeartHandshake, number: '04',
    title: 'Begin Your Forever',
    text: 'When the connection feels right, let your story unfold. Every successful relationship begins with trust, understanding, and one meaningful conversation.',
  },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Verified Profiles',
    desc: 'Every profile goes through a careful verification process to create a genuine and trustworthy community.',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    desc: 'Choose who can view your profile, photos, and personal information with advanced privacy settings.',
  },
  {
    icon: MessageSquare,
    title: 'Secure Communication',
    desc: 'Connect with Trust, build meaningful conversations in a private and secure environment.',
  },
  {
    icon: HeartHandshake,
    title: 'Dedicated Support',
    desc: 'Always by Your Side. Expert guidance whenever you need it on your journey to finding the right partner.',
  },
];

const premiumBenefits = [
  'Unlimited Profile Views',
  'Direct Contact Access',
  'Priority Profile Visibility',
  'Advanced Match Preferences',
  'Relationship Advisor',
  'Video Profile & Introductions',
  'Priority Customer Support',
];

const faqList = [
  {
    q: "1. My family is traditional. Will we feel comfortable here?",
    a: "We were built for families like yours. MyDearPartner isn't a dating app; it's a family-first platform where parents and elders are not just welcome but essential. Everything we do respects the way Indian families approach matchmaking, with privacy, trust, and shared decision-making."
  },
  {
    q: "2. Can my parents create a profile for me?",
    a: "Absolutely. Many of our members are parents registering on behalf of their children. You can involve as many family members as you like at any stage. We welcome families to create and manage profiles together."
  },
  {
    q: "3. Do I have to pay to register?",
    a: "No. Registration is completely free. You can create your profile, browse matches, and receive daily recommendations at no cost. Upgrade to premium only when you're ready to move faster."
  },
  {
    q: "4. What if I'm not sure what I'm looking for?",
    a: "That's perfectly okay. Many members start with a vague idea and discover what truly matters as they explore. Our relationship advisors can help you clarify your preferences over time. Your profile can evolve as your understanding deepens."
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  const [searchGender, setSearchGender] = useState('Female');
  const [searchReligion, setSearchReligion] = useState('Hindu');
  const [searchAge, setSearchAge] = useState('22-28');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?gender=${searchGender}&religion=${searchReligion}&age=${searchAge}`);
  };

  const fadeUpView = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65, delay },
  });

  return (
    <div className="mh">

      {/* ── HERO ── */}
      <HeroSection />

      {/* ── SEARCH SECTION ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-red-50 to-orange-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            
            {/* Search Copy */}
            <motion.div {...fadeUpView()}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#be123c]/10 text-rose-850 uppercase tracking-widest mb-4 border border-[#be123c]/20">
                Find Your Perfect Match
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--theme-primary-800)] font-display tracking-tight mb-4 leading-tight">
                Begin Your Search with Confidently
              </h2>
              <p className="text-slate-650 text-base sm:text-lg leading-relaxed">
                If you are looking for a perfect match from the perspective of faith, profession, education, community or any other criterion, MyDearPartner will help you find people who suit your requirements.
              </p>
            </motion.div>

            {/* Search Box Card */}
            <motion.div 
              {...fadeUpView(0.15)}
              className="bg-white p-6 sm:p-8 rounded-[2rem] border border-red-100 shadow-xl"
            >
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Looking For</label>
                    <select 
                      value={searchGender}
                      onChange={(e) => setSearchGender(e.target.value)}
                      className="w-full bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#be123c]/20"
                    >
                      <option value="Female">Bride</option>
                      <option value="Male">Groom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Age Bracket</label>
                    <select 
                      value={searchAge}
                      onChange={(e) => setSearchAge(e.target.value)}
                      className="w-full bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#be123c]/20"
                    >
                      <option value="18-24">18 to 24</option>
                      <option value="25-30">25 to 30</option>
                      <option value="31-35">31 to 35</option>
                      <option value="36-100">36+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Religion</label>
                  <select 
                    value={searchReligion}
                    onChange={(e) => setSearchReligion(e.target.value)}
                    className="w-full bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#be123c]/20"
                  >
                    <option value="Hindu">Hindu</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Christian">Christian</option>
                    <option value="Sikh">Sikh</option>
                    <option value="Any">Any Community</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#be123c] to-[#9f1239] hover:from-[#9f1239] hover:to-[#be123c] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg mt-6"
                >
                  <Search className="w-4 h-4" /> Find Matches
                </button>
              </form>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2 - JOURNEY ── */}
      <section className="mh-process">
        <div className="mh-shell">
          <div className="mh-process-head">
            <div>
              <span className="mh-eyebrow">YOUR JOURNEY</span>
              <h2>A Simple Path to Finding Your Forever</h2>
            </div>
            <p>Every successful relationship starts with a meaningful introduction. We have devised an easy and transparent journey for you that lets you meet the right person at the right time.</p>
          </div>
          <div className="mh-steps">
            {steps.map(({ icon: Icon, number, title, text }, i) => (
              <motion.div key={title} {...fadeUpView(i * 0.1)} className="mh-step">
                <div className="mh-step-num">{number}</div>
                <div className="mh-step-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3 - TRUST & SAFETY ── */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#be123c]/10 text-rose-800 uppercase tracking-widest mb-4 border border-[#be123c]/20">
              TRUST &amp; SAFETY
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--theme-primary-800)] font-display tracking-tight mb-4">
              Because Trust Comes Before Every Relationship
            </h2>
            <p className="text-slate-650 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed">
              At MyDearPartner, your safety and privacy are our highest priorities. Every feature is thoughtfully designed to help individuals and families connect with confidence while maintaining complete control over their personal information.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustPoints.map((point, idx) => {
              const IconComponent = point.icon;
              return (
                <motion.div
                  key={point.title}
                  {...fadeUpView(idx * 0.08)}
                  className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-50 text-[#be123c] mb-5 shrink-0">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{point.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{point.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── SECTION 4 - PREMIUM MEMBERSHIP ── */}
      <section className="mh-membership">
        <div className="mh-membership-visual">
          <SmartImage src="/images/wedding-rings.jpg" alt="Wedding rings representing lasting commitment" />
        </div>
        <div className="mh-membership-copy">
          <div className="mh-membership-icon"><Crown /></div>
          <span className="mh-eyebrow dark">PREMIUM EXPERIENCE</span>
          <h2>Unlock More Meaningful Opportunities</h2>
          <p>
            Upgrade your membership to enjoy exclusive features that help you find your ideal life partner faster and more effectively.
          </p>
          <ul className="mh-membership-list">
            {premiumBenefits.map((benefit) => (
              <li key={benefit}><Check /> {benefit}</li>
            ))}
          </ul>
          <Link to="/membership" id="membership-cta" className="btn-gold">
            Explore Premium Plans <ArrowRight />
          </Link>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="mh-faq">
        <div className="mh-shell mh-faq-grid">
          <div className="mh-faq-left">
            <span className="mh-eyebrow dark">Frequently Asked Questions</span>
            <h2>Honest answers to the questions families ask us most.</h2>
            <p>Still have a question? Our relationship support team would be glad to help.</p>
            <Link to="/contact" className="mh-link" id="faq-contact-link">Talk to our team <ArrowRight /></Link>
          </div>
          <div className="mh-faq-list">
            {faqList.map(({ q: question, a: answer }, index) => {
              const open = openFaq === index;
              return (
                <div key={question} className={`mh-faq-item${open ? ' open' : ''}`}>
                  <button type="button"
                    id={`faq-btn-${index}`}
                    className="mh-faq-btn"
                    onClick={() => setOpenFaq(open ? -1 : index)}
                  >
                    <span>{question}</span>
                    <div className="mh-faq-chevron">
                      <ChevronDown />
                    </div>
                  </button>
                  <div className="mh-faq-body">
                    <p>{answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="mh-final">
        <div className="mh-final-ring mh-final-ring-1" aria-hidden="true" />
        <div className="mh-final-ring mh-final-ring-2" aria-hidden="true" />
        <div className="mh-final-ring mh-final-ring-3" aria-hidden="true" />

        <motion.div {...fadeUpView()} className="mh-final-inner">
          <Heart className="mh-final-icon fill-current text-amber-400" />
          <span className="mh-eyebrow">YOUR STORY STARTS HERE</span>
          <h2>The Right Person Could Be Just One Conversation Away.</h2>
          <p>Thousands of meaningful relationships begin with a simple hello. Join MyDearPartner today and take the first step toward finding someone who truly understands your journey, values, and dreams.</p>
          <div className="mh-final-actions">
            <Link to="/register" id="final-signup-btn" className="btn-gold">
              Create Free Profile <ArrowRight />
            </Link>
            <Link to="/search" id="final-login-btn" className="btn-ghost">
              Browse Matches
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
