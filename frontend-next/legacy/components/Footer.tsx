'use client';

import { Link } from '@/lib/router-compat';
import {
  Award,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import HeartLogo from './HeartLogo';
import WorexaLogo from './WorexaLogo';


const linkGroups = [
  {
    title: 'Explore',
    links: [
      { name: 'Search Matches', path: '/search' },
      { name: 'Success Stories', path: '/success-stories' },
      { name: 'Membership Plans', path: '/membership' },
      { name: 'Smart Matcher', path: '/matchmaking' },
    ],
  },
  {
    title: 'Communities',
    links: [
      { name: 'Hindu Matrimony', path: '/search?religion=Hindu' },
      { name: 'Muslim Matrimony', path: '/search?religion=Muslim' },
      { name: 'Christian Matrimony', path: '/search?religion=Christian' },
      { name: 'Sikh Matrimony', path: '/search?religion=Sikh' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About My Dear Partner', path: '/about' },
      { name: 'Contact Support', path: '/contact' },
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Terms of Service', path: '/terms' },
    ],
  },
];

const socials = [
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/my_dearpartnermatrimony?igsh=ZGsxd243c3dzNWM4', color: '#E1306C' },
];

const stats = [
  { value: '99.8%', label: 'Match Accuracy' },
  { value: '50K+',  label: 'Successful Marriages' },
  { value: '2.5M+', label: 'Verified Members' },
  { value: '9+',    label: 'Years of Trust' },
];

function FooterBrand() {
  return (
    <div>
      <Link to="/" className="footer-brand-logo-link">
        <span className="footer-logo-box">
          <HeartLogo size={26} />
        </span>
        <span>
          <span className="footer-brand-title">
            MyDear<span style={{ color: '#d9b36c' }}>Partner</span>
          </span>
          <span className="footer-brand-subtitle">
            Where Meaningful Connections Become Lifelong Commitments
          </span>
        </span>
      </Link>

      <p className="footer-brand-desc">
        Behind every successful marriage is a meaningful connection. At MyDearPartner, we help transform introductions into lasting relationships by creating a trusted environment where genuine people, shared values, and lifelong aspirations come together naturally.
      </p>

      {/* Trust pill */}
      <div className="footer-trust-pill">
        <ShieldCheck style={{ width: 15, color: '#d9b36c' }} />
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,.75)' }}>
          India's Trusted Matrimony
        </span>
      </div>

      {/* Trust badges */}
      <div className="footer-trust-badges">
        {[
          { icon: ShieldCheck, text: 'ID verified' },
          { icon: ShieldCheck,  text: 'Privacy first' },
          { icon: Award,       text: 'Trusted support' },
        ].map(({ icon: Icon, text }) => (
          <span key={text} className="footer-trust-badge-item">
            <Icon style={{ width: 13, color: '#d9b36c' }} />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

function FooterLinks() {
  return (
    <div className="footer-links-grid">
      {linkGroups.map((group) => (
        <div key={group.title}>
          <h3 className="footer-link-group-title">
            {group.title}
          </h3>
          <ul className="footer-link-list">
            {group.links.map((link) => (
              <li key={link.name}>
                <Link to={link.path} className="footer-link-item">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FooterSupport() {
  return (
    <div className="footer-support-card">
      <h3 className="footer-support-title">
        Concierge support
      </h3>
      <p className="footer-support-desc">
        Speak with our team for membership, verification, or compatibility assistance.
      </p>

      <div className="footer-support-links">
        {[
          { icon: Phone, text: '+91 1800-123-4567', href: 'tel:+9118001234567' },
          { icon: Mail,  text: 'support@mydearpartner.com', href: 'mailto:support@mydearpartner.com' },
        ].map(({ icon: Icon, text, href }) => (
          <a key={href} href={href} className="footer-support-link-item">
            <Icon style={{ width: 15, color: '#d9b36c', flexShrink: 0 }} />
            {text}
          </a>
        ))}
        <span className="footer-support-address">
          <MapPin style={{ width: 14, color: '#d9b36c', flexShrink: 0, marginTop: 2 }} />
          Banashankari 3rd Stage, Bengaluru, KA 560085
        </span>
      </div>

      <Link to="/contact" className="footer-support-action">
        Talk to our team <ArrowRight style={{ width: 13 }} />
      </Link>
    </div>
  );
}

function FooterStats() {
  return (
    <div className="footer-stats-bar">
      {stats.map(({ value, label }) => (
        <div key={label} className="footer-stats-item">
          <div className="footer-stats-value">
            {value}
          </div>
          <div className="footer-stats-label">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

function FooterBottom() {
  return (
    <div className="footer-bottom-bar">
      <div className="footer-bottom-text">
        <p className="footer-copyright">
          © 2026 MyDearPartner. All rights reserved. India's trusted matrimony platform.
        </p>
        <div className="footer-attribution">
          <span>Designed &amp; Developed by</span>
          <a href="https://worexatechnologies.com" target="_blank" rel="noopener noreferrer" className="footer-brand-logo-link">
            <WorexaLogo height={26} />
          </a>
        </div>
      </div>

      <div className="footer-bottom-actions">

        {/* Social icons */}
        {socials.map(({ icon: Icon, label, href, color }) => (
          <a
            key={label}
            href={href}
            aria-label={label}
            className="footer-social-link"
            style={{
              '--social-color': color,
              '--social-color-bg': color + '18',
              '--social-color-border': color + '80'
            } as React.CSSProperties}
          >
            <Icon style={{ width: 16 }} />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="footer-root">
      {/* Top accent line */}
      <div className="footer-accent-line" />

      {/* Subtle radial ambient */}
      <div className="footer-ambient" />

      {/* Grain texture */}
      <div className="footer-grain" />

      <div className="footer-inner">
        {/* Main grid */}
        <div className="footer-grid">
          <FooterBrand />
          <FooterLinks />
          <FooterSupport />
        </div>

        <FooterStats />
        <FooterBottom />
      </div>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 1100px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-grid > div:last-child { grid-column: 1 / -1; }
        }
        @media (max-width: 700px) {
          .footer-inner { padding: 48px 20px 0 !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .footer-links-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          .footer-stats-bar { grid-template-columns: 1fr 1fr !important; }
          .footer-bottom-bar { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </footer>
  );
}
