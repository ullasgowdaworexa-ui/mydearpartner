'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Search, Network, Heart, CheckCircle2 } from 'lucide-react';
import { getCompatibilityMatch, type MatchRequest } from '../services/matchmakingApi';
import MatchResults from '../components/MatchResults';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

const CAREERS = [
  'Engineering/Tech',
  'Medicine/Healthcare',
  'Business/Finance',
  'Arts/Design',
  'Education',
  'Law',
  'Science/Research',
];

const VALUES = [
  'Family First',
  'Career Ambition',
  'Adventure & Travel',
  'Spiritual Growth',
  'Community Impact',
  'Financial Independence',
];

export default function MatchmakingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);

  const [p1Details, setP1Details] = useState({
    name: 'Arjun',
    mbti: 'INTJ',
    career: 'Engineering/Tech',
    values: 'Career Ambition',
  });

  const [p2Details, setP2Details] = useState({
    name: 'Priya',
    mbti: 'ENFP',
    career: 'Arts/Design',
    values: 'Adventure & Travel',
  });

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    const requestData: MatchRequest = {
      p1_name: p1Details.name,
      p1_mbti: p1Details.mbti,
      p1_career: p1Details.career,
      p1_values: p1Details.values,
      p2_name: p2Details.name,
      p2_mbti: p2Details.mbti,
      p2_career: p2Details.career,
      p2_values: p2Details.values,
    };

    try {
      const data = await getCompatibilityMatch(requestData);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Compatibility analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[var(--app-bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-primary-50)] px-4 py-2 text-xs font-bold uppercase text-[var(--theme-primary-700)] tracking-wider mb-4 border border-[var(--line)]">
            <Heart className="w-4 h-4 text-[var(--theme-primary-600)]" />
            Smart Compatibility Matcher
          </div>
          <h1 className="text-4xl font-bold font-display text-[var(--ink)] mb-4">
            Smart Compatibility Report
          </h1>
          <p className="text-[var(--muted)]">
            Enter personality and lifestyle details for both individuals to generate a comprehensive
            compatibility analysis across key life dimensions.
          </p>
        </div>

        {/* How it works â€” only shown when no results */}
        {!results && (
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {[
              { icon: User, step: '1', title: 'Enter Details', desc: 'Fill in personality type, career, and core values for both partners.' },
              { icon: Search, step: '2', title: 'Run Analysis', desc: 'Our engine scores compatibility across 4 key life dimensions.' },
              { icon: CheckCircle2, step: '3', title: 'Read Report', desc: 'Get a detailed compatibility report with actionable insights.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="surface-card p-5 text-center">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold text-[var(--theme-primary-700)] uppercase tracking-wider mb-1">Step {step}</p>
                <h3 className="font-bold text-[var(--ink)] mb-1">{title}</h3>
                <p className="text-xs text-[var(--muted)]">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {results ? (
          <MatchResults data={results} onReset={() => setResults(null)} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <form onSubmit={handleMatch} className="surface-card p-8 relative overflow-hidden">
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 w-full h-1 gradient-primary" />

              <div className="grid md:grid-cols-2 gap-12">

                {/* Partner 1 */}
                <div>
                  <div className="flex items-center gap-3 mb-6 border-b border-[var(--line)] pb-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-50)] flex items-center justify-center border border-[var(--line)]">
                      <User className="w-5 h-5 text-[var(--theme-primary-600)]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--ink)] font-display">Person One</h2>
                      <p className="text-xs text-[var(--muted)]">Enter first person's details</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={p1Details.name}
                        onChange={(e) => setP1Details({ ...p1Details, name: e.target.value })}
                        className="hero-field"
                        placeholder="Enter name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Personality Type (MBTI)
                      </label>
                      <select
                        value={p1Details.mbti}
                        onChange={(e) => setP1Details({ ...p1Details, mbti: e.target.value })}
                        className="hero-field"
                        required
                      >
                        {MBTI_TYPES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Career Field
                      </label>
                      <select
                        value={p1Details.career}
                        onChange={(e) => setP1Details({ ...p1Details, career: e.target.value })}
                        className="hero-field"
                        required
                      >
                        {CAREERS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Core Life Value
                      </label>
                      <select
                        value={p1Details.values}
                        onChange={(e) => setP1Details({ ...p1Details, values: e.target.value })}
                        className="hero-field"
                        required
                      >
                        {VALUES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Partner 2 */}
                <div>
                  <div className="flex items-center gap-3 mb-6 border-b border-[var(--line)] pb-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-50)] flex items-center justify-center border border-[var(--line)]">
                      <Network className="w-5 h-5 text-[var(--theme-primary-600)]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--ink)] font-display">Person Two</h2>
                      <p className="text-xs text-[var(--muted)]">Enter second person's details</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={p2Details.name}
                        onChange={(e) => setP2Details({ ...p2Details, name: e.target.value })}
                        className="hero-field"
                        placeholder="Enter name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Personality Type (MBTI)
                      </label>
                      <select
                        value={p2Details.mbti}
                        onChange={(e) => setP2Details({ ...p2Details, mbti: e.target.value })}
                        className="hero-field"
                        required
                      >
                        {MBTI_TYPES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Career Field
                      </label>
                      <select
                        value={p2Details.career}
                        onChange={(e) => setP2Details({ ...p2Details, career: e.target.value })}
                        className="hero-field"
                        required
                      >
                        {CAREERS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wider">
                        Core Life Value
                      </label>
                      <select
                        value={p2Details.values}
                        onChange={(e) => setP2Details({ ...p2Details, values: e.target.value })}
                        className="hero-field"
                        required
                      >
                        {VALUES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-200 text-center">
                  {error}
                </div>
              )}

              <div className="mt-10 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 px-10 py-4 text-base min-w-[320px] justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analysing Compatibility...
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5 fill-current" />
                      Generate Compatibility Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
