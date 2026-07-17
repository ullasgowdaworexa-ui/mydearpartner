'use client';

import SmartImage from '@/components/shared/smart-image';

import { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Calendar, ChevronLeft, ChevronRight,
  Heart, MapPin, MessageCircle, Quote, ShieldCheck, Sparkles, Star, Users,
} from 'lucide-react';
import { getSuccessStories, getTestimonials } from '../services/dataService';

const principles = [
  { icon: ShieldCheck, number: '01', title: 'Verified, always', copy: 'Every profile is reviewed so conversations begin with confidence.' },
  { icon: MessageCircle, number: '02', title: 'Meaning before volume', copy: 'Fewer, more compatible introductions create space for real connection.' },
  { icon: ShieldCheck, number: '03', title: 'Private by design', copy: 'You decide who sees your story, photographs, and contact details.' },
];

export default function SuccessStoriesPage({ initialStories = [], initialReviews = [] }: { initialStories?: any[]; initialReviews?: any[] } = {}) {
  const [stories, setStories] = useState<any[]>(initialStories);
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [error, setError] = useState('');
  const [activeReview, setActiveReview] = useState(0);

  useEffect(() => {
    if (initialStories.length || initialReviews.length) return;
    Promise.all([getSuccessStories(), getTestimonials()])
      .then(([storyRows, reviewRows]) => { setStories(storyRows); setReviews(reviewRows); })
      .catch(() => setError('Published stories could not be loaded.'));
  }, [initialReviews.length, initialStories.length]);

  const featured = stories[0];
  const moreStories = stories.slice(1, 7);
  const review = reviews[activeReview];
  const cycle = (direction: number) => {
    if (!reviews.length) return;
    setActiveReview((current) => (current + direction + reviews.length) % reviews.length);
  };

  return (
    <main className="stories-page">
      <section className="stories-hero">
        <SmartImage className="stories-hero-art" src="/images/stories-3d-hero-v2.png" alt="Sculptural golden rings forming a heart" />
        <div className="stories-hero-shade" />
        <div className="stories-orbit stories-orbit-one" /><div className="stories-orbit stories-orbit-two" />
        <div className="stories-hero-inner">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75 }}>
            <p className="stories-kicker"><span /> Real people. Real beginnings.</p>
            <h1>Every match becomes a story <em>worth telling.</em></h1>
            <p className="stories-lead">From a thoughtful introduction to a lifetime together, discover the journeys that began right here.</p>
            <div className="stories-actions">
              <Link to="/register" className="stories-gold-btn">Start your story <ArrowRight /></Link>
              <a href="#couples" className="stories-ghost-btn">Meet the couples</a>
            </div>
            {error && <p role="alert">{error}</p>}
          </motion.div>
        </div>
        <div className="stories-scroll">Scroll to discover <span /></div>
      </section>

      {featured ? <section className="stories-feature">
        <div className="stories-shell stories-feature-grid">
          <motion.div className="stories-feature-visual" initial={{ opacity: 0, x: -35 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="stories-photo-frame"><SmartImage src={featured.photo} alt={featured.coupleNames} /></div>
            <div className="stories-match-pill"><Heart fill="currentColor" /><span><b>94%</b> values aligned</span></div>
            <div className="stories-frame-line" />
          </motion.div>
          <motion.div className="stories-feature-copy" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="stories-section-label">Featured chapter Â· {featured.date}</p>
            <div className="stories-stars">{Array.from({ length: featured.rating || 5 }).map((_, i) => <Star key={i} fill="currentColor" />)}</div>
            <Quote />
            <blockquote>â€œ{featured.story}â€</blockquote>
            <div className="stories-couple-meta"><div><strong>{featured.coupleNames}</strong><span><MapPin /> {featured.location}</span></div></div>
          </motion.div>
        </div>
      </section> : <section className="stories-feature"><div className="stories-shell"><p>No success stories have been published yet.</p></div></section>}

      <section className="stories-gallery" id="couples">
        <div className="stories-shell">
          <div className="stories-section-head">
            <div><p className="stories-section-label">The story collection</p><h2>One introduction.<br /><em>Infinite possibility.</em></h2></div>
            <p>Every relationship follows its own rhythm. These couples found theirs through shared values, patient conversations, and a little trust.</p>
          </div>
          <div className="stories-grid">
            {moreStories.map((story, index) => (
              <motion.article key={story.id} className="story-tilt-card" initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .07 }}>
                <div className="story-card-photo"><SmartImage src={story.photo} alt={story.coupleNames} /><div /><span>Story {String(index + 2).padStart(2, '0')}</span></div>
                <div className="story-card-body"><div className="story-card-title"><div><h3>{story.coupleNames}</h3><p><MapPin /> {story.location}</p></div><Heart /></div><p>{story.story}</p><footer><span><Calendar /> {story.date}</span><span>{story.rating || 5}.0 <Star fill="currentColor" /></span></footer></div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="stories-voice">
        <div className="stories-shell stories-voice-grid">
          <div className="stories-voice-title"><p className="stories-section-label light">In their own words</p><h2>Love feels different when it feels <em>right.</em></h2><div className="stories-review-controls"><button type="button" onClick={() => cycle(-1)} aria-label="Previous review"><ChevronLeft /></button><span>{String(activeReview + 1).padStart(2, '0')} / {String(reviews.length).padStart(2, '0')}</span><button type="button" onClick={() => cycle(1)} aria-label="Next review"><ChevronRight /></button></div></div>
          {review && <div className="stories-review-stage">
            <div className="stories-review-halo" />
            <AnimatePresence mode="wait">
              <motion.article key={activeReview} initial={{ opacity: 0, rotateY: 10, x: 25 }} animate={{ opacity: 1, rotateY: 0, x: 0 }} exit={{ opacity: 0, rotateY: -10, x: -25 }} transition={{ duration: .4 }}>
                <Quote /><p>â€œ{review?.text}â€</p><div><SmartImage src={review?.photo} alt={review?.name} /><span><strong>{review?.name}</strong><small>{review?.plan}</small></span><div className="stories-stars">{Array.from({ length: review?.rating || 5 }).map((_, i) => <Star key={i} fill="currentColor" />)}</div></div>
              </motion.article>
            </AnimatePresence>
          </div>}
        </div>
      </section>

      <section className="stories-principles">
        <div className="stories-shell"><div className="stories-section-head compact"><div><p className="stories-section-label">Why stories begin here</p><h2>Trust creates room for connection.</h2></div></div><div className="stories-principle-grid">{principles.map(({ icon: Icon, number, title, copy }) => <article key={title}><span>{number}</span><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div></div>
      </section>

      <section className="stories-final">
        <div className="stories-final-ring ring-a" /><div className="stories-final-ring ring-b" />
        <div><Sparkles /><p className="stories-section-label light">Your chapter is waiting</p><h2>Ready to meet someone meaningful?</h2><p>Create a private profile in a few minutes. Your next hello could change everything.</p><Link to="/register" className="stories-gold-btn">Begin free <ArrowRight /></Link></div>
      </section>
    </main>
  );
}
