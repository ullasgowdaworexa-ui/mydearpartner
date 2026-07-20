'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  Languages,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */

const STEP_NAMES = ['Identity', 'Life details', 'Secure account'];

type FormState = {
  firstName: string;
  lastName: string;
  profileFor: string;
  gender: string;
  birthDate: string;
  city: string;
  religion: string;
  language: string;
  education: string;
  email: string;
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  profileFor: '',
  gender: '',
  birthDate: '',
  city: '',
  religion: '',
  language: '',
  education: '',
  email: '',
  countryCode: '+91',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
};

const COUNTRIES: { code: string; label: string; dial: string }[] = [
  { code: 'IN', label: 'India', dial: '+91' },
  { code: 'US', label: 'United States', dial: '+1' },
  { code: 'GB', label: 'United Kingdom', dial: '+44' },
  { code: 'CA', label: 'Canada', dial: '+1' },
  { code: 'AU', label: 'Australia', dial: '+61' },
  { code: 'AE', label: 'UAE', dial: '+971' },
  { code: 'SG', label: 'Singapore', dial: '+65' },
  { code: 'LK', label: 'Sri Lanka', dial: '+94' },
];

const PROFILE_OPTIONS = [
  { value: 'Self', label: 'Myself', icon: UserRound },
  { value: 'Parent', label: 'Son / Daughter', icon: Users },
  { value: 'Sibling', label: 'Sibling', icon: Heart },
  { value: 'Relative', label: 'Relative', icon: ShieldCheck },
  { value: 'Friend', label: 'Friend', icon: Sparkles },
];

const GENDER_OPTIONS = [
  { value: 'Female', label: 'Woman', icon: UserRound },
  { value: 'Male', label: 'Man', icon: UserRound },
  { value: 'Other', label: 'Other', icon: Sparkles },
];

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];
const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Other'];
const EDUCATION = ['High School', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Other'];

const TESTIMONIALS = [
  {
    quote: 'We found each other through MyDearPartner. The privacy-first design made us feel completely secure.',
    name: 'Aditya & Ritu',
    story: 'Married in Dec 2025',
  },
  {
    quote: 'Creating a profile was effortless, and within weeks we connected over shared values and family traditions.',
    name: 'Sneha & Vivek',
    story: 'Engaged in Mar 2026',
  },
  {
    quote: 'Our families trusted the verification standard. It keeps out non-serious profiles entirely.',
    name: 'Karan & Meera',
    story: 'Matched in Feb 2026',
  },
];

const STATS = [
  { value: '2.4M+', label: 'Verified members' },
  { value: '98%', label: 'Success match rate' },
  { value: '190+', label: 'Cities covered' },
];

/* ------------------------------------------------------------------ */
/* Validation                                                         */
/* ------------------------------------------------------------------ */

const validateName = (name: string, fieldName: string) => {
  const trimmed = name.trim();
  if (!trimmed) return `${fieldName} is required.`;
  if (trimmed.length < 2) return `${fieldName} must contain at least 2 characters.`;
  if (trimmed.length > 50) return `${fieldName} must contain at most 50 characters.`;
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) return `${fieldName} contains invalid characters.`;
  return '';
};

const validateEmailFormat = (email: string) => {
  if (!email) return 'Email address is required.';
  if (/\s/.test(email)) return 'Email address cannot contain spaces.';
  if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email))
    return 'Enter a valid email address, for example name@example.com.';
  return '';
};

const validateMobileFormat = (mobile: string) => {
  if (!mobile) return 'Mobile number is required.';
  const normalized = mobile.replace(/[\s-]/g, '');
  if (/[a-zA-Z]/.test(normalized)) return 'Mobile number must contain digits only.';
  if (!/^\d+$/.test(normalized)) return 'Mobile number must contain digits only.';
  if (normalized.length < 6 || normalized.length > 14) return 'Enter a valid mobile number.';
  if (/^(\d)\1+$/.test(normalized)) return 'Enter a valid mobile number.';
  return '';
};

const validateDOB = (dobString: string) => {
  if (!dobString) return 'Date of birth is required.';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 'Enter a valid date of birth.';
  const today = new Date();
  if (dob > today) return 'Date of birth cannot be in the future.';
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  const isUnder18 = age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));
  if (isUnder18) return 'You must be at least 18 years old to register.';
  return '';
};

const checkPasswordRequirements = (password: string) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

/* ------------------------------------------------------------------ */
/* Shared UI primitives                                               */
/* ------------------------------------------------------------------ */

const FOCUS_RING = 'focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10';

function FloatingInput({
  id,
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required,
  autoComplete,
  inputMode,
  max,
  rightSlot,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text' | 'email' | 'tel';
  max?: string;
  rightSlot?: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="w-full">
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-soft-muted">
          <Icon size={18} />
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder=" "
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          max={max}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`peer w-full rounded-2xl border bg-cream-50/80 py-3.5 pl-11 pr-11 text-[15px] text-ink placeholder-transparent shadow-sm outline-none transition-all duration-200 ${FOCUS_RING} ${
            error ? 'border-error/70 ring-4 ring-error/10' : 'border-line'
          }`}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-11 top-3.5 z-10 origin-[0] -translate-y-1/2 transform bg-cream-50 px-1 text-[15px] text-soft-muted transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-[15px] peer-focus:top-0 peer-focus:text-xs peer-focus:text-rose-500"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        {rightSlot}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-1.5 flex items-center gap-1.5 px-1 text-[13px] font-medium text-error"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-error/10 text-[10px]">!</span>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectionCard({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      aria-pressed={active}
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 ${
        active
          ? 'border-rose-500 bg-rose-500/5 shadow-rose'
          : 'border-line bg-cream-50/70 hover:border-rose-400 hover:bg-cream-50'
      }`}
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-xl transition-colors duration-200 ${
          active ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-500'
        }`}
      >
        <Icon size={20} />
      </span>
      <span className={`text-[13px] font-bold ${active ? 'text-rose-600' : 'text-ink'}`}>{label}</span>
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"
          >
            <Check size={12} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-plum-700/80"
    >
      {children}
    </label>
  );
}

function PremiumSelect({
  id,
  label,
  icon: Icon,
  value,
  options,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  error?: string;
  placeholder: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="w-full">
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-soft-muted">
          <Icon size={18} />
        </span>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full appearance-none rounded-2xl border bg-cream-50/80 py-3.5 pl-11 pr-10 text-[15px] outline-none transition-all duration-200 ${FOCUS_RING} ${
            error ? 'border-error/70 ring-4 ring-error/10' : 'border-line'
          } ${value ? 'text-ink' : 'text-soft-muted'}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="text-ink">
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-soft-muted">
          <ChevronDown size={18} />
        </span>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 flex items-center gap-1.5 px-1 text-[13px] font-medium text-error"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-error/10 text-[10px]">!</span>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendErrors, setBackendErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [googleNotice, setGoogleNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [countryOpen, setCountryOpen] = useState(false);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const { registerMember } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const maxDateString = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => setTestimonialIndex((p) => (p + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  /* Auto-save draft (excludes password fields) */
  useEffect(() => {
    const { password, confirmPassword, ...safe } = form;
    try {
      localStorage.setItem('register_draft', JSON.stringify(safe));
    } catch {
      /* ignore */
    }
  }, [form]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('register_draft');
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormState>;
        setForm((f) => ({ ...f, ...saved }));
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (backendErrors[key as string]) {
      setBackendErrors((current) => {
        const copy = { ...current };
        delete copy[key as string];
        return copy;
      });
    }
  };

  const validateField = (key: keyof FormState, value: string | boolean): string => {
    const v = typeof value === 'boolean' ? '' : value;
    let msg = '';
    switch (key) {
      case 'firstName':
        msg = validateName(v, 'First name');
        break;
      case 'lastName':
        msg = validateName(v, 'Last name');
        break;
      case 'profileFor':
        if (!v) msg = 'Please select who this profile is for.';
        break;
      case 'gender':
        if (!v) msg = 'Please select your gender.';
        break;
      case 'birthDate':
        msg = validateDOB(v);
        break;
      case 'city':
        if (!v.trim()) msg = 'Current city is required.';
        break;
      case 'religion':
        if (!v.trim()) msg = 'Religion is required.';
        break;
      case 'language':
        if (!v.trim()) msg = 'Mother tongue is required.';
        break;
      case 'email':
        msg = validateEmailFormat(v);
        break;
      case 'phone':
        msg = validateMobileFormat(v);
        break;
      case 'password':
        if (!v) {
          msg = 'Password is required.';
        } else {
          const r = checkPasswordRequirements(v);
          if (!r.length) msg = 'Password must contain at least 8 characters.';
          else if (!r.upper) msg = 'Add at least one uppercase letter.';
          else if (!r.lower) msg = 'Add at least one lowercase letter.';
          else if (!r.number) msg = 'Add at least one number.';
          else if (!r.special) msg = 'Add at least one special character.';
          else if (form.email && v.includes(form.email)) msg = 'Password must not contain your email.';
          else if (form.phone && v.includes(form.phone)) msg = 'Password must not contain your mobile number.';
        }
        break;
      case 'confirmPassword':
        if (touched.confirmPassword || v) {
          if (!v) msg = 'Confirm your password.';
          else if (v !== form.password) msg = 'Passwords do not match.';
        }
        break;
      case 'acceptTerms':
        if (!value) msg = 'You must accept the Terms of Service and Privacy Policy to continue.';
        break;
      default:
        break;
    }
    setErrors((prev) => {
      const copy = { ...prev };
      if (msg) copy[key as string] = msg;
      else delete copy[key as string];
      return copy;
    });
    return msg;
  };

  const validateStep = (currentStep: number): boolean => {
    const stepErrors: Record<string, string> = {};
    if (currentStep === 0) {
      stepErrors.firstName = validateName(form.firstName, 'First name');
      stepErrors.lastName = validateName(form.lastName, 'Last name');
      if (!form.profileFor) stepErrors.profileFor = 'Please select who this profile is for.';
      if (!form.gender) stepErrors.gender = 'Please select your gender.';
      stepErrors.birthDate = validateDOB(form.birthDate);
    } else if (currentStep === 1) {
      if (!form.city.trim()) stepErrors.city = 'Current city is required.';
      if (!form.religion.trim()) stepErrors.religion = 'Religion is required.';
      if (!form.language.trim()) stepErrors.language = 'Mother tongue is required.';
    } else {
      stepErrors.email = validateEmailFormat(form.email);
      stepErrors.phone = validateMobileFormat(form.phone);
      const r = checkPasswordRequirements(form.password);
      if (!form.password) stepErrors.password = 'Password is required.';
      else if (!r.length) stepErrors.password = 'Password must contain at least 8 characters.';
      else if (!r.upper) stepErrors.password = 'Add at least one uppercase letter.';
      else if (!r.lower) stepErrors.password = 'Add at least one lowercase letter.';
      else if (!r.number) stepErrors.password = 'Add at least one number.';
      else if (!r.special) stepErrors.password = 'Add at least one special character.';
      else if (form.email && form.password.includes(form.email))
        stepErrors.password = 'Password must not contain your email.';
      else if (form.phone && form.password.includes(form.phone))
        stepErrors.password = 'Password must not contain your mobile number.';
      if (!form.confirmPassword) stepErrors.confirmPassword = 'Confirm your password.';
      else if (form.confirmPassword !== form.password) stepErrors.confirmPassword = 'Passwords do not match.';
      if (!form.acceptTerms) stepErrors.acceptTerms = 'You must accept the Terms of Service and Privacy Policy.';
    }

    const cleaned = Object.fromEntries(Object.entries(stepErrors).filter(([, m]) => m));
    setErrors((prev) => ({ ...prev, ...cleaned }));

    const keys = Object.keys(cleaned);
    if (keys.length > 0) {
      const el = document.getElementById(keys[0]);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement).focus?.();
      }
      return false;
    }
    return true;
  };

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 2));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validateStep(2)) return;
    setSubmitting(true);
    setBackendErrors({});
    try {
      await registerMember({
        email: form.email.trim(),
        mobile_number: `${form.countryCode}${form.phone.replace(/[\s-]/g, '')}`,
        password: form.password,
        confirm_password: form.confirmPassword,
        accept_terms: form.acceptTerms,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        profile_created_by: form.profileFor,
        gender: form.gender,
        date_of_birth: form.birthDate,
        work_location: form.city.trim(),
        religion: form.religion.trim(),
        mother_tongue: form.language.trim(),
        highest_education: form.education.trim(),
      });
      try {
        localStorage.removeItem('register_draft');
      } catch {
        /* ignore */
      }
      setSuccessMsg('Your account was created successfully.');
      setTimeout(() => navigate('/dashboard', { replace: true }), 3200);
    } catch (caught: unknown) {
      const err = caught as { errors?: Record<string, string | string[]> };
      if (err && err.errors) {
        const keyMap: Record<string, string> = {
          first_name: 'firstName',
          last_name: 'lastName',
          profile_created_by: 'profileFor',
          gender: 'gender',
          date_of_birth: 'birthDate',
          work_location: 'city',
          religion: 'religion',
          mother_tongue: 'language',
          highest_education: 'education',
          email: 'email',
          mobile_number: 'phone',
          password: 'password',
          confirm_password: 'confirmPassword',
          accept_terms: 'acceptTerms',
        };
        const mapped: Record<string, string[]> = {};
        Object.entries(err.errors).forEach(([field, msgs]) => {
          const k = keyMap[field] || field;
          mapped[k] = Array.isArray(msgs) ? msgs : [String(msgs)];
          if (k === 'phone') {
            // mobile_number errors should attach to the phone field
          }
        });
        setBackendErrors(mapped);
        const firstKey = Object.keys(mapped)[0];
        if (firstKey) {
          if (['firstName', 'lastName', 'profileFor', 'gender', 'birthDate'].includes(firstKey)) setStep(0);
          else if (['city', 'religion', 'language', 'education'].includes(firstKey)) setStep(1);
          else setStep(2);
          setTimeout(() => {
            const el = document.getElementById(firstKey);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              (el as HTMLElement).focus?.();
            }
          }, 120);
        }
      } else {
        setErrors({ general: caught instanceof Error ? caught.message : 'Registration failed. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pwdReqs = checkPasswordRequirements(form.password);
  const metCount = Object.values(pwdReqs).filter(Boolean).length;
  const strength = metCount === 5 ? 'Strong' : metCount >= 3 ? 'Medium' : metCount > 0 ? 'Weak' : '';
  const strengthColor =
    strength === 'Strong' ? 'bg-emerald-500' : strength === 'Medium' ? 'bg-gold-400' : 'bg-error';
  const strengthText =
    strength === 'Strong' ? 'text-emerald-600' : strength === 'Medium' ? 'text-gold-600' : 'text-error';

  const progressPct = (step / (STEP_NAMES.length - 1)) * 100;

  const fieldError = (k: string) => errors[k] || backendErrors[k]?.[0];

  /* Success state */
  if (successMsg) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-cream-100 px-4 py-10">
        <FloatingBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="relative z-10 w-full max-w-md rounded-[28px] border border-white/70 bg-white/70 p-10 text-center shadow-brand-lg backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-plum-800 text-white shadow-rose"
          >
            <Check size={40} strokeWidth={3} />
          </motion.div>
          <h2 className="mt-6 font-display text-2xl font-extrabold text-plum-800">{successMsg}</h2>
          <p className="mt-3 text-[15px] text-muted">
            Your member account is ready. We are taking you to your dashboard.
          </p>
          <div className="mt-7 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-rose-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-cream-100 lg:grid lg:grid-cols-[1.05fr_1fr]">
      <FloatingBackground />

      {/* ----------------------------- LEFT PANEL ----------------------------- */}
      <aside className="relative z-10 hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-plum-800 via-plum-700 to-rose-600 p-10 text-white xl:p-14 lg:flex">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-rose-400/25 blur-3xl" />

        {/* Brand */}
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Heart size={20} className="text-gold-300" fill="currentColor" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">MyDearPartner</span>
        </div>

        {/* Hero + illustration */}
        <div className="relative mt-8">
          <CoupleIllustration />
          <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.22em] text-gold-300">
            Begin your journey
          </p>
          <h1 className="mt-3 font-display text-[2.6rem] font-extrabold leading-[1.08]">
            Find someone who
            <span className="block bg-gradient-to-r from-gold-300 to-gold-100 bg-clip-text text-transparent">
              feels like home.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
            A calm, considered space for meaningful matrimony. Verified members, private by design, and
            introductions built around your values.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative mt-8 space-y-3">
          {[
            { icon: BadgeCheck, text: '100% verified profiles with document checks' },
            { icon: ShieldCheck, text: 'Private & secure — your data stays yours' },
            { icon: Lock, text: 'Encrypted credentials and controlled visibility' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 backdrop-blur-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-gold-300">
                <f.icon size={18} />
              </span>
              <span className="text-[14px] font-medium text-white/85">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="relative mt-8 grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm">
              <p className="font-display text-2xl font-extrabold text-white">{s.value}</p>
              <p className="mt-1 text-[11px] leading-tight text-white/60">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="relative mt-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[14px] italic leading-relaxed text-white/85">
                  &ldquo;{TESTIMONIALS[testimonialIndex].quote}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-rose-400 text-sm font-bold text-plum-800">
                    {TESTIMONIALS[testimonialIndex].name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-white">{TESTIMONIALS[testimonialIndex].name}</p>
                    <p className="text-[11px] text-gold-300">{TESTIMONIALS[testimonialIndex].story}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ----------------------------- RIGHT PANEL ----------------------------- */}
      <section className="relative z-10 flex items-center justify-center px-4 py-10 sm:px-8 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-xl"
        >
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500 text-white">
                <Heart size={18} fill="currentColor" />
              </span>
              <span className="font-display text-lg font-extrabold text-plum-800">MyDearPartner</span>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-3.5 py-1.5 text-[12px] font-bold text-plum-700 shadow-sm backdrop-blur">
              <Sparkles size={14} className="text-gold-600" /> Free registration
            </span>
          </div>

          {/* Glass card */}
          <div className="rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-brand-lg backdrop-blur-xl sm:p-9">
            {/* Heading */}
            <div className="mb-6">
              <h2 className="font-display text-[1.9rem] font-extrabold leading-tight text-plum-800">
                Create your profile
              </h2>
              <p className="mt-2 text-[14px] text-muted">
                A few thoughtful details help us make stronger, safer introductions.
              </p>
            </div>

            {/* Stepper */}
            <div className="mb-7">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-bold text-rose-600">
                  Step {step + 1} of {STEP_NAMES.length}
                </span>
                <span className="text-[13px] font-semibold text-muted">{STEP_NAMES[step]}</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-cream-200">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 to-plum-800"
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {STEP_NAMES.map((name, i) => (
                  <div
                    key={name}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors duration-300 ${
                      i === step
                        ? 'border-rose-500 bg-rose-500/5 text-rose-600'
                        : i < step
                          ? 'border-gold-400/40 bg-gold-100/50 text-gold-600'
                          : 'border-line bg-cream-50/60 text-soft-muted'
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                        i < step ? 'bg-gold-400 text-plum-800' : i === step ? 'bg-rose-500 text-white' : 'bg-cream-200 text-soft-muted'
                      }`}
                    >
                      {i < step ? <Check size={12} /> : i + 1}
                    </span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Google + divider */}
            <button
              type="button"
              onClick={() => setGoogleNotice(true)}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white py-3.5 text-[14px] font-bold text-ink shadow-sm transition-all duration-200 hover:border-rose-400 hover:bg-cream-50 active:scale-[0.98]"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <AnimatePresence>
              {googleNotice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-xl border border-gold-400/40 bg-gold-100/60 px-4 py-2.5 text-[13px] font-medium text-plum-800">
                    <Sparkles size={15} className="text-gold-600" />
                    Google sign-up is rolling out soon. Please continue with email for now.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="my-5 flex items-center gap-3 text-[12px] font-semibold text-soft-muted">
              <span className="h-px flex-1 bg-line" /> or use your email
              <span className="h-px flex-1 bg-line" />
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={step}
                onSubmit={step === 2 ? finish : next}
                noValidate
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-5"
              >
                {step === 0 && (
                  <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <FloatingInput
                        id="firstName"
                        label="First name"
                        icon={UserRound}
                        value={form.firstName}
                        onChange={(v) => {
                          update('firstName', v);
                          validateField('firstName', v);
                        }}
                        onBlur={() => {
                          setTouched((t) => ({ ...t, firstName: true }));
                          validateField('firstName', form.firstName);
                        }}
                        error={fieldError('firstName')}
                        required
                        autoComplete="given-name"
                      />
                      <FloatingInput
                        id="lastName"
                        label="Last name"
                        icon={UserRound}
                        value={form.lastName}
                        onChange={(v) => {
                          update('lastName', v);
                          validateField('lastName', v);
                        }}
                        onBlur={() => {
                          setTouched((t) => ({ ...t, lastName: true }));
                          validateField('lastName', form.lastName);
                        }}
                        error={fieldError('lastName')}
                        required
                        autoComplete="family-name"
                      />
                    </div>

                    <div>
                      <FieldLabel>Profile created for *</FieldLabel>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {PROFILE_OPTIONS.map((o) => (
                          <SelectionCard
                            key={o.value}
                            active={form.profileFor === o.value}
                            icon={o.icon}
                            label={o.label}
                            onClick={() => {
                              update('profileFor', o.value);
                              validateField('profileFor', o.value);
                            }}
                          />
                        ))}
                      </div>
                      {fieldError('profileFor') && (
                        <p role="alert" className="mt-2 px-1 text-[13px] font-medium text-error">
                          {fieldError('profileFor')}
                        </p>
                      )}
                    </div>

                    <div>
                      <FieldLabel>Gender *</FieldLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {GENDER_OPTIONS.map((o) => (
                          <SelectionCard
                            key={o.value}
                            active={form.gender === o.value}
                            icon={o.icon}
                            label={o.label}
                            onClick={() => {
                              update('gender', o.value);
                              validateField('gender', o.value);
                            }}
                          />
                        ))}
                      </div>
                      {fieldError('gender') && (
                        <p role="alert" className="mt-2 px-1 text-[13px] font-medium text-error">
                          {fieldError('gender')}
                        </p>
                      )}
                    </div>

                    <FloatingInput
                      id="birthDate"
                      label="Date of birth"
                      icon={Calendar}
                      type="date"
                      max={maxDateString}
                      value={form.birthDate}
                      onChange={(v) => {
                        update('birthDate', v);
                        validateField('birthDate', v);
                      }}
                      onBlur={() => {
                        setTouched((t) => ({ ...t, birthDate: true }));
                        validateField('birthDate', form.birthDate);
                      }}
                      error={fieldError('birthDate')}
                      required
                    />
                  </>
                )}

                {step === 1 && (
                  <>
                    <FloatingInput
                      id="city"
                      label="Current city"
                      icon={MapPin}
                      value={form.city}
                      onChange={(v) => {
                        update('city', v);
                        validateField('city', v);
                      }}
                      onBlur={() => {
                        setTouched((t) => ({ ...t, city: true }));
                        validateField('city', form.city);
                      }}
                      error={fieldError('city')}
                      required
                    />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <PremiumSelect
                        id="religion"
                        label="Religion"
                        icon={Sparkles}
                        value={form.religion}
                        options={RELIGIONS}
                        onChange={(v) => {
                          update('religion', v);
                          validateField('religion', v);
                        }}
                        error={fieldError('religion')}
                        placeholder="Select religion"
                      />
                      <PremiumSelect
                        id="language"
                        label="Mother tongue"
                        icon={Languages}
                        value={form.language}
                        options={LANGUAGES}
                        onChange={(v) => {
                          update('language', v);
                          validateField('language', v);
                        }}
                        error={fieldError('language')}
                        placeholder="Select language"
                      />
                    </div>
                    <PremiumSelect
                      id="education"
                      label="Highest education"
                      icon={GraduationCap}
                      value={form.education}
                      options={EDUCATION}
                      onChange={(v) => update('education', v)}
                      error={fieldError('education')}
                      placeholder="Select education (optional)"
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <FloatingInput
                      id="email"
                      label="Email address"
                      icon={Mail}
                      type="email"
                      value={form.email}
                      onChange={(v) => {
                        update('email', v);
                        validateField('email', v);
                        if (touched.confirmPassword) validateField('confirmPassword', form.confirmPassword);
                      }}
                      onBlur={() => {
                        setTouched((t) => ({ ...t, email: true }));
                        validateField('email', form.email);
                      }}
                      error={fieldError('email')}
                      required
                      autoComplete="email"
                    />

                    {/* Phone with country selector */}
                    <div className="w-full">
                      <FieldLabel htmlFor="phone">Mobile number *</FieldLabel>
                      <div className="relative flex">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setCountryOpen((o) => !o)}
                            aria-haspopup="listbox"
                            aria-expanded={countryOpen}
                            className="flex h-full items-center gap-1.5 rounded-l-2xl border border-r-0 border-line bg-cream-50/80 px-3.5 text-[15px] font-semibold text-ink outline-none transition-colors hover:border-rose-400"
                          >
                            {form.countryCode}
                            <ChevronDown size={15} className="text-soft-muted" />
                          </button>
                          <AnimatePresence>
                            {countryOpen && (
                              <>
                                <button
                                  type="button"
                                  className="fixed inset-0 z-20 cursor-default"
                                  aria-hidden="true"
                                  onClick={() => setCountryOpen(false)}
                                />
                                <motion.ul
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  transition={{ duration: 0.18 }}
                                  role="listbox"
                                  className="absolute left-0 top-full z-30 mt-1 max-h-60 w-56 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-brand-md"
                                >
                                  {COUNTRIES.map((c) => (
                                    <li key={c.code}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          update('countryCode', c.dial);
                                          setCountryOpen(false);
                                        }}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] transition-colors hover:bg-rose-500/5 ${
                                          form.countryCode === c.dial ? 'font-bold text-rose-600' : 'text-ink'
                                        }`}
                                      >
                                        <span>{c.label}</span>
                                        <span className="text-soft-muted">{c.dial}</span>
                                      </button>
                                    </li>
                                  ))}
                                </motion.ul>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-soft-muted">
                            <Phone size={18} />
                          </span>
                          <input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            value={form.phone}
                            placeholder="Mobile number"
                            onChange={(e) => {
                              update('phone', e.target.value);
                              validateField('phone', e.target.value);
                            }}
                            onBlur={() => {
                              setTouched((t) => ({ ...t, phone: true }));
                              validateField('phone', form.phone);
                            }}
                            aria-invalid={Boolean(fieldError('phone'))}
                            aria-describedby={fieldError('phone') ? 'phone-error' : undefined}
                            className={`w-full rounded-r-2xl border bg-cream-50/80 py-3.5 pl-11 pr-4 text-[15px] text-ink outline-none transition-all duration-200 ${FOCUS_RING} ${
                              fieldError('phone') ? 'border-error/70 ring-4 ring-error/10' : 'border-line'
                            }`}
                          />
                        </div>
                      </div>
                      {fieldError('phone') && (
                        <p id="phone-error" role="alert" className="mt-1.5 flex items-center gap-1.5 px-1 text-[13px] font-medium text-error">
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-error/10 text-[10px]">!</span>
                          {fieldError('phone')}
                        </p>
                      )}
                    </div>

                    <FloatingInput
                      id="password"
                      label="Password"
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(v) => {
                        update('password', v);
                        validateField('password', v);
                        if (touched.confirmPassword) validateField('confirmPassword', form.confirmPassword);
                      }}
                      onBlur={() => {
                        setTouched((t) => ({ ...t, password: true }));
                        validateField('password', form.password);
                      }}
                      error={fieldError('password')}
                      required
                      autoComplete="new-password"
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-soft-muted transition-colors hover:text-rose-500"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />

                    {/* Password strength */}
                    <AnimatePresence>
                      {form.password && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl border border-line bg-cream-50/60 p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[12px] font-bold text-plum-700">Password strength</span>
                              <span className={`text-[12px] font-extrabold ${strengthText}`}>{strength}</span>
                            </div>
                            <div className="flex gap-1.5">
                              {[0, 1, 2, 3, 4].map((i) => (
                                <span
                                  key={i}
                                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                    i < metCount ? strengthColor : 'bg-cream-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                              {[
                                { ok: pwdReqs.length, label: '8+ characters' },
                                { ok: pwdReqs.upper, label: 'Uppercase letter' },
                                { ok: pwdReqs.lower, label: 'Lowercase letter' },
                                { ok: pwdReqs.number, label: 'One number' },
                                { ok: pwdReqs.special, label: 'One special character' },
                              ].map((r) => (
                                <li
                                  key={r.label}
                                  className={`flex items-center gap-1.5 ${r.ok ? 'text-emerald-600' : 'text-soft-muted'}`}
                                >
                                  <span
                                    className={`grid h-4 w-4 place-items-center rounded-full ${
                                      r.ok ? 'bg-emerald-500 text-white' : 'bg-cream-200'
                                    }`}
                                  >
                                    {r.ok && <Check size={11} />}
                                  </span>
                                  {r.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <FloatingInput
                      id="confirmPassword"
                      label="Confirm password"
                      icon={Lock}
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(v) => {
                        update('confirmPassword', v);
                        validateField('confirmPassword', v);
                      }}
                      onBlur={() => {
                        setTouched((t) => ({ ...t, confirmPassword: true }));
                        validateField('confirmPassword', form.confirmPassword);
                      }}
                      error={fieldError('confirmPassword')}
                      required
                      autoComplete="new-password"
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowConfirm((s) => !s)}
                          aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-soft-muted transition-colors hover:text-rose-500"
                        >
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />

                    {/* Terms */}
                    <div>
                      <label
                        htmlFor="acceptTerms"
                        className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-muted"
                      >
                        <input
                          id="acceptTerms"
                          type="checkbox"
                          checked={form.acceptTerms}
                          onChange={(e) => {
                            update('acceptTerms', e.target.checked);
                            validateField('acceptTerms', e.target.checked);
                          }}
                          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-line text-rose-500 accent-rose-500"
                        />
                        <span>
                          I accept the{' '}
                          <Link to="/terms" className="font-bold text-rose-500 underline-offset-2 hover:underline">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" className="font-bold text-rose-500 underline-offset-2 hover:underline">
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>
                      {fieldError('acceptTerms') && (
                        <p role="alert" className="mt-1.5 px-1 text-[13px] font-medium text-error">
                          {fieldError('acceptTerms')}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* General + summary error */}
                {errors.general && (
                  <p role="alert" className="rounded-xl border border-error/30 bg-error/5 px-4 py-2.5 text-[13px] font-medium text-error">
                    {errors.general}
                  </p>
                )}
                {Object.keys(backendErrors).length > 1 && (
                  <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-error">
                    <p className="font-bold">Please correct the highlighted fields:</p>
                    <ul className="ml-4 mt-1 list-disc">
                      {Object.entries(backendErrors).map(([f, msgs]) => (
                        <li key={f}>{msgs[0]}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className={`flex gap-3 pt-1 ${step === 0 ? 'justify-end' : ''}`}>
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={back}
                      disabled={submitting}
                      className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-white px-6 text-[14px] font-bold text-plum-700 transition-all duration-200 hover:border-rose-400 hover:bg-cream-50 active:scale-[0.98] disabled:opacity-50"
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group relative inline-flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-rose-500 to-plum-800 px-8 text-[15px] font-bold text-white shadow-rose transition-all duration-200 hover:shadow-brand-lg active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating account...
                      </>
                    ) : step === 2 ? (
                      <>
                        Create profile
                        <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                    {!submitting && <Ripple />}
                  </button>
                </div>
              </motion.form>
            </AnimatePresence>

            {/* Already have account */}
            <p className="mt-6 text-center text-[14px] text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-rose-500 underline-offset-2 hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Trust strip */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-semibold text-soft-muted">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck size={15} className="text-emerald-500" /> 100% Verified Profiles
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-rose-500" /> Private &amp; Secure
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={15} className="text-gold-600" /> Encrypted
            </span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Decorative pieces                                                  */
/* ------------------------------------------------------------------ */

function FloatingBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl"
        animate={{ y: [0, 24, 0], x: [0, 12, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-gold-400/10 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, -16, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-plum-700/10 blur-3xl"
        animate={{ y: [0, 18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function CoupleIllustration() {
  return (
    <div className="relative mx-auto flex h-44 items-end justify-center">
      {/* gradient stage */}
      <div className="absolute inset-0 rounded-[36px] bg-gradient-to-tr from-rose-500/20 via-gold-300/10 to-white/0 blur-sm" />
      <motion.div
        className="absolute bottom-6 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-gradient-to-br from-gold-300 to-rose-400 opacity-30 blur-2xl"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* two figures */}
      <motion.div
        className="relative z-10 mr-2"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="86" height="120" viewBox="0 0 86 120" fill="none">
          <circle cx="43" cy="30" r="20" fill="#f3d9b8" />
          <path d="M23 50c0-12 9-20 20-20s20 8 20 20v40c0 6-4 10-10 10H33c-6 0-10-4-10-10V50z" fill="#8e3d58" />
          <path d="M23 60c6 8 14 12 20 12s14-4 20-12" stroke="#f8eed9" strokeWidth="3" fill="none" opacity="0.5" />
        </svg>
      </motion.div>
      <motion.div
        className="relative z-10 ml-2"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <svg width="86" height="120" viewBox="0 0 86 120" fill="none">
          <circle cx="43" cy="30" r="20" fill="#e9c9a6" />
          <path d="M23 50c0-12 9-20 20-20s20 8 20 20v40c0 6-4 10-10 10H33c-6 0-10-4-10-10V50z" fill="#c99b49" />
          <path d="M23 60c6 8 14 12 20 12s14-4 20-12" stroke="#fffdf9" strokeWidth="3" fill="none" opacity="0.5" />
        </svg>
      </motion.div>
      {/* connecting heart */}
      <motion.div
        className="absolute right-10 top-2 z-20 grid h-10 w-10 place-items-center rounded-full bg-white text-rose-500 shadow-gold"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Heart size={20} fill="currentColor" />
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function Ripple() {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <motion.span
        className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
        initial={{ opacity: 0 }}
        whileTap={{ opacity: [0.4, 0], scale: [0, 4] }}
        style={{ width: 200, height: 200 }}
      />
    </span>
  );
}
