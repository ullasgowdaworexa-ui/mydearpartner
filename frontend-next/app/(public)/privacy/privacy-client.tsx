'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Database, Eye, EyeOff, Share2, Lock, UserCheck, Cookie, Clock, 
  Fingerprint, Ban, ExternalLink, RefreshCw, Mail, Phone, MapPin, CheckCircle, Search, ChevronDown, ChevronUp
} from 'lucide-react';

export default function PrivacyClient() {
  const [activeSection, setActiveSection] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const sections = [
    {
      num: 1,
      title: 'Information We Collect',
      icon: Database,
      gradient: 'from-blue-500 to-indigo-600',
      color: '#3b82f6',
      bg: '#eff6ff',
      border: '#bfdbfe',
      content: 'To provide a secure and personalized matchmaking experience, we may collect various types of information, including personal details voluntarily submitted, trust verification logs, and automatic browsing records.',
      bullets: [
        'Personal Information: Full name, Date of birth, age, Gender, Mobile number, Email address, Location, Profile photos, Marital status, Religion/caste, Education, profession, income, family details, lifestyle and partner preferences.',
        'Verification Information: Government-issued identification (when required), Mobile or email verification details, and profile authentication logs to build platform authenticity.',
        'Technical Information: Device parameters, browser type, IP address, OS, login history, cookies, analytics data, and platform usage logs.'
      ]
    },
    {
      num: 2,
      title: 'How We Use Your Information',
      icon: Eye,
      gradient: 'from-emerald-500 to-teal-600',
      color: '#10b981',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      content: 'We use your information solely to facilitate and protect our matrimonial services. We do not use your personal information for unrelated purposes without your consent.',
      bullets: [
        'Create and manage your account.',
        'Display your matrimonial profile to eligible members.',
        'Recommend compatible matches based on your preferences.',
        'Verify profile authenticity to ensure trust.',
        'Improve platform security and user experience.',
        'Respond to customer support requests.',
        'Send important account updates and service notifications.',
        'Prevent fraud, misuse, or unauthorized activities.',
        'Comply with legal obligations where applicable.'
      ]
    },
    {
      num: 3,
      title: 'Profile Visibility',
      icon: EyeOff,
      gradient: 'from-purple-500 to-indigo-650',
      color: '#6366f1',
      bg: '#eef2ff',
      border: '#c7d2fe',
      content: 'Your profile information is shared only as necessary to facilitate matrimonial connections. Certain details may remain hidden until you choose to share them.',
      bullets: [
        'Control over overall profile visibility settings.',
        'Control over photo visibility and blurred views.',
        'Control over direct contact information sharing.',
        'Search configuration and filtering rules.'
      ]
    },
    {
      num: 4,
      title: 'Sharing of Information',
      icon: Share2,
      gradient: 'from-amber-500 to-orange-600',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fef3c7',
      content: 'We do not sell or rent your personal information to third parties. We share details only with members (based on settings), trusted platform service providers, or when required by law or to protect user safety.',
      bullets: []
    },
    {
      num: 5,
      title: 'Data Security',
      icon: Lock,
      gradient: 'from-rose-500 to-red-600',
      color: '#f43f5e',
      bg: '#fff1f2',
      border: '#fecdd3',
      content: 'Protecting your information is a priority. We implement reasonable administrative, technical, and organizational safeguards to protect your data against unauthorized access, alteration, disclosure, or destruction. However, no internet-based service can guarantee absolute security.',
      bullets: []
    },
    {
      num: 6,
      title: 'User Responsibilities',
      icon: UserCheck,
      gradient: 'from-orange-500 to-amber-600',
      color: '#f97316',
      bg: '#fff7ed',
      border: '#ffedd5',
      content: 'You are responsible for providing accurate profile details, keeping login credentials confidential, reporting suspicious profiles or behaviour, and using absolute caution before sharing personal, financial, or sensitive information.',
      bullets: [
        'Never send money or confidential financial information to anyone you meet on the platform.',
        'Verify potential matches independently before making personal decisions.'
      ]
    },
    {
      num: 7,
      title: 'Cookies and Analytics',
      icon: Cookie,
      gradient: 'from-emerald-600 to-teal-700',
      color: '#059669',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      content: 'MyDearPartner uses cookies and similar technologies to improve performance, remember user preferences, analyze visitor behaviour, and enhance overall browsing. You can control cookie settings in your browser.',
      bullets: []
    },
    {
      num: 8,
      title: 'Data Retention',
      icon: Clock,
      gradient: 'from-violet-500 to-purple-650',
      color: '#8b5cf6',
      bg: '#faf5ff',
      border: '#e9d5ff',
      content: 'We retain your information only as long as necessary to provide our services, meet legal obligations, resolve disputes, or prevent fraud. Upon permanent account deletion, personal info is removed or anonymized except where retention is legally required.',
      bullets: []
    },
    {
      num: 9,
      title: 'Your Rights',
      icon: Fingerprint,
      gradient: 'from-teal-500 to-cyan-600',
      color: '#0d9488',
      bg: '#f0fdfa',
      border: '#ccfbf1',
      content: 'Depending on your jurisdiction and applicable laws, you may have legal rights to manage your personal information:',
      bullets: [
        'Access your personal profile information.',
        'Update or correct inaccurate profile details.',
        'Request account and profile deletion.',
        'Withdraw consent where applicable.',
        'Manage communication and marketing preferences.'
      ]
    },
    {
      num: 10,
      title: 'Children’s Privacy',
      icon: Ban,
      gradient: 'from-red-500 to-rose-700',
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fee2e2',
      content: 'MyDearPartner is intended only for individuals who have reached the legal marriageable age under applicable laws. We do not knowingly collect personal information from minors. If such information is discovered, it will be removed promptly.',
      bullets: []
    },
    {
      num: 11,
      title: 'Third-Party Links',
      icon: ExternalLink,
      gradient: 'from-blue-400 to-indigo-500',
      color: '#60a5fa',
      bg: '#f8fafc',
      border: '#f1f5f9',
      content: 'Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices, content, or policies of external websites. Users are encouraged to review the privacy policies of any third-party services they visit.',
      bullets: []
    },
    {
      num: 12,
      title: 'Changes to This Privacy Policy',
      icon: RefreshCw,
      gradient: 'from-teal-400 to-cyan-500',
      color: '#2dd4bf',
      bg: '#f0fdfa',
      border: '#ccfbf1',
      content: 'We may update this Privacy Policy periodically to reflect changes in our services, legal requirements, or operational practices. Any updates will be posted on this page along with the revised effective date. Continued use of MyDearPartner after such changes constitutes acceptance of the updated Privacy Policy.',
      bullets: []
    }
  ];

  // Intersection Observer to highlight sidebar as user scrolls
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const num = parseInt(entry.target.id.replace('section-', ''));
          if (!isNaN(num)) {
            setActiveSection(num);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (num: number) => {
    setActiveSection(num);
    setIsMobileMenuOpen(false);
    const element = document.getElementById(`section-${num}`);
    if (element) {
      const offset = 100; // Header spacing offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const filteredSections = sections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.bullets.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="min-h-screen pt-24 sm:pt-28 pb-16 bg-gradient-to-b from-[#fdfcfb] to-[#f4f1eb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#be123c]/10 text-[#be123c] mb-4 uppercase tracking-widest border border-[#be123c]/20">
            Privacy &amp; Data Security
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[var(--theme-primary-800)] font-display tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium">
            Effective Date: 18th July 2026
          </p>
        </div>

        {/* Search & Mobile Navigation Accordion Bar */}
        <div className="lg:hidden mb-6 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Privacy..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-700 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#be123c]/20 focus:border-[#be123c] text-sm"
            />
          </div>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold"
          >
            <span>Jump to Section: {sections.find(s => s.num === activeSection)?.title}</span>
            {isMobileMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isMobileMenuOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 max-h-60 overflow-y-auto">
              {sections.map((sect) => (
                <button
                  key={sect.num}
                  onClick={() => scrollToSection(sect.num)}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === sect.num ? 'bg-[#be123c] text-white' : 'bg-slate-50 text-slate-655 hover:bg-slate-100'}`}
                >
                  Section {sect.num}. {sect.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layout Grid */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* Left Column: Sticky Sidebar Index */}
          <aside className="hidden lg:block sticky top-28 bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm space-y-5 max-h-[calc(100vh-140px)] flex flex-col">
            <div>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Search Policy</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter sections..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 text-slate-700 pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#be123c]/20 focus:border-[#be123c] text-xs"
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">Table of Contents</h3>
              {filteredSections.map((sect) => {
                const IconComponent = sect.icon;
                const isActive = activeSection === sect.num;
                return (
                  <button
                    key={sect.num}
                    onClick={() => scrollToSection(sect.num)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isActive ? 'bg-[#be123c] text-white shadow-md shadow-[#be123c]/15' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-450'}`} />
                    <span className="text-xs font-bold leading-tight truncate">
                      {sect.num}. {sect.title}
                    </span>
                  </button>
                );
              })}
              {filteredSections.length === 0 && (
                <div className="text-slate-400 text-xs py-4 text-center">No matching sections.</div>
              )}
            </div>
          </aside>

          {/* Right Column: Scrollable Cards Stack */}
          <div className="space-y-6 sm:space-y-8">
            
            {/* Intro Card */}
            <div className="bg-white/80 border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-md">
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed text-justify mb-4">
                At <strong>MyDearPartner</strong>, your privacy is fundamental to the trust we strive to build. We understand that the information you share while searching for a life partner is personal and sensitive. This Privacy Policy explains how we collect, use, protect, and disclose your information when you use our website, mobile application, and related services.
              </p>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-bold">
                By using MyDearPartner, you agree to the practices described in this Privacy Policy.
              </p>
            </div>

            {/* Stack of Sections */}
            <div className="space-y-6">
              {filteredSections.map((sect) => {
                const IconComponent = sect.icon;
                const isActive = activeSection === sect.num;
                return (
                  <div 
                    key={sect.num} 
                    id={`section-${sect.num}`}
                    ref={(el) => { sectionRefs.current[sect.num] = el; }}
                    className={`bg-white border rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 relative overflow-hidden ${isActive ? 'border-[#be123c]/30 shadow-md' : 'border-slate-100'}`}
                  >
                    {/* Visual Accent Badge */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-bl-full -z-10" />

                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      {/* Icon Wrapper */}
                      <div 
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-md bg-gradient-to-br ${sect.gradient}`}
                      >
                        <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>

                      {/* Content Container */}
                      <div className="flex-grow w-full">
                        <div className="flex flex-wrap gap-2 items-center mb-3">
                          <span 
                            className="text-xs font-black uppercase px-2 py-0.5 rounded-full border"
                            style={{ backgroundColor: sect.bg, borderColor: sect.border, color: sect.color }}
                          >
                            Section {sect.num}
                          </span>
                          <h2 className="text-lg sm:text-xl font-extrabold text-[var(--theme-primary-800)] font-display">
                            {sect.title}
                          </h2>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-gray-700 text-sm sm:text-base leading-relaxed text-justify">
                            {sect.content}
                          </p>

                          {sect.bullets.length > 0 && (
                            <ul className="space-y-2 mt-3">
                              {sect.bullets.map((bullet, bIdx) => (
                                <li key={bIdx} className="flex gap-2.5 items-start text-gray-700 text-sm sm:text-base">
                                  <CheckCircle className="w-4 h-4 text-[#be123c] shrink-0 mt-1" />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredSections.length === 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                  No matching policy sections found for "{searchQuery}".
                </div>
              )}
            </div>

            {/* 13. Contact Us Section */}
            <div 
              id="section-13"
              className="bg-gradient-to-br from-[#be123c] to-[#9f1239] text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden"
            >
              {/* Subtle Ambient Radial */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-white/20 border border-white/10 text-amber-200">
                      Section 13
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold font-display">
                      Contact Us
                    </h2>
                  </div>
                  
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6">
                    If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please reach out to us.
                  </p>

                  <div className="grid gap-3.5 sm:grid-cols-2 text-sm">
                    <div className="flex items-center gap-2.5 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                      <Phone className="w-4 h-4 text-amber-300 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/60 font-black uppercase tracking-wider">Phone</div>
                        <a href="tel:+9118001234567" className="font-bold hover:underline">+91 1800-123-4567</a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                      <Mail className="w-4 h-4 text-amber-300 shrink-0" />
                      <div>
                        <div className="text-[10px] text-white/60 font-black uppercase tracking-wider">Email</div>
                        <a href="mailto:support@mydearpartner.com" className="font-bold hover:underline">support@mydearpartner.com</a>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-white/10 rounded-xl px-4 py-3 border border-white/10 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] text-white/60 font-black uppercase tracking-wider">Address</div>
                        <span className="font-semibold leading-relaxed">
                          Worexa Technologies, Banashankari 3rd Stage, Bengaluru, KA 560085
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
