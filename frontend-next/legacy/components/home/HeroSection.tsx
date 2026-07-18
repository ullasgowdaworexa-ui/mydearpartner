'use client';

import SmartImage from '@/components/shared/smart-image';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  UserCheck,
  Users,
  MapPin,
  Star
} from 'lucide-react';
import { Link } from '@/lib/router-compat';

const trustStats = [
  { icon: Users, value: '50K+', label: 'Verified Members' },
  { icon: Heart, value: '200+', label: 'Communities' },
  { icon: MapPin, value: '100+', label: 'Connected Cities' },
  { icon: Star, value: '4.9/5', label: 'Member Satisfaction' },
];

const floatingCards = [
  {
    icon: ShieldCheck,
    title: 'Verified',
    detail: 'Trusted & secure',
    className: 'home-hero__floating-card--verified',
  },
  {
    icon: Heart,
    title: 'Curated Matches',
    detail: 'Handpicked for you',
    className: 'home-hero__floating-card--matches',
  },
  {
    icon: UserCheck,
    title: 'Advisor Curated',
    detail: 'Experts who understand you',
    className: 'home-hero__floating-card--advisor',
  },
];

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__layout">
        <div className="home-hero__copy-panel">
          <div className="home-hero__decor home-hero__decor--ring" aria-hidden="true" />
          <div className="home-hero__decor home-hero__decor--glow" aria-hidden="true" />

          <motion.div
            className="home-hero__copy"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#be123c]/10 text-rose-300 border border-[#be123c]/20 mb-6 uppercase tracking-widest w-fit">
              Trusted Matrimonial Platform
            </div>

            <h1 id="home-hero-title" className="home-hero__title">
              <span>Where Two Hearts Begin</span>
              <em>One Beautiful Journey.</em>
            </h1>

            <p className="home-hero__supporting-copy text-justify lg:text-left">
              At MyDearPartner, we believe the strongest relationships are built on trust, shared values, and genuine understanding. Whether you’re searching for yourself or a loved one, we’re here to help you discover a connection that’s meant to last a lifetime.
            </p>

            <div className="home-hero__actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <Link to="/register" className="home-hero__primary-cta">
                <span>Create Free Profile</span>
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/search" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold border border-white/20 text-white hover:bg-white/10 transition-all text-sm">
                Explore Matches
              </Link>
            </div>

            <ul className="home-hero__stats" aria-label="MyDearPartner trust highlights">
              {trustStats.map(({ icon: Icon, value, label }) => (
                <li key={label}>
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{value}</strong>
                    <small>{label}</small>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="home-hero__visual-panel">
          <div className="home-hero__image-glow" aria-hidden="true" />
          <div className="home-hero__image-orbit" aria-hidden="true" />
          <span className="home-hero__gold-dot home-hero__gold-dot--one" aria-hidden="true" />
          <span className="home-hero__gold-dot home-hero__gold-dot--two" aria-hidden="true" />

          <SmartImage
            className="home-hero__couple-image"
            src="/images/matrimony-hero-couple.webp"
            alt="A smiling Indian couple dressed in elegant traditional clothing"
            width={1536}
            height={1024}
            decoding="async"
            loading="eager"
            fetchPriority="high"
          />

          <ul className="home-hero__floating-cards" aria-label="Matchmaking benefits">
            {floatingCards.map(({ icon: Icon, title, detail, className }, index) => (
              <motion.li
                key={title}
                className={`home-hero__floating-card ${className}`}
                initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.55,
                  delay: reduceMotion ? 0 : 0.25 + index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="home-hero__floating-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
