'use client';

import SmartImage from '@/components/shared/smart-image';

import { useState } from 'react';
import { Link } from '@/lib/router-compat';
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
  Sparkles,
  Star,
  UserCheck,
  Heart,
} from 'lucide-react';
import HeroSection from '../components/home/HeroSection';


const steps = [
  {
    icon: UserCheck, number: '01',
    title: 'Tell us who you are',
    text: 'Build a thoughtful profile around your values, family, lifestyle, and hopes for the future.',
  },
  {
    icon: Search, number: '02',
    title: 'Discover aligned matches',
    text: 'Our compatibility system brings the most relevant verified profiles to the top.',
  },
  {
    icon: MessageCircle, number: '03',
    title: 'Connect with confidence',
    text: 'Private messaging and consent-first contact controls help every conversation feel safe.',
  },
  {
    icon: HeartHandshake, number: '04',
    title: 'Meet with intention',
    text: 'Move from introduction to a meaningful relationship with support whenever you need it.',
  },
];

const numbers = [
  {
    icon: ShieldCheck,
    value: '100',
    suffix: '%',
    label: 'Profiles reviewed',
    desc: 'Every profile is carefully screened to reduce fake accounts and protect genuine members seeking a real connection.',
  },
  {
    icon: Heart,
    value: '50',
    suffix: '+',
    label: 'Compatibility signals',
    desc: 'Values, family goals, lifestyle, and preferences shape every personalised recommendation we show you.',
  },
  {
    icon: LockKeyhole,
    value: 'âˆž',
    suffix: '',
    label: 'Privacy controls',
    desc: 'You decide who views your photos, details, and contact information, always with full consent-first design.',
  },
];

const promises = [
  {
    icon: ShieldCheck,
    value: '100%',
    title: 'Profiles reviewed',
    desc: 'Our moderation team manually reviews every account before it goes live. Fake profiles cannot slip through.',
  },
  {
    icon: LockKeyhole,
    value: 'Private',
    title: 'By design',
    desc: 'You decide who can view your photos, contact details, and story. Nothing is shared without your explicit consent.',
  },
  {
    icon: ShieldCheck,
    value: 'Safe',
    title: 'Community standards',
    desc: 'Our dedicated trust and safety team enforces community standards and responds to concerns around the clock.',
  },
];

const faqs: [string, string][] = [
  ['Is registration free?', 'Yes. You can create a profile, set partner preferences, and explore compatible matches for free. Paid plans unlock additional communication and concierge features.'],
  ['How are profiles verified?', 'Our review process combines mobile and email confirmation, profile moderation, and identity checks for enhanced verification badges.'],
  ['Can my family help manage my profile?', 'Yes. My Dear Partner supports both self-managed and family-assisted journeys while keeping the member in control of privacy and communication.'],
  ['How does compatibility matching work?', 'Recommendations consider partner preferences alongside deeper signals such as values, lifestyle, education, location, and long-term expectations.'],
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  const fadeUpView = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65, delay },
  });

  return (
    <div className="mh">

      {/* â”€â”€ Â§1 HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <HeroSection />


      {/* â”€â”€ Â§2 TRUST BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="mh-trust-bar">
        <div className="mh-trust-bar-inner">
          {[
            [ShieldCheck, 'Every profile verified'],
            [LockKeyhole, 'Privacy-first design'],
            [ShieldCheck, '24 / 7 trust & safety'],
            [Heart, '12,000+ families connected'],
          ].map(([Icon, text]) => (
            <div key={text as string} className="mh-trust-item">
              {/* @ts-ignore */}
              <Icon /> {text as string}
            </div>
          ))}
        </div>
      </div>

      {/* â”€â”€ Â§3 INTRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-intro">
        <div className="mh-shell mh-intro-grid">
          <motion.div {...fadeUpView()} className="mh-intro-left">
            <div className="mh-intro-visual">
              <SmartImage src="/images/couple-sunset.jpg" alt="A couple on their wedding day" />
              <div className="mh-intro-stamp">
                <Heart />
                <div>
                  <strong>Found on My Dear Partner</strong>
                  <span>Married 2024 Â· Udaipur</span>
                </div>
              </div>
            </div>
            <div className="mh-intro-number">
              <strong>50K</strong>
              <span>Members</span>
            </div>
          </motion.div>

          <motion.div {...fadeUpView(0.15)}>
            <span className="mh-eyebrow dark">A better way to begin</span>
            <h2>Matchmaking should feel human, not like endless scrolling.</h2>
            <p>
              We combine cultural understanding with thoughtful technology, helping you spend less time searching
              and more time meeting people who genuinely align with your life.
            </p>
            <br /><br />
            <Link to="/about" className="mh-link" id="intro-learn-more">Our approach <ArrowRight /></Link>
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ Â§4 PROCESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-process">
        <div className="mh-shell">
          <div className="mh-process-head">
            <div>
              <span className="mh-eyebrow">How it works</span>
              <h2>Four considered steps.<br />One meaningful beginning.</h2>
            </div>
            <p>Simple enough to start today. Thoughtful enough for a decision that shapes the rest of your life.</p>
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

      {/* â”€â”€ Â§5 STORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-story">
        <div className="mh-story-visual">
          <SmartImage src="/images/couple-sunset.jpg" alt="My Dear Partner success story" />
          <div className="mh-story-overlay-card">
            <div className="mh-story-overlay-icon"><Heart /></div>
            <div className="mh-story-overlay-text">
              <strong>Found on My Dear Partner</strong>
              <span>Married February 2024 Â· Udaipur, Rajasthan</span>
            </div>
          </div>
        </div>
        <div className="mh-story-copy">
          <span className="mh-eyebrow dark">A real beginning</span>
          <div className="mh-stars">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} fill="currentColor" />)}
          </div>
          <blockquote>
            "It never felt like an algorithm chose for us. It felt like we were introduced to exactly
            the right person at exactly the right time."
          </blockquote>
          <div className="mh-story-author">
            <strong>Ravi &amp; Deepa</strong>
            <span><MapPin /> Udaipur, Rajasthan Â· Married 2024</span>
          </div>
          <Link to="/success-stories" className="mh-link" id="story-more-link">
            More success stories <ArrowRight />
          </Link>
        </div>
      </section>

      {/* â”€â”€ Â§6 NUMBERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-numbers">
        <div className="mh-shell">
          <div className="mh-numbers-head">
            <span className="mh-eyebrow dark">Our commitment</span>
            <h2>Built on trust,<br />delivered with care.</h2>
          </div>
          <div className="mh-numbers-grid">
            {numbers.map(({ icon: Icon, value, suffix, label, desc }, i) => (
              <motion.div key={label} {...fadeUpView(i * 0.12)} className="mh-number-card">
                <div className="mh-number-icon"><Icon /></div>
                <div className="mh-number-val">
                  {value}<sup>{suffix}</sup>
                </div>
                <div className="mh-number-label">{label}</div>
                <p className="mh-number-desc">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Â§7 PROMISE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-promise">
        <div className="mh-shell">
          <div className="mh-promise-head">
            <div>
              <span className="mh-eyebrow">Trust, built in</span>
              <h2>Your journey deserves both warmth<br />and protection.</h2>
            </div>
            <p>
              We built My Dear Partner with privacy-first values and human oversight at every step so every member
              feels safe, seen, and respected.
            </p>
          </div>
          <div className="mh-promises">
            {promises.map(({ icon: Icon, value, title, desc }, i) => (
              <motion.div key={title} {...fadeUpView(i * 0.12)} className="mh-promise-card">
                <div className="mh-promise-icon"><Icon /></div>
                <div className="mh-promise-val">{value}</div>
                <div className="mh-promise-title">{title}</div>
                <p className="mh-promise-desc">{desc}</p>
                <div className="mh-promise-badge"><Check /> My Dear Partner standard</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Â§8 MEMBERSHIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-membership">
        <div className="mh-membership-visual">
          <SmartImage src="/images/wedding-rings.jpg" alt="Wedding rings representing lasting commitment" />
        </div>
        <div className="mh-membership-copy">
          <div className="mh-membership-icon"><Crown /></div>
          <span className="mh-eyebrow dark">Membership with purpose</span>
          <h2>When you're ready to search more intentionally.</h2>
          <p>
            Unlock unlimited conversations, priority visibility, advanced preferences, and dedicated
            relationship support with our premium membership.
          </p>
          <ul className="mh-membership-list">
            <li><Check /> Unlimited contact views and messaging</li>
            <li><Check /> Advanced compatibility filters</li>
            <li><Check /> Personal relationship advisor</li>
            <li><Check /> Priority profile placement</li>
          </ul>
          <Link to="/membership" id="membership-cta" className="btn-gold">
            Explore membership <ArrowRight />
          </Link>
        </div>
      </section>

      {/* â”€â”€ Â§9 FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-faq">
        <div className="mh-shell mh-faq-grid">
          <div className="mh-faq-left">
            <span className="mh-eyebrow dark">Before you begin</span>
            <h2>A few things you may be wondering.</h2>
            <p>Still have a question? Our relationship support team would be glad to help.</p>
            <Link to="/contact" className="mh-link" id="faq-contact-link">Talk to our team <ArrowRight /></Link>
          </div>
          <div className="mh-faq-list">
            {faqs.map(([question, answer], index) => {
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

      {/* â”€â”€ Â§10 FINAL CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mh-final">
        <div className="mh-final-ring mh-final-ring-1" aria-hidden="true" />
        <div className="mh-final-ring mh-final-ring-2" aria-hidden="true" />
        <div className="mh-final-ring mh-final-ring-3" aria-hidden="true" />

        <motion.div {...fadeUpView()} className="mh-final-inner">
          <Sparkles className="mh-final-icon" />
          <span className="mh-eyebrow">Your next chapter</span>
          <h2>Someone meaningful may be closer than you think.</h2>
          <p>Create your profile today. It's free, private, and takes only a few minutes.</p>
          <div className="mh-final-actions">
            <Link to="/register" id="final-signup-btn" className="btn-gold">
              Begin your journey <ArrowRight />
            </Link>
            <Link to="/login" id="final-login-btn" className="btn-ghost">
              Already registered? Login
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
