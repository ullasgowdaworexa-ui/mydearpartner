'use client';

import { motion } from 'framer-motion';
import {
  Heart, Shield, Award, Users, Globe, Target, Zap, CheckCircle,
  Star, ArrowRight, Quote, HeartHandshake, Fingerprint,
  Crown, Gem, MapPin, TrendingUp, UserCheck, Lock
} from 'lucide-react';

/* ── STATS DATA ── */
const stats = [
  { value: '25L+', label: 'Verified Profiles', icon: <Users className="w-5 h-5" />, color: '#be123c' },
  { value: '9+', label: 'Years of Trust', icon: <Shield className="w-5 h-5" />, color: '#d97706' },
  { value: '5L+', label: 'Happy Couples', icon: <Heart className="w-5 h-5" />, color: '#9333ea' },
  { value: '500+', label: 'Cities Covered', icon: <MapPin className="w-5 h-5" />, color: '#0891b2' },
];

/* ── DIFFERENTIATORS ── */
const differentiators = [
  {
    icon: UserCheck,
    title: 'Authenticity Above Everything',
    desc: 'Every profile represents a genuine person looking for a meaningful relationship.',
    gradient: 'from-green-500 to-emerald-700',
    glow: 'rgba(16,185,129,0.3)',
    tag: 'Authentic',
  },
  {
    icon: Shield,
    title: 'Trust at Every Step',
    desc: 'From profile verification to privacy controls, every feature is designed to help you connect with confidence.',
    gradient: 'from-rose-500 to-red-700',
    glow: 'rgba(190,18,60,0.3)',
    tag: 'Secure',
  },
  {
    icon: Heart,
    title: 'Relationships Before Algorithms',
    desc: 'Technology helps us recommend compatible matches, but people, values, and genuine intentions remain at the heart of every connection.',
    gradient: 'from-amber-400 to-yellow-600',
    glow: 'rgba(217,119,6,0.3)',
    tag: 'People First',
  },
  {
    icon: Users,
    title: 'Designed for Individuals & Families',
    desc: 'Marriage brings two lives together—and often two families as well. That’s why MyDearPartner creates an experience that respects both personal choice and family involvement.',
    gradient: 'from-violet-500 to-purple-700',
    glow: 'rgba(139,92,246,0.3)',
    tag: 'Family First',
  },
];

/* ── VALUES LIST ── */
const valuesList = [
  {
    label: 'Trust',
    title: 'Trust',
    desc: 'Every meaningful relationship begins with honesty.',
    badgeColor: 'rgba(16,185,129,0.2)',
    textColor: '#10b981'
  },
  {
    label: 'Respect',
    title: 'Respect',
    desc: 'Every person, tradition, culture, and life story deserves respect.',
    badgeColor: 'rgba(139,92,246,0.2)',
    textColor: '#a78bfa'
  },
  {
    label: 'Privacy',
    title: 'Privacy',
    desc: 'Your personal information belongs to you & protecting it is our responsibility.',
    badgeColor: 'rgba(14,165,233,0.2)',
    textColor: '#38bdf8'
  },
  {
    label: 'Commitment',
    title: 'Commitment',
    desc: 'We’re committed to helping people build relationships that stand the test of time.',
    badgeColor: 'rgba(251,191,36,0.2)',
    textColor: '#fcd34d'
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-16 overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #0d0008 0%, #1f000e 35%, #2d0015 65%, #0d0008 100%)' }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #be123c, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl opacity-15" style={{ background: 'radial-gradient(circle, #d97706, transparent)' }} />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20 sm:py-28">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 rounded-full border border-amber-400/40"
              style={{ background: 'rgba(251,191,36,0.1)', backdropFilter: 'blur(10px)' }}
            >
            
              <span className="text-amber-200 text-xs sm:text-sm font-bold tracking-widest uppercase">About MyDearPartner</span>
       
            </motion.div>

            <h1
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 font-display"
              style={{ textShadow: '0 0 60px rgba(255,255,255,0.15), 0 4px 30px rgba(0,0,0,0.5)' }}
            >
              Every Forever Begins with a{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 30%,#fde68a 55%,#f59e0b 80%,#d97706 100%)',
                  filter: 'drop-shadow(0 0 24px rgba(251,191,36,0.6))',
                }}
              >
                Meaningful Connection.
              </span>
            </h1>

            <p
              className="text-sm sm:text-base max-w-4xl mx-auto leading-relaxed font-medium mb-12 text-justify sm:text-center"
              style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              <strong>Some journeys in life are chosen. Others are shared.</strong> Finding the person who will stand beside you through every season of life is one of the most meaningful decisions you’ll ever make. At MyDearPartner, we believe that every relationship deserves a beginning built on trust, understanding, and genuine intentions. We created MyDearPartner to offer more than just a platform for finding matches. We envisioned a place where people could confidently discover someone who shares their values, respects their dreams, and is ready to build a future together. Whether you’re searching for yourself or helping someone you love, every connection starts with hope, and we’re here to help that hope become a lifelong partnership.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="rounded-2xl p-4 sm:p-5 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="flex items-center justify-center mb-1" style={{ color: stat.color }}>{stat.icon}</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-0.5">{stat.value}</div>
                  <div className="text-xs text-white/60 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none" style={{ display: 'block' }}>
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── OUR STORY, MISSION & VISION ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            
            {/* Left Column: Our Story */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-red-50 border border-red-100">
                <HeartHandshake className="w-4 h-4 text-[var(--theme-primary-600)]" />
                <span className="text-[var(--theme-primary-600)] text-xs font-black uppercase tracking-widest">Our Story</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[var(--theme-primary-800)] mb-6 leading-tight">
                Inspired by{' '}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#be123c,#f59e0b)' }}>
                  Real Relationships
                </span>
              </h2>
              
              <p className="text-[var(--theme-primary-600)]/80 leading-relaxed mb-5 text-base sm:text-lg">
                In today’s fast-moving digital world, finding a genuine life partner can often feel overwhelming. Endless profiles, uncertain conversations, and a lack of trust can make an important journey unnecessarily difficult.
              </p>
              
              <p className="text-[var(--theme-primary-600)]/70 leading-relaxed mb-8 text-sm sm:text-base">
                <strong>MyDearPartner was born from a simple belief:</strong> Finding your life partner should feel personal, respectful, and meaningful, not complicated. That’s why we’ve created a platform where technology supports human connections without replacing the values that matter most.
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                {[
                  'Every profile represents a real person.',
                  'Every conversation carries the possibility of a new beginning.',
                  'Every successful match becomes part of a story worth celebrating.'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-red-50/50 rounded-xl px-3 py-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm font-semibold text-[var(--theme-primary-800)]">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Column: Mission & Vision */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div
                className="relative rounded-3xl p-6 sm:p-8 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #fff1f2, #fff7ed)',
                  border: '1px solid #fecdd3',
                  boxShadow: '0 30px 60px -10px rgba(190,18,60,0.15)',
                }}
              >
                <div className="absolute top-4 right-4 opacity-10">
                  <Heart className="w-32 h-32 text-[var(--theme-primary-600)] fill-current" />
                </div>
                
                <div className="relative z-10 space-y-6">
                  {/* Mission Card */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md" style={{ background: 'linear-gradient(135deg,#be123c,#9f1239)' }}>
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[var(--theme-primary-800)] font-display text-lg">Our Mission</h3>
                      <p className="text-xs text-[var(--theme-primary-600)]/70 uppercase font-black tracking-wider mb-2">Helping People Find More Than a Match</p>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        Our mission is to create a trusted environment where meaningful relationships can flourish naturally. By bringing together authenticity, privacy, and thoughtful matchmaking, we help individuals and families make one of life’s biggest decisions with confidence and peace of mind.
                      </p>
                      <p className="text-xs font-bold text-[var(--theme-primary-750)] border-l-2 border-[var(--theme-primary-300)] pl-2 italic">
                        "Because marriage isn’t simply about finding someone. It’s about finding the right someone."
                      </p>
                    </div>
                  </div>

                  {/* Vision Card */}
                  <div className="flex gap-4 pt-4 border-t border-red-100">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[var(--theme-primary-800)] font-display text-lg">Our Vision</h3>
                      <p className="text-xs text-[var(--theme-primary-600)]/70 uppercase font-black tracking-wider mb-2">Every Relationship Begins with Trust</p>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        We dream of a world where meaningful relationships are built through honesty, respect, and shared values. Our vision is to become a platform that people don’t just use—but genuinely trust.
                      </p>
                      <p className="text-xs font-bold text-amber-700 border-l-2 border-amber-300 pl-2 italic">
                        "A place where every introduction has purpose. Every conversation has meaning. And every successful match becomes the beginning of a beautiful new chapter."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHAT MAKES MYDEARPARTNER DIFFERENT ── */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full bg-red-50 border border-red-100">
              <Star className="w-4 h-4 text-[var(--theme-primary-600)] fill-current" />
              <span className="text-[var(--theme-primary-600)] text-xs font-black uppercase tracking-widest">Our Approach</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[var(--theme-primary-800)] mb-4">
              What Makes{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#be123c,#f59e0b)' }}>MyDearPartner Different</span>
            </h2>
            <p className="text-[var(--theme-primary-600)]/70 max-w-xl mx-auto text-base sm:text-lg">
              We focus on intentions, trust, and human values to support your matchmaking journey.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {differentiators.map((val, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-2xl sm:rounded-3xl p-6 sm:p-7 bg-white border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-default"
              >
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-white" style={{ background: val.glow.replace('0.3', '0.8') }}>
                    {val.tag}
                  </span>
                </div>
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${val.gradient} flex items-center justify-center mb-5 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  style={{ boxShadow: `0 8px 24px ${val.glow}` }}
                >
                  <val.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[var(--theme-primary-800)] font-display mb-3">{val.title}</h3>
                <p className="text-[var(--theme-primary-600)]/70 text-sm leading-relaxed">{val.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR VALUES ── */}
      <section
        className="py-16 sm:py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0d0008 0%,#1f000e 40%,#2d0015 70%,#0d0008 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 50%,rgba(190,18,60,0.1),transparent)' }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full border border-amber-400/30" style={{ background: 'rgba(251,191,36,0.08)' }}>
              <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span className="text-amber-200 text-xs font-black uppercase tracking-widest">Our Values</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white mb-4"
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
            >
              The Pillars of{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#fbbf24,#f59e0b,#fde68a)' }}>
                Our Platform
              </span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Center line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: 'linear-gradient(to bottom, transparent, rgba(190,18,60,0.6), rgba(251,191,36,0.6), transparent)' }} />
            <div className="space-y-6 sm:space-y-8">
              {valuesList.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex flex-col md:flex-row md:items-center gap-4 md:gap-0 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className={`w-full md:w-[calc(50%-2rem)] ${i % 2 === 0 ? 'md:pr-8' : 'md:pl-8'}`}>
                    <div
                      className="rounded-2xl p-5 sm:p-6"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div 
                        className="text-xs font-black uppercase tracking-widest mb-2 px-3 py-1 rounded-full inline-block" 
                        style={{ background: item.badgeColor, color: item.textColor }}
                      >
                        {item.label}
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-white font-display mb-2">{item.title}</h3>
                      <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-[var(--theme-primary-500)] items-center justify-center" style={{ background: '#1f000e' }}>
                    <div className="w-2 h-2 rounded-full bg-[var(--theme-primary-500)]" />
                  </div>
                  <div className="hidden md:block w-[calc(50%-2rem)]" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US & OUR PROMISE ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full bg-red-50 border border-red-100">
              <Heart className="w-4 h-4 text-[var(--theme-primary-600)] fill-current" />
              <span className="text-[var(--theme-primary-600)] text-xs font-black uppercase tracking-widest">Why Us</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[var(--theme-primary-800)] mb-4">
              Why Choose{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#be123c,#f59e0b)' }}>
                MyDearPartner?
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Card 1: Why Choose Us */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 shadow-xl flex flex-col justify-between"
            >
              <div>
                <Quote className="w-8 h-8 text-[var(--theme-primary-200)] mb-4" />
                <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--theme-primary-800)] font-display mb-6">
                  Because you’re not looking for another profile...
                </h3>
                
                <div className="space-y-4">
                  {[
                    "You’re looking for someone who feels like home.",
                    "Someone who understands your journey.",
                    "Someone who shares your dreams.",
                    "Someone with whom I feel forever natural."
                  ].map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Heart className="w-4 h-4 text-[var(--theme-primary-600)] mt-1 shrink-0 fill-red-200" />
                      <p className="text-sm font-semibold text-gray-800">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <p className="text-base font-extrabold text-[var(--theme-primary-700)] mt-8 pt-4 border-t border-red-100/50">
                At MyDearPartner, we’re honoured to be part of that journey.
              </p>
            </motion.div>

            {/* Card 2: A Promise From Us */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-orange-50 to-red-50 border border-red-100 shadow-xl flex flex-col"
            >
              <Shield className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--theme-primary-800)] font-display mb-6">
                A Promise From Us
              </h3>
              
              <div className="space-y-4 flex-grow">
                {[
                  "We promise to create a space where meaningful relationships can begin with confidence.",
                  "A place where trust is earned.",
                  "Where conversations are genuine.",
                  "Where families feel secure.",
                  "And where every introduction carries the possibility of a lifetime together."
                ].map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                    <p className="text-sm font-semibold text-gray-800">{point}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section
        className="py-16 sm:py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#be123c 0%,#9f1239 50%,#7f1d1d 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(255,255,255,0.05),transparent)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white mb-5" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              Your Story Deserves the Right Beginning.
            </h2>
            <div className="text-white/90 text-sm sm:text-base mb-10 max-w-2xl mx-auto leading-relaxed space-y-2">
              <p>Every successful marriage begins with a single conversation.</p>
              <p>Every lasting relationship begins with a shared belief in tomorrow.</p>
              <p>And every beautiful future begins with one meaningful connection.</p>
              <p className="font-extrabold text-amber-300 text-lg mt-4">Welcome to MyDearPartner.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[var(--theme-primary-800)] bg-white hover:bg-amber-50 transition-all hover:scale-105 hover:shadow-xl text-sm sm:text-base"
              >
                Create Free Profile <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/membership"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white border border-white/30 hover:bg-white/10 transition-all text-sm sm:text-base"
              >
                View Membership Plans
              </a>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
