'use client';

import { motion } from 'framer-motion';
import {
  Heart, Shield, Award, Users, Globe, Target, Zap, CheckCircle,
  Sparkles, Star, ArrowRight, Quote, HeartHandshake, Fingerprint,
  Crown, Gem, MapPin, TrendingUp, UserCheck
} from 'lucide-react';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STATS DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const stats = [
  { value: '25L+', label: 'Verified Profiles', icon: <Users className="w-5 h-5" />, color: '#be123c' },
  { value: '9+', label: 'Years of Trust', icon: <Shield className="w-5 h-5" />, color: '#d97706' },
  { value: '5L+', label: 'Happy Couples', icon: <Heart className="w-5 h-5" />, color: '#9333ea' },
  { value: '500+', label: 'Cities Covered', icon: <MapPin className="w-5 h-5" />, color: '#0891b2' },
];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ VALUES DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const values = [
  {
    icon: Shield,
    title: 'Trust & Safety',
    desc: 'Every profile is manually verified with government-issued ID. Zero bots, zero fakes - only authentic connections.',
    gradient: 'from-green-500 to-emerald-700',
    glow: 'rgba(16,185,129,0.3)',
    tag: 'Verified',
  },
  {
    icon: Heart,
    title: 'Family Values',
    desc: <span className="text-gradient-primary font-bold">We celebrate the pivotal role of family in the Indian marriage journey - honoring traditions while embracing modern love.</span>,
    gradient: 'from-rose-500 to-red-700',
    glow: 'rgba(190,18,60,0.3)',
    tag: 'Culture First',
  },
  {
    icon: Award,
    title: 'Excellence',
    desc: 'We obsess over every detail - from profile quality to 24/7 concierge support - so your journey feels premium.',
    gradient: 'from-amber-400 to-yellow-600',
    glow: 'rgba(217,119,6,0.3)',
    tag: 'Premium',
  },
  {
    icon: Zap,
    title: 'AI Innovation',
    desc: 'Our proprietary matching engine learns from millions of data points to surface your most compatible matches first.',
    gradient: 'from-violet-500 to-purple-700',
    glow: 'rgba(139,92,246,0.3)',
    tag: 'Smart Tech',
  },
  {
    icon: Globe,
    title: 'Inclusivity',
    desc: 'Hindu, Muslim, Christian, Sikh - every community, language, and background is welcomed with equal love and respect.',
    gradient: 'from-sky-500 to-blue-700',
    glow: 'rgba(14,165,233,0.3)',
    tag: 'All Communities',
  },
  {
    icon: Target,
    title: 'Success Focus',
    desc: 'Every feature, every algorithm tweak, every update - all driven by one goal: helping you find your forever person.',
    gradient: 'from-orange-500 to-red-600',
    glow: 'rgba(249,115,22,0.3)',
    tag: 'Results Driven',
  },
];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TIMELINE DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const timeline = [
  { year: '2015', title: 'Founded with Purpose', desc: 'My Dear Partner was born with a vision to make matrimony safe, modern, and meaningful for every Indian.' },
  { year: '2017', title: 'AI Matching Launched', desc: 'Rolled out our first-generation AI matchmaking engine, revolutionizing how compatible matches are discovered.' },
  { year: '2019', title: '1 Million Profiles', desc: 'Crossed the 1 million verified profiles milestone - a testament to the trust the nation placed in us.' },
  { year: '2021', title: 'Pan-India Expansion', desc: 'Expanded our network to 500+ cities, serving every state and community across India.' },
  { year: '2023', title: 'Premium Experience', desc: 'Launched gold-tier concierge matchmaking and family connect features, redefining premium matrimony.' },
  { year: '2025', title: '5 Lakh+ Couples', desc: 'Celebrated 5 lakh successful matches - each one a story of love, trust, and new beginnings.' },
];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TESTIMONIALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const testimonials = [
  {
    quote: 'My Dear Partner understood exactly what we were looking for. The AI suggestions were spot-on, and within 3 months we found each other. We got married last December!',
    name: 'Priya & Arjun Sharma',
    location: 'Delhi',
    avatar: 'PA',
  },
  {
    quote: 'As a working professional, I had very little time. Their concierge service handled everything. I just showed up and met my now-husband. Truly magical!',
    name: 'Meera Nair',
    location: 'Bangalore',
    avatar: 'MN',
  },
  {
    quote: 'The profile verification gave our families immense confidence. A trustworthy platform that truly cares about safe and meaningful connections.',
    name: 'Rahul & Divya Kapoor',
    location: 'Mumbai',
    avatar: 'RD',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-16 overflow-x-hidden">

      {/* â”€â”€â”€â”€â”€â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #0d0008 0%, #1f000e 35%, #2d0015 65%, #0d0008 100%)' }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #be123c, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl opacity-15" style={{ background: 'radial-gradient(circle, #d97706, transparent)' }} />
        </div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 5 + 2,
                height: Math.random() * 5 + 2,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 3 === 0 ? 'rgba(251,191,36,0.8)' : i % 3 === 1 ? 'rgba(255,255,255,0.5)' : 'rgba(220,38,38,0.6)',
              }}
              animate={{ y: [0, -25, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5 }}
            />
          ))}
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
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-amber-200 text-xs sm:text-sm font-bold tracking-widest uppercase">India's #1 Trusted Matrimony</span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </motion.div>

            <h1
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 font-display"
              style={{ textShadow: '0 0 60px rgba(255,255,255,0.15), 0 4px 30px rgba(0,0,0,0.5)' }}
            >
              We Help{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 30%,#fde68a 55%,#f59e0b 80%,#d97706 100%)',
                  filter: 'drop-shadow(0 0 24px rgba(251,191,36,0.6))',
                }}
              >
                Hearts
              </span>
              <br className="hidden sm:block" />
              Find Home.
            </h1>

            <p
              className="text-base sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium mb-12"
              style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              India's most trusted premium matrimony platform, connecting hearts with intention, dignity, and joy since 2015.
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

      {/* â”€â”€â”€â”€â”€â”€â”€ MISSION SECTION â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-red-50 border border-red-100">
                <HeartHandshake className="w-4 h-4 text-[var(--theme-primary-600)]" />
                <span className="text-[var(--theme-primary-600)] text-xs font-black uppercase tracking-widest">Our Purpose</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[var(--theme-primary-800)] mb-6 leading-tight">
                Our{' '}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#be123c,#f59e0b)' }}>
                  Mission
                </span>
              </h2>
              <p className="text-[var(--theme-primary-600)]/80 leading-relaxed mb-5 text-base sm:text-lg">
                At My Dear Partner, we believe marriage is one of life's most profound decisions. Our mission is to make this journey safer, smarter, and more meaningful, combining cutting-edge AI with a deep reverence for Indian values.
              </p>
              <p className="text-[var(--theme-primary-600)]/70 leading-relaxed mb-8 text-sm sm:text-base">
                We don't just match profiles, we match lives. Every feature is built with trust, privacy, and your success story in mind.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  '100% Verified Profiles',
                  'AI-Powered Matching',
                  'Bank-Grade Security',
                  'Dedicated Support 24/7',
                  'Privacy First Approach',
                  'Cultural Sensitivity',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-red-50/50 rounded-xl px-3 py-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm font-semibold text-[var(--theme-primary-800)]">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative mt-8 lg:mt-0"
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
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#be123c,#9f1239)' }}>
                      <Crown className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="font-extrabold text-[var(--theme-primary-800)] font-display text-lg">My Dear Partner Promise</div>
                      <div className="text-xs text-[var(--theme-primary-600)]/70">Building trust since 2015</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: <UserCheck className="w-5 h-5" />, label: 'Manual Profile Verification', color: '#be123c' },
                      { icon: <Shield className="w-5 h-5" />, label: '256-bit SSL Encryption', color: '#d97706' },
                      { icon: <Fingerprint className="w-5 h-5" />, label: 'Govt. ID Authentication', color: '#7c3aed' },
                      { icon: <TrendingUp className="w-5 h-5" />, label: 'AI Compatibility Scoring', color: '#0891b2' },
                      { icon: <Gem className="w-5 h-5" />, label: 'Premium Concierge Support', color: '#059669' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-white/80 border border-white"
                        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ color: item.color, background: `${item.color}18` }}>
                          {item.icon}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-5 -left-4 sm:-left-6 rounded-2xl p-4 sm:p-5 shadow-2xl"
                style={{ background: 'linear-gradient(135deg,#be123c,#9f1239)' }}
              >
                <div className="text-2xl sm:text-3xl font-black text-white font-display">9+</div>
                <div className="text-xs text-white/80 font-medium">Years of Trust</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* â”€â”€â”€â”€â”€â”€â”€ CORE VALUES â”€â”€â”€â”€â”€â”€â”€ */}
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
              <span className="text-[var(--theme-primary-600)] text-xs font-black uppercase tracking-widest">What We Stand For</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[var(--theme-primary-800)] mb-4">
              Our Core{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#be123c,#f59e0b)' }}>Values</span>
            </h2>
            <p className="text-[var(--theme-primary-600)]/70 max-w-xl mx-auto text-base sm:text-lg">
              The principles that guide every decision we make, every feature we build, and every match we create.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {values.map((val, i) => (
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

      {/* â”€â”€â”€â”€â”€â”€â”€ TIMELINE â”€â”€â”€â”€â”€â”€â”€ */}
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
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-amber-200 text-xs font-black uppercase tracking-widest">Our Journey</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white mb-4"
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
            >
              A Decade of{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#fbbf24,#f59e0b,#fde68a)' }}>
                Milestones
              </span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Center line (desktop only) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: 'linear-gradient(to bottom, transparent, rgba(190,18,60,0.6), rgba(251,191,36,0.6), transparent)' }} />
            <div className="space-y-6 sm:space-y-8">
              {timeline.map((item, i) => (
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
                      <div className="text-xs font-black uppercase tracking-widest mb-2 px-3 py-1 rounded-full inline-block" style={{ background: 'rgba(190,18,60,0.2)', color: '#fb7185' }}>
                        {item.year}
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

      {/* â”€â”€â”€â”€â”€â”€â”€ TESTIMONIALS â”€â”€â”€â”€â”€â”€â”€ */}
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
              <span className="text-[var(--theme-primary-600)] text-xs font-black uppercase tracking-widest">Love Stories</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[var(--theme-primary-800)] mb-4">
              Voices of{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#be123c,#f59e0b)' }}>
                Happy Couples
              </span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl"
              >
                <Quote className="w-8 h-8 text-[var(--theme-primary-200)] mb-4" />
                <p className="text-[var(--theme-primary-700)] text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#be123c,#9f1239)' }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-extrabold text-[var(--theme-primary-800)] text-sm">{t.name}</div>
                    <div className="text-xs text-[var(--theme-primary-500)]">ðŸ“ {t.location}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€â”€â”€â”€â”€ CTA SECTION â”€â”€â”€â”€â”€â”€â”€ */}
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
              Begin Your Forever Today
            </h2>
            <p className="text-white/80 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Join 25 lakh+ verified profiles and let our AI find the one who was meant for you. Free to register. Always safe. Always trusted.
            </p>
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
