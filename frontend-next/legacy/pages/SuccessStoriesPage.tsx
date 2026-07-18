'use client';

import SmartImage from '@/components/shared/smart-image';
import { Link } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import {
  ArrowRight, Heart, MapPin, Quote, Star, ShieldCheck, HeartHandshake, Compass, Users
} from 'lucide-react';

const STATIC_FEATURED_STORIES = [
  {
    coupleNames: 'Ayesha & Imran',
    story: "Every step of this journey felt guided, not rushed. MyDearPartner gave us the space to connect naturally, and today we're building a life we both dreamed of.",
    date: 'Married in 2025',
    location: 'Bengaluru',
    photo: '/images/bride-portrait.jpg'
  },
  {
    coupleNames: 'Sneha & Arjun',
    story: "Our first conversation felt comfortable and genuine. There was no pressure, just two people getting to know each other with honesty and respect. MyDearPartner gave us the confidence to take the first step.",
    date: 'Married in 2024',
    location: 'Hyderabad',
    photo: '/images/couple-sunset.jpg'
  },
  {
    coupleNames: 'Fatima & Sameer',
    story: "Finding the right person isn’t about meeting many people; it’s about meeting the right one. Through MyDearPartner, we found not just compatibility but friendship, understanding, and a future we now share.",
    date: 'Married in 2025',
    location: 'Chennai',
    photo: '/images/matrimony-hero-couple.webp'
  }
];

export default function SuccessStoriesPage({ initialStories = [], initialReviews = [] }: { initialStories?: any[]; initialReviews?: any[] } = {}) {
  // We keep the props signature to maintain compatibility, but render the approved redesigned copy
  return (
    <main className="stories-page">
      {/* Hero Section */}
      <section className="stories-hero">
        <SmartImage className="stories-hero-art" src="/images/stories-3d-hero-v2.png" alt="Sculptural golden rings forming a heart" />
        <div className="stories-hero-shade" />
        <div className="stories-orbit stories-orbit-one" />
        <div className="stories-orbit stories-orbit-two" />
        <div className="stories-hero-inner">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75 }}>
            <p className="stories-kicker"><span /> SUCCESS STORIES</p>
            <h1>Every Match Has a Story. <br /><em>Every Story Begins with Hope.</em></h1>
            <p className="stories-lead">
              Behind every successful relationship is a journey of trust, patience, and meaningful connection. 
              At MyDearPartner, we’re honoured to have played a small role in bringing together couples who have found love, companionship, and a lifetime of happiness.
            </p>
            <p className="stories-accent-quote">
              Their stories remind us that the right person is worth waiting for.
            </p>
            <div className="stories-actions">
              <Link to="/register" className="stories-gold-btn">Start Your Journey <ArrowRight /></Link>
              <a href="#featured-stories" className="stories-ghost-btn">Read Stories</a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro section */}
      <section className="stories-intro">
        <div className="stories-shell">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="stories-intro-box"
          >
            <p className="stories-section-label">Real People. Real Connections. Real Beginnings.</p>
            <h2>One introduction, <br /><em>infinite possibility.</em></h2>
            <p className="stories-intro-body">
              Every couple has a unique journey, but they all share one thing in common: a meaningful connection that started with a simple introduction. These stories celebrate the moments that turned conversations into commitments & introductions into lifelong togetherness.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Stories Section */}
      <section className="stories-featured" id="featured-stories">
        <div className="stories-shell">
          <div className="stories-section-title-wrap">
            <p className="stories-section-label">Featured Stories</p>
            <h2>In Their Own Words</h2>
          </div>
          
          <div className="stories-featured-grid">
            {STATIC_FEATURED_STORIES.map((story, idx) => (
              <motion.article 
                key={story.coupleNames} 
                className="story-featured-card"
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.6 }}
              >
                <div className="story-card-photo-wrapper">
                  <SmartImage src={story.photo} alt={story.coupleNames} />
                  <div className="story-card-overlay" />
                  <div className="story-card-rating">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} fill="currentColor" className="star-icon" />
                    ))}
                  </div>
                </div>
                <div className="story-card-info">
                  <Quote className="quote-icon" size={24} />
                  <blockquote>“{story.story}”</blockquote>
                  <div className="story-card-footer">
                    <h3>{story.coupleNames}</h3>
                    <div className="story-card-meta">
                      <span>{story.date}</span>
                      <span className="bullet">•</span>
                      <span><MapPin size={12} /> {story.location}</span>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stories-stats-section">
        <div className="stories-shell">
          <div className="stories-stats-grid">
            <div className="stat-card">
              <h3>10,000+</h3>
              <p>Happy Members</p>
            </div>
            <div className="stat-card">
              <h3>5,000+</h3>
              <p>Meaningful Matches</p>
            </div>
            <div className="stat-card">
              <h3>200+</h3>
              <p>Communities Connected</p>
            </div>
            <div className="stat-card">
              <h3>4.9★</h3>
              <p>Member Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why & Building Section */}
      <section className="stories-about-trust">
        <div className="stories-shell">
          <div className="stories-about-grid">
            <motion.div 
              className="about-block"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="icon-wrap"><HeartHandshake size={24} /></div>
              <h3>Why Their Stories Matter</h3>
              <p>
                Every successful relationship is built on trust, shared values, and genuine conversations. 
                These experiences inspire us to continue creating a platform where meaningful relationships can grow with confidence and respect.
              </p>
            </motion.div>
            <motion.div 
              className="about-block"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="icon-wrap"><Compass size={24} /></div>
              <h3>Building Futures, One Story at a Time</h3>
              <p>
                Every message exchanged, every family introduced, and every promise made is a reminder of why we do what we do. 
                We are dedicated to helping more people form lasting, meaningful relationships.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Share Your Journey Section */}
      <section className="stories-share-section">
        <div className="stories-shell">
          <motion.div 
            className="share-box"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="stories-section-label light">Share Your Journey</p>
            <h2>Your Story Could Inspire Someone Else.</h2>
            <p>
              If you found your life partner through MyDearPartner, we’d love to hear your journey. 
              Your experience may give hope and confidence to someone beginning their own search.
            </p>
            <Link to="/contact" className="stories-gold-btn">
              Share Your Story
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Closing Section */}
      <section className="stories-closing">
        <div className="stories-final-ring ring-a" />
        <div className="stories-final-ring ring-b" />
        <div className="stories-shell">
          <motion.div 
            className="closing-box"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Heart size={24} className="sparkles-icon fill-current" />
            <p className="stories-section-label light">Closing Section</p>
            <h2>Your Forever Story Could Be Next.</h2>
            <p>
              Thousands begin their search with hope. Every day, new conversations become lasting relationships. 
              Create your profile today and take the first step toward writing your own success story.
            </p>
            <Link to="/register" className="stories-gold-btn">
              Start Your Journey <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Page Tagline centered badge at the bottom */}
      <div className="stories-tagline-badge">
        <p>“Every forever has a first hello. Let yours begin with MyDearPartner.”</p>
      </div>
    </main>
  );
}
