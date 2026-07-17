'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/lib/router-compat';
import {
  Mail, Phone, MapPin, Clock, Send,
  MessageCircle, HelpCircle, Shield,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { fetchApi } from '../services/apiClient';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await fetchApi('/contact-enquiries/', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">

      {/* â•â•â•â•â•â•â•â•â•â• HERO â•â•â•â•â•â•â•â•â•â• */}
      <section className="relative overflow-hidden bg-gradient-to-br from-soft-pink via-white to-purple-50 pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(233,30,99,0.10),transparent)]" />

        <div className="relative mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">


          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold leading-[1.12] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.25rem]"
          >
            Get in <span className="text-gradient-primary">Touch</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg"
          >
            Have a question, need support, or want to partner with us? We're just a message away and always happy to help.
          </motion.p>

          {/* Contact pills */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { icon: Phone, text: '+91 1800 123 4567' },
              { icon: Mail,  text: 'support@mydearpartner.com' },
              { icon: Clock, text: 'Monâ€“Sat Â· 9AMâ€“8PM IST' },
            ].map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/60 backdrop-blur-lg border border-white/50 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm"
              >
                <p.icon className="h-3.5 w-3.5 text-[var(--theme-primary-700)]" />
                {p.text}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Wave bottom */}
        <svg viewBox="0 0 1440 28" className="block w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 28 Q360 0 720 14 Q1080 28 1440 7 L1440 28 Z" fill="white" />
        </svg>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â• CONTACT FORM + INFO â•â•â•â•â•â•â•â•â•â• */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.8fr]">

            {/* Info cards */}
            <div>
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--theme-primary-700)]">Reach out</p>
              <div className="space-y-4">
                {[
                  { icon: Phone,  title: 'Phone',         info: '+91 1800 123 4567',         note: 'Toll-free Â· Monâ€“Sat 9AMâ€“8PM',  color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                  { icon: Mail,   title: 'Email',         info: 'support@mydearpartner.com',      note: 'Reply within 2â€“4 hours',       color: 'text-[var(--theme-primary-600)] bg-[var(--theme-primary-50)] border-[var(--theme-primary-100)]' },
                  { icon: Mail,   title: 'Partnerships',  info: 'partnerships@mydearpartner.com', note: 'Business & media enquiries',   color: 'text-violet-600 bg-violet-50 border-violet-100' },
                  { icon: MapPin, title: 'Head Office',   info: 'BKC, Mumbai 400051',         note: 'My Dear Partner Tower, Maharashtra', color: 'text-[var(--theme-secondary-500)] bg-rose-50 border-rose-100' },
                  { icon: Clock,  title: 'Working Hours', info: 'Mon â€“ Sat',                  note: '9:00 AM â€“ 8:00 PM IST',        color: 'text-[var(--theme-secondary-600)] bg-amber-50 border-amber-100' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-lg border border-white/50 p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{item.title}</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">{item.info}</p>
                      <p className="text-xs text-gray-400">{item.note}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="overflow-hidden rounded-3xl bg-white/60 backdrop-blur-lg border border-white/50 shadow-xl shadow-gray-200/80">
                {/* macOS-style top bar */}
                <div className="flex items-center gap-2 border-b border-gray-100 px-8 py-5">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-[var(--theme-secondary-400)]" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <p className="ml-3 text-sm font-semibold text-gray-900">Send us a message</p>
                </div>

                <div className="px-8 py-8">
                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-12 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
                      >
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                      </motion.div>
                      <h3 className="font-display text-2xl font-bold text-gray-900">Message Sent!</h3>
                      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
                        Thank you for reaching out. Our support team will get back to you within <strong>2â€“4 hours</strong>.
                      </p>
                      <button type="button"
                        onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: '', message: '' }); }}
                        className="mt-7 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--theme-primary-700)] hover:underline"
                      >
                        Send another message <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                            Full Name <span className="text-[var(--theme-primary-700)]">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Priya Sharma"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-[var(--theme-primary-600)] focus:bg-white/60 backdrop-blur-lg border border-white/50 focus:ring-2 focus:ring-[var(--theme-primary-500)]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                            Email Address <span className="text-[var(--theme-primary-700)]">*</span>
                          </label>
                          <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-[var(--theme-primary-600)] focus:bg-white/60 backdrop-blur-lg border border-white/50 focus:ring-2 focus:ring-[var(--theme-primary-500)]/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Subject</label>
                        <select
                          value={formData.subject}
                          onChange={e => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-[var(--theme-primary-600)] focus:bg-white/60 backdrop-blur-lg border border-white/50 focus:ring-2 focus:ring-[var(--theme-primary-500)]/10"
                        >
                          <option value="">Choose a topic...</option>
                          <option value="general">General Inquiry</option>
                          <option value="support">Technical Support</option>
                          <option value="membership">Membership Question</option>
                          <option value="feedback">Feedback</option>
                          <option value="partnership">Partnership</option>
                          <option value="report">Report an Issue</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                          Message <span className="text-[var(--theme-primary-700)]">*</span>
                        </label>
                        <textarea
                          required
                          rows={5}
                          value={formData.message}
                          onChange={e => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Describe how we can help you..."
                          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-300 focus:border-[var(--theme-primary-600)] focus:bg-white/60 backdrop-blur-lg border border-white/50 focus:ring-2 focus:ring-[var(--theme-primary-500)]/10"
                        />
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-gray-400">
                          ðŸ”’ Your information is kept private and never shared.
                        </p>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:scale-[1.02]"
                        >
                          <Send className="h-4 w-4" />
                          {submitting ? 'SendingÃ¢â‚¬Â¦' : 'Send Message'}
                        </button>
                      </div>
                      {submitError && <p role="alert" className="text-sm font-semibold text-red-600">{submitError}</p>}
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â• QUICK HELP â•â•â•â•â•â•â•â•â•â• */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--theme-primary-700)]">Self-service</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Other ways to get <span className="text-gradient-primary">help</span>
            </h2>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: HelpCircle,    title: 'Help Center',  desc: 'Browse our FAQ, guides, and tutorials to find quick answers on your own.', cta: 'Visit Help Center' },
              { icon: MessageCircle, title: 'Live Chat',    desc: 'Connect instantly with a support agent via chat. Available Monâ€“Sat 9AMâ€“8PM.', cta: 'Start Live Chat' },
              { icon: Shield,        title: 'Report Issue', desc: 'Found a suspicious profile or a technical problem? Let us know right away.', cta: 'Report Now' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col rounded-3xl border border-gray-100 bg-white/60 backdrop-blur-lg border border-white/50 p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--theme-primary-600)]/20 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--theme-primary-50)] transition-all duration-300 group-hover:gradient-primary">
                  <item.icon className="h-6 w-6 text-[var(--theme-primary-700)] transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="mb-2 font-display text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-gray-500">{item.desc}</p>
                <Link to="/support" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--theme-primary-700)] transition-all group-hover:gap-2.5">
                  {item.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
