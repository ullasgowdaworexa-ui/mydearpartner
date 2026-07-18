'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, UserCheck, Key, FileText, AlertOctagon, Lock, 
  ShieldCheck, MessageSquare, Crown, CreditCard, ShieldAlert, Award, 
  Ban, Scale, ExternalLink, RefreshCw, Gavel, Mail, MapPin, Phone, Search, ChevronDown, ChevronUp
} from 'lucide-react';

export default function TermsClient() {
  const [activeSection, setActiveSection] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const sections = [
    {
      num: 1,
      title: 'Acceptance of Terms',
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-teal-600',
      color: '#10b981',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      content: 'By registering or accessing MyDearPartner, you confirm that you have read, understood, and agreed to these Terms & Conditions, our Privacy Policy, and any additional guidelines published on the platform.',
      bullets: []
    },
    {
      num: 2,
      title: 'Eligibility',
      icon: UserCheck,
      gradient: 'from-rose-500 to-red-600',
      color: '#f43f5e',
      bg: '#fff1f2',
      border: '#fecdd3',
      content: 'To use MyDearPartner, you must meet the following eligibility requirements. MyDearPartner reserves the right to suspend or terminate accounts that do not meet these requirements.',
      bullets: [
        'Be at least 18 years of age or the legal marriageable age applicable in your jurisdiction.',
        'Be legally competent to enter into a binding agreement.',
        'Register only for the genuine purpose of seeking a life partner.',
        'Provide accurate, current, and complete information during registration.'
      ]
    },
    {
      num: 3,
      title: 'Account Registration',
      icon: Key,
      gradient: 'from-blue-500 to-indigo-600',
      color: '#3b82f6',
      bg: '#eff6ff',
      border: '#bfdbfe',
      content: 'You are responsible for maintaining the confidentiality of your account credentials. Each individual may maintain only one active account unless otherwise approved.',
      bullets: [
        'Provide truthful and accurate information.',
        'Update your profile whenever necessary.',
        'Keep your login credentials secure.',
        'Notify us immediately of any unauthorized use of your account.'
      ]
    },
    {
      num: 4,
      title: 'Profile Information',
      icon: FileText,
      gradient: 'from-amber-500 to-orange-600',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fef3c7',
      content: 'Users are solely responsible for the accuracy and authenticity of the information they publish. MyDearPartner may verify profiles but does not guarantee complete accuracy.',
      bullets: [
        'Do not provide false or misleading information.',
        'Do not impersonate another individual.',
        'Do not upload fake photographs or documents.',
        'Do not misrepresent your marital status, age, education, profession, religion, income, or personal details.'
      ]
    },
    {
      num: 5,
      title: 'Acceptable Use',
      icon: AlertOctagon,
      gradient: 'from-red-500 to-rose-700',
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fee2e2',
      content: 'You agree to use MyDearPartner respectfully and lawfully. Violations may result in immediate profile suspension or permanent ban.',
      bullets: [
        'Do not harass, threaten, or abuse other users.',
        'Do not post offensive, defamatory, or unlawful content.',
        'Do not share obscene or inappropriate material.',
        'Do not promote businesses, products, or services without authorization.',
        'Do not collect personal information from other users without consent.',
        'Do not use automated tools, bots, or scripts to access the platform.'
      ]
    },
    {
      num: 6,
      title: 'Privacy',
      icon: Lock,
      gradient: 'from-violet-500 to-purple-600',
      color: '#8b5cf6',
      bg: '#faf5ff',
      border: '#e9d5ff',
      content: 'Your privacy is important to us. Personal information is collected, stored, and processed according to our Privacy Policy. Users are encouraged to exercise caution when sharing personal information with other members.',
      bullets: []
    },
    {
      num: 7,
      title: 'Verification',
      icon: ShieldCheck,
      gradient: 'from-teal-500 to-emerald-600',
      color: '#14b8a6',
      bg: '#f0fdfa',
      border: '#ccfbf1',
      content: 'MyDearPartner may offer profile verification services to build credibility. Verification improves trust but does not guarantee or warrant:',
      bullets: [
        'Personal compatibility.',
        'Good character or background check.',
        'Successful marriage outcomes.',
        'Personal conduct of any member.'
      ]
    },
    {
      num: 8,
      title: 'Communication',
      icon: MessageSquare,
      gradient: 'from-cyan-500 to-blue-600',
      color: '#06b6d4',
      bg: '#ecfeff',
      border: '#cffafe',
      content: 'Our platform provides communication features to help members connect. Users are expected to communicate respectfully. Harassment, spam, abusive language, or inappropriate behaviour will lead to account suspension.',
      bullets: []
    },
    {
      num: 9,
      title: 'Premium Membership',
      icon: Crown,
      gradient: 'from-amber-400 to-yellow-550',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fef3c7',
      content: 'Certain services are available through paid membership plans. Premium benefits are subject to change and include:',
      bullets: [
        'Enhanced profile visibility in search results.',
        'Unlimited interests and direct connects.',
        'Access to verified contact information.',
        'Advanced smart compatibility search filters.',
        'Dedicated concierge assistant support.'
      ]
    },
    {
      num: 10,
      title: 'Payments',
      icon: CreditCard,
      gradient: 'from-blue-600 to-indigo-700',
      color: '#2563eb',
      bg: '#f8fafc',
      border: '#e2e8f0',
      content: 'Payments made through MyDearPartner are processed through secure payment gateways. Unless otherwise stated: membership fees are non-refundable, promotional offers cannot be exchanged for cash, and any refunds are processed manually.',
      bullets: []
    },
    {
      num: 11,
      title: 'User Safety',
      icon: ShieldAlert,
      gradient: 'from-orange-500 to-red-600',
      color: '#f97316',
      bg: '#fff7ed',
      border: '#ffedd5',
      content: 'While MyDearPartner strives to maintain a safe platform, users are solely responsible for exercising reasonable judgment before:',
      bullets: [
        'Sharing personal address or details.',
        'Sending money or buying gifts.',
        'Meeting someone in person.',
        'Entering into binding commitments or marriage.'
      ]
    },
    {
      num: 12,
      title: 'Intellectual Property',
      icon: Award,
      gradient: 'from-amber-600 to-rose-700',
      color: '#d97706',
      bg: '#fafaf9',
      border: '#f5f5f4',
      content: 'All content available on MyDearPartner, including text, graphics, logos, icons, software, designs, trademarks, and branding, is the exclusive property of MyDearPartner unless otherwise stated. No content may be copied, reproduced, or distributed without prior written permission.',
      bullets: []
    },
    {
      num: 13,
      title: 'Suspension & Termination',
      icon: Ban,
      gradient: 'from-red-600 to-rose-800',
      color: '#dc2626',
      bg: '#fff5f5',
      border: '#fed7d7',
      content: 'We reserve the right to suspend or permanently terminate accounts that violate these terms, provide false profile details, engage in fraud or abuse, or harm the reputation of the platform.',
      bullets: []
    },
    {
      num: 14,
      title: 'Limitation of Liability',
      icon: Scale,
      gradient: 'from-slate-600 to-slate-800',
      color: '#475569',
      bg: '#f8fafc',
      border: '#f1f5f9',
      content: 'MyDearPartner serves as an online matrimonial platform that facilitates introductions between users. We do not guarantee successful matches, compatibility, accuracy of profiles, or the intentions of members. Users interact with others at their own risk.',
      bullets: []
    },
    {
      num: 15,
      title: 'Third-Party Services',
      icon: ExternalLink,
      gradient: 'from-blue-400 to-indigo-500',
      color: '#60a5fa',
      bg: '#f8fafc',
      border: '#f1f5f9',
      content: 'Our platform may include links to third-party websites or services. MyDearPartner is not responsible for the content, privacy practices, or services provided by external websites.',
      bullets: []
    },
    {
      num: 16,
      title: 'Changes to Terms',
      icon: RefreshCw,
      gradient: 'from-teal-400 to-cyan-500',
      color: '#2dd4bf',
      bg: '#f0fdfa',
      border: '#ccfbf1',
      content: 'We may update these Terms & Conditions from time to time. Revised terms become effective immediately upon publication. Continued use of the platform constitutes acceptance of the updated Terms.',
      bullets: []
    },
    {
      num: 17,
      title: 'Governing Law',
      icon: Gavel,
      gradient: 'from-slate-700 to-slate-900',
      color: '#1e293b',
      bg: '#f8fafc',
      border: '#e2e8f0',
      content: 'These Terms & Conditions shall be governed by and interpreted in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts located in Bengaluru, Karnataka, unless otherwise required by applicable law.',
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
            Legal Agreement
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[var(--theme-primary-800)] font-display tracking-tight mb-4">
            Terms &amp; Conditions
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
              placeholder="Search Terms..." 
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
                  className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === sect.num ? 'bg-[#be123c] text-white' : 'bg-slate-50 text-slate-650 hover:bg-slate-100'}`}
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
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed text-justify">
                Welcome to <strong>MyDearPartner</strong>. These Terms &amp; Conditions govern your access to and use of our website, mobile application, and related services. By creating an account or using our platform, you agree to comply with these Terms. If you do not agree, please refrain from using our services.
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

            {/* 18. Contact Us Section */}
            <div 
              id="section-18"
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
                      Section 18
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold font-display">
                      Contact Us
                    </h2>
                  </div>
                  
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6">
                    If you have any questions regarding these Terms &amp; Conditions, please feel free to reach out to us.
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
