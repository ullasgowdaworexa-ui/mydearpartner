'use client';

import SmartImage from '@/components/shared/smart-image';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Heart,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Link } from '@/lib/router-compat';

const trustStats = [
  { icon: Heart, value: '10L+', label: 'Happy Members' },
  { icon: ShieldCheck, value: '100%', label: 'Verified Profiles' },
  { icon: LockKeyhole, value: '25+', label: 'Years of Trust' },
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
          <Sparkles className="home-hero__decor home-hero__decor--sparkle" aria-hidden="true" />

          <motion.div
            className="home-hero__copy"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="home-hero__eyebrow">
              <ShieldCheck aria-hidden="true" />
              <span>Private Matchmaking Concierge</span>
            </div>

            <h1 id="home-hero-title" className="home-hero__title">
              <span>A more personal</span>
              <span>way to find</span>
              <em>your person.</em>
            </h1>

            <p className="home-hero__supporting-copy">
              Curated introductions shaped around your values, family and futureâ€”not another
              endless list of profiles.
            </p>

            <div className="home-hero__actions">
              <Link to="/register" className="home-hero__primary-cta">
                <span>Find Your Perfect Match</span>
                <ArrowRight aria-hidden="true" />
              </Link>

              <div className="home-hero__login-row">
                <span>Already registered?</span>
                <Link to="/login">
                  <MessageCircle aria-hidden="true" />
                  Login with phone number
                </Link>
              </div>
            </div>

            <ul className="home-hero__stats" aria-label="My Dear Partner trust highlights">
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
          <Sparkles className="home-hero__image-sparkle" aria-hidden="true" />

          <SmartImage
            className="home-hero__couple-image"
            src="/images/matrimony-hero-couple.webp"
            alt="A smiling Indian couple dressed in elegant traditional clothing"
            width={1536}
            height={1024}
            decoding="async"
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
