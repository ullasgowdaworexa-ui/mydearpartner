'use client';

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  UserRound,
  Eye,
  EyeOff,
  AlertCircle,
  Users,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const stepNames = ['Identity', 'Life details', 'Secure account'];

const validateName = (name: string, fieldName: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  if (trimmed.length < 2) {
    return `${fieldName} must contain at least 2 characters.`;
  }
  if (trimmed.length > 50) {
    return `${fieldName} must contain at most 50 characters.`;
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return `${fieldName} contains invalid characters.`;
  }
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return `${fieldName} contains invalid characters.`;
  }
  return '';
};

const validateEmailFormat = (email: string) => {
  if (!email) {
    return 'Email address is required.';
  }
  if (/\s/.test(email)) {
    return 'Email address cannot contain spaces.';
  }
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (!emailRegex.test(email)) {
    return 'Enter a valid email address, for example name@gmail.com.';
  }
  return '';
};

const validateMobileFormat = (mobile: string) => {
  if (!mobile) {
    return 'Mobile number is required.';
  }
  let normalized = mobile.replace(/[\s-]/g, '');
  if (normalized.startsWith('+91')) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith('91') && normalized.length === 12) {
    normalized = normalized.slice(2);
  }
  if (!normalized) {
    return 'Mobile number is required.';
  }
  if (/[a-zA-Z]/.test(normalized)) {
    return 'Mobile number must contain digits only.';
  }
  if (!/^\d+$/.test(normalized)) {
    return 'Mobile number must contain digits only.';
  }
  if (normalized.length !== 10) {
    return 'Enter a valid 10-digit mobile number.';
  }
  if (/^(\d)\1{9}$/.test(normalized)) {
    return 'Enter a valid 10-digit mobile number.';
  }
  return '';
};

const validateDOB = (dobString: string) => {
  if (!dobString) {
    return 'Date of birth is required.';
  }
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return 'Enter a valid date of birth.';
  }
  const today = new Date();
  if (dob > today) {
    return 'Date of birth cannot be in the future.';
  }
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  const isUnder18 = age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));
  if (isUnder18) {
    return 'You must be at least 18 years old to register.';
  }
  return '';
};

const checkPasswordRequirements = (password: string) => {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
};

const testimonials = [
  {
    quote: "We found each other through MyDearPartner. The privacy features made us feel completely secure.",
    name: "Aditya & Ritu",
    story: "Married in Dec 2025",
    avatar: "/images/couple-sunset.jpg"
  },
  {
    quote: "Creating a profile here was so straightforward, and within weeks we connected on shared values.",
    name: "Sneha & Vivek",
    story: "Engaged in March 2026",
    avatar: "/images/wedding-rings.jpg"
  },
  {
    quote: "Our families were very happy with the verification standard. It really keeps out non-serious profiles.",
    name: "Karan & Meera",
    story: "Matched in Feb 2026",
    avatar: "/images/bride-portrait.jpg"
  }
];

const profileOptions = [
  { value: 'Self', label: 'Myself', icon: UserRound },
  { value: 'Parent', label: 'Son/Daughter', icon: Users },
  { value: 'Sibling', label: 'Sibling', icon: Heart },
  { value: 'Relative', label: 'Relative', icon: ShieldCheck },
  { value: 'Friend', label: 'Friend', icon: Sparkles },
];

const genderOptions = [
  { value: 'Female', label: 'Woman', icon: UserRound },
  { value: 'Male', label: 'Man', icon: UserRound },
  { value: 'Other', label: 'Other', icon: Sparkles },
];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendErrors, setBackendErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const [form, setForm] = useState({
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
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { registerMember } = useAuth();
  const navigate = useNavigate();

  // Maximum allowed date is today minus 18 years
  const today = new Date();
  const maxDateString = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  ).toISOString().split('T')[0];

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    // Clear relevant backend error if any
    if (backendErrors[key]) {
      setBackendErrors((current) => {
        const copy = { ...current };
        delete copy[key];
        return copy;
      });
    }
  };

  // Run validation on a specific field
  const validateField = (key: keyof typeof form, value: string | boolean) => {
    const valString = typeof value === 'boolean' ? '' : value;
    let errorMsg = '';

    switch (key) {
      case 'firstName':
        errorMsg = validateName(valString, 'First name');
        break;
      case 'lastName':
        errorMsg = validateName(valString, 'Last name');
        break;
      case 'profileFor':
        if (!valString) errorMsg = 'Please select who this profile is for.';
        break;
      case 'gender':
        if (!valString) errorMsg = 'Please select your gender.';
        break;
      case 'birthDate':
        errorMsg = validateDOB(valString);
        break;
      case 'city':
        if (!valString.trim()) errorMsg = 'Current city is required.';
        break;
      case 'religion':
        if (!valString.trim()) errorMsg = 'Religion is required.';
        break;
      case 'language':
        if (!valString.trim()) errorMsg = 'Mother tongue is required.';
        break;
      case 'email':
        errorMsg = validateEmailFormat(valString);
        break;
      case 'phone':
        errorMsg = validateMobileFormat(valString);
        break;
      case 'password':
        if (!valString) {
          errorMsg = 'Password is required.';
        } else {
          const reqs = checkPasswordRequirements(valString);
          if (!reqs.length) errorMsg = 'Password must contain at least 8 characters.';
          else if (!reqs.upper) errorMsg = 'Password must contain at least one uppercase letter.';
          else if (!reqs.lower) errorMsg = 'Password must contain at least one lowercase letter.';
          else if (!reqs.number) errorMsg = 'Password must contain at least one number.';
          else if (!reqs.special) errorMsg = 'Password must contain at least one special character.';
          else if (form.email && valString.includes(form.email)) {
            errorMsg = 'Password must not contain your email address or mobile number.';
          } else if (form.phone && valString.includes(form.phone)) {
            errorMsg = 'Password must not contain your email address or mobile number.';
          }
        }
        break;
      case 'confirmPassword':
        if (touched.confirmPassword || valString) {
          if (!valString) {
            errorMsg = 'Confirm your password.';
          } else if (valString !== form.password) {
            errorMsg = 'Passwords do not match.';
          }
        }
        break;
      case 'acceptTerms':
        if (!value) {
          errorMsg = 'You must accept the Terms of Service and Privacy Policy to continue.';
        }
        break;
      default:
        break;
    }

    setErrors((current) => {
      const copy = { ...current };
      if (errorMsg) {
        copy[key] = errorMsg;
      } else {
        delete copy[key];
      }
      return copy;
    });

    return errorMsg;
  };

  // Perform validation for the current active step fields
  const validateStep = (currentStep: number) => {
    const stepErrors: Record<string, string> = {};

    if (currentStep === 0) {
      const e1 = validateName(form.firstName, 'First name');
      const e2 = validateName(form.lastName, 'Last name');
      const e3 = form.profileFor ? '' : 'Please select who this profile is for.';
      const e4 = form.gender ? '' : 'Please select your gender.';
      const e5 = validateDOB(form.birthDate);

      if (e1) stepErrors.firstName = e1;
      if (e2) stepErrors.lastName = e2;
      if (e3) stepErrors.profileFor = e3;
      if (e4) stepErrors.gender = e4;
      if (e5) stepErrors.birthDate = e5;
    } else if (currentStep === 1) {
      if (!form.city.trim()) stepErrors.city = 'Current city is required.';
      if (!form.religion.trim()) stepErrors.religion = 'Religion is required.';
      if (!form.language.trim()) stepErrors.language = 'Mother tongue is required.';
    } else if (currentStep === 2) {
      const e1 = validateEmailFormat(form.email);
      const e2 = validateMobileFormat(form.phone);
      
      let e3 = '';
      if (!form.password) {
        e3 = 'Password is required.';
      } else {
        const reqs = checkPasswordRequirements(form.password);
        if (!reqs.length) e3 = 'Password must contain at least 8 characters.';
        else if (!reqs.upper) e3 = 'Password must contain at least one uppercase letter.';
        else if (!reqs.lower) e3 = 'Password must contain at least one lowercase letter.';
        else if (!reqs.number) e3 = 'Password must contain at least one number.';
        else if (!reqs.special) e3 = 'Password must contain at least one special character.';
        else if (form.email && form.password.includes(form.email)) {
          e3 = 'Password must not contain your email address or mobile number.';
        } else if (form.phone && form.password.includes(form.phone)) {
          e3 = 'Password must not contain your email address or mobile number.';
        }
      }

      let e4 = '';
      if (!form.confirmPassword) {
        e4 = 'Confirm your password.';
      } else if (form.confirmPassword !== form.password) {
        e4 = 'Passwords do not match.';
      }

      const e5 = form.acceptTerms ? '' : 'You must accept the Terms of Service and Privacy Policy to continue.';

      if (e1) stepErrors.email = e1;
      if (e2) stepErrors.phone = e2;
      if (e3) stepErrors.password = e3;
      if (e4) stepErrors.confirmPassword = e4;
      if (e5) stepErrors.acceptTerms = e5;
    }

    setErrors((current) => ({ ...current, ...stepErrors }));

    // Focus first invalid element in this step
    const keys = Object.keys(stepErrors);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const element = document.getElementById(firstKey);
      if (element) {
        if (typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        element.focus();
      }
      return false;
    }

    return true;
  };

  const next = (event: React.FormEvent) => {
    event.preventDefault();
    if (validateStep(step)) {
      setStep((current) => Math.min(current + 1, 2));
    }
  };

  const finish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!validateStep(2)) {
      return;
    }

    setSubmitting(true);
    setBackendErrors({});

    try {
      await registerMember({
        email: form.email.trim(),
        mobile_number: form.phone.replace(/[\s-]/g, ''),
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

      setSuccessMsg('Your account was created successfully.');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3500);
    } catch (caught: any) {
      // Map DRF structured validation errors to form fields
      if (caught && typeof caught === 'object' && caught.errors) {
        const fieldErrors: Record<string, string[]> = {};
        Object.entries(caught.errors).forEach(([field, msgs]) => {
          // Map backend field names to state values
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
          const mappedKey = keyMap[field] || field;
          fieldErrors[mappedKey] = Array.isArray(msgs) ? msgs : [String(msgs)];
        });
        setBackendErrors(fieldErrors);

        // Find the first step containing a backend validation error and switch to it
        const firstErrorKey = Object.keys(fieldErrors)[0];
        if (firstErrorKey) {
          const step0Keys = ['firstName', 'lastName', 'profileFor', 'gender', 'birthDate'];
          const step1Keys = ['city', 'religion', 'language', 'education'];
          if (step0Keys.includes(firstErrorKey)) {
            setStep(0);
          } else if (step1Keys.includes(firstErrorKey)) {
            setStep(1);
          } else {
            setStep(2);
          }
          // Delay to allow DOM updating then scroll to first invalid field
          setTimeout(() => {
            const el = document.getElementById(firstErrorKey);
            if (el) {
              if (typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              el.focus();
            }
          }, 100);
        }
      } else {
        setErrors({ general: caught instanceof Error ? caught.message : 'Registration failed. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pwdRequirements = checkPasswordRequirements(form.password);
  const requirementsMet = Object.values(pwdRequirements).filter(Boolean).length;
  const pwdStrength = requirementsMet === 5 ? 'Strong' : requirementsMet >= 3 ? 'Medium' : 'Weak';
  const strengthColorClass = pwdStrength === 'Strong' ? 'success' : pwdStrength === 'Medium' ? 'warning' : 'danger';

  // Handle successful registration view
  if (successMsg) {
    return (
      <main className="neo-auth neo-register">
        <div className="neo-auth-glow glow-one" /><div className="neo-auth-glow glow-two" />
        <section className="neo-register-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="neo-register-form-panel neo-success-card" style={{ maxWidth: '480px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)' }}>
            <div className="success-checkmark-glow">
              <Check size={36} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#2b101d' }}>{successMsg}</h2>
            <p className="neo-form-lead" style={{ marginTop: '14px', fontSize: '14px', color: '#7a6870' }}>
              Your member account is ready. You can complete your profile and start browsing matches now.
            </p>
            <div className="loader-dots" style={{ margin: '24px auto 0' }}>
              <span /><span /><span />
            </div>
            <p style={{ marginTop: '16px', color: '#a18e95', fontSize: '0.85rem', fontWeight: 600 }}>
              Redirecting to your dashboard...
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="neo-auth neo-register">
      <div className="neo-auth-glow glow-one" /><div className="neo-auth-glow glow-two" />
      <section className="neo-register-shell">
        <aside className="neo-register-aside">
          {/* Brand mark */}
          <div className="reg-aside-brand">
            <span className="reg-brand-icon"><Heart fill="currentColor" size={16} /></span>
            <b>My Dear Partner</b>
          </div>

          {/* Hero copy */}
          <div className="reg-aside-copy">
            <p className="reg-aside-eyebrow">Create your private profile</p>
            <h1 className="reg-aside-headline">
              Begin with<br />who you are.
              <br />
              <em className="reg-aside-italic">We'll help with<br />who you meet.</em>
            </h1>
            <p className="reg-aside-sub">
              A considered profile gives us the context to make fewer, stronger introductions.
            </p>
          </div>

          {/* Trust pills row */}
          <div className="reg-trust-pills">
            <div className="reg-trust-pill">
              <span className="reg-trust-icon reg-trust-icon--green"><ShieldCheck size={13} /></span>
              <div>
                <span className="reg-trust-label">Verified Profiles</span>
                <span className="reg-trust-sub">100% Secure</span>
              </div>
            </div>
            <div className="reg-trust-pill">
              <span className="reg-trust-icon reg-trust-icon--rose"><Heart fill="#f43f5e" size={11} /></span>
              <div>
                <span className="reg-trust-label">Curated Match</span>
                <span className="reg-trust-sub">Value-based</span>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="reg-testimonial-card">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                <p className="reg-testimonial-quote">
                  "{testimonials[testimonialIndex].quote}"
                </p>
                <div className="reg-testimonial-author">
                  <img
                    src={testimonials[testimonialIndex].avatar}
                    alt={testimonials[testimonialIndex].name}
                    className="reg-testimonial-avatar"
                  />
                  <div>
                    <span className="reg-testimonial-name">{testimonials[testimonialIndex].name}</span>
                    <span className="reg-testimonial-story">{testimonials[testimonialIndex].story}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom promises */}
          <div className="reg-promises">
            <span><ShieldCheck size={14} /> Reviewed profiles</span>
            <span><LockKeyhole size={14} /> Private credentials</span>
          </div>

          {/* Decorative orbit */}
          <div className="neo-aside-orbit" aria-hidden="true" style={{ zIndex: 1 }}><i /><i /></div>
        </aside>

        <div className="neo-register-form-panel">
          <div className="neo-form-top">
            <p>Free registration</p>
            <Link to="/login">Already a member? <strong>Login</strong></Link>
          </div>
          
          {/* Progress Indicator */}
          <div style={{ marginTop: '24px' }}>
            <div className="stepper-header-info">
              <span>Step {step + 1} of 3</span>
              <p>{stepNames[step]}</p>
            </div>
            <div className="neo-stepper" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3} style={{ marginTop: '8px' }}>
              <div className="neo-stepper-progress" style={{ width: `${step * 50}%` }} />
              {stepNames.map((name, index) => (
                <div key={name} className={`neo-stepper-item ${index === step ? 'active' : index < step ? 'done' : ''}`}>
                  <span className="neo-stepper-circle">{index < step ? <Check /> : index + 1}</span>
                  <small className="neo-stepper-label">{name}</small>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="neo-register-step"
              initial={{ opacity: 0, x: 15, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -15, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              
              {/* STEP 1: IDENTITY */}
              {step === 0 && (
                <form onSubmit={next} noValidate>
                  <span className="neo-icon-box"><UserRound /></span>
                  <p className="neo-eyebrow dark">Step one</p>
                  <h2>Tell us who this profile is for.</h2>
                  <p className="neo-form-lead">Enter basic details to define the profile identity.</p>

                  <div className="neo-field-grid two">
                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="firstName"
                          type="text"
                          placeholder=" "
                          value={form.firstName}
                          onChange={(e) => {
                            update('firstName', e.target.value);
                            validateField('firstName', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, firstName: true }));
                            validateField('firstName', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.firstName || backendErrors.firstName)}
                          aria-describedby={(errors.firstName || backendErrors.firstName) ? "firstName-error" : undefined}
                          className={(errors.firstName || backendErrors.firstName) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="firstName">First name *</label>
                        <UserRound className="field-icon" size={16} />
                      </div>
                      {(errors.firstName || backendErrors.firstName) && (
                        <p id="firstName-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.firstName || backendErrors.firstName?.[0]}
                        </p>
                      )}
                    </div>

                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="lastName"
                          type="text"
                          placeholder=" "
                          value={form.lastName}
                          onChange={(e) => {
                            update('lastName', e.target.value);
                            validateField('lastName', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, lastName: true }));
                            validateField('lastName', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.lastName || backendErrors.lastName)}
                          aria-describedby={(errors.lastName || backendErrors.lastName) ? "lastName-error" : undefined}
                          className={(errors.lastName || backendErrors.lastName) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="lastName">Last name *</label>
                        <UserRound className="field-icon" size={16} />
                      </div>
                      {(errors.lastName || backendErrors.lastName) && (
                        <p id="lastName-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.lastName || backendErrors.lastName?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="neo-field-grid">
                    <div className="form-field">
                      <label style={{ display: 'block', margin: '0 0 10px', color: '#5e4a52', fontSize: '9px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                        Profile created for *
                      </label>
                      <div className="selection-card-grid five-cols" id="profileFor">
                        {profileOptions.map((opt) => {
                          const Icon = opt.icon;
                          const isActive = form.profileFor === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`selection-card ${isActive ? 'active' : ''}`}
                              onClick={() => {
                                update('profileFor', opt.value);
                                validateField('profileFor', opt.value);
                              }}
                            >
                              <div className="card-icon-wrapper">
                                <Icon size={18} />
                              </div>
                              <span>{opt.label}</span>
                              {isActive && (
                                <span className="select-badge">
                                  <Check />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {(errors.profileFor || backendErrors.profileFor) && (
                        <p id="profileFor-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.profileFor || backendErrors.profileFor?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="neo-field-grid">
                    <div className="form-field">
                      <label style={{ display: 'block', margin: '0 0 10px', color: '#5e4a52', fontSize: '9px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                        Gender *
                      </label>
                      <div className="selection-card-grid three-cols" id="gender">
                        {genderOptions.map((opt) => {
                          const Icon = opt.icon;
                          const isActive = form.gender === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`selection-card ${isActive ? 'active' : ''}`}
                              onClick={() => {
                                update('gender', opt.value);
                                validateField('gender', opt.value);
                              }}
                            >
                              <div className="card-icon-wrapper">
                                <Icon size={18} />
                              </div>
                              <span>{opt.label}</span>
                              {isActive && (
                                <span className="select-badge">
                                  <Check />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {(errors.gender || backendErrors.gender) && (
                        <p id="gender-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.gender || backendErrors.gender?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="neo-field-grid">
                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="birthDate"
                          type="date"
                          max={maxDateString}
                          placeholder=" "
                          value={form.birthDate}
                          onChange={(e) => {
                            update('birthDate', e.target.value);
                            validateField('birthDate', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, birthDate: true }));
                            validateField('birthDate', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.birthDate || backendErrors.birthDate)}
                          aria-describedby={(errors.birthDate || backendErrors.birthDate) ? "birthDate-error" : undefined}
                          className={(errors.birthDate || backendErrors.birthDate) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="birthDate">Date of birth *</label>
                        <Calendar className="field-icon" size={16} />
                      </div>
                      {(errors.birthDate || backendErrors.birthDate) && (
                        <p id="birthDate-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.birthDate || backendErrors.birthDate?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <button className="neo-primary-button" type="submit">Continue <ArrowRight /></button>
                </form>
              )}

              {/* STEP 2: LIFE DETAILS */}
              {step === 1 && (
                <form onSubmit={next} noValidate>
                  <span className="neo-icon-box"><MapPin /></span>
                  <p className="neo-eyebrow dark">Step two</p>
                  <h2>Add some life context.</h2>
                  <p className="neo-form-lead">This context helps members learn more about your background.</p>

                  <div className="neo-field-grid two">
                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="city"
                          type="text"
                          placeholder=" "
                          value={form.city}
                          onChange={(e) => {
                            update('city', e.target.value);
                            validateField('city', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, city: true }));
                            validateField('city', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.city || backendErrors.city)}
                          aria-describedby={(errors.city || backendErrors.city) ? "city-error" : undefined}
                          className={(errors.city || backendErrors.city) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="city">Current city *</label>
                        <MapPin className="field-icon" size={16} />
                      </div>
                      {(errors.city || backendErrors.city) && (
                        <p id="city-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.city || backendErrors.city?.[0]}
                        </p>
                      )}
                    </div>

                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="religion"
                          type="text"
                          placeholder=" "
                          value={form.religion}
                          onChange={(e) => {
                            update('religion', e.target.value);
                            validateField('religion', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, religion: true }));
                            validateField('religion', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.religion || backendErrors.religion)}
                          aria-describedby={(errors.religion || backendErrors.religion) ? "religion-error" : undefined}
                          className={(errors.religion || backendErrors.religion) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="religion">Religion *</label>
                        <Sparkles className="field-icon" size={16} />
                      </div>
                      {(errors.religion || backendErrors.religion) && (
                        <p id="religion-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.religion || backendErrors.religion?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="neo-field-grid two">
                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="language"
                          type="text"
                          placeholder=" "
                          value={form.language}
                          onChange={(e) => {
                            update('language', e.target.value);
                            validateField('language', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, language: true }));
                            validateField('language', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.language || backendErrors.language)}
                          aria-describedby={(errors.language || backendErrors.language) ? "language-error" : undefined}
                          className={(errors.language || backendErrors.language) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="language">Mother tongue *</label>
                        <MessageCircle className="field-icon" size={16} />
                      </div>
                      {(errors.language || backendErrors.language) && (
                        <p id="language-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.language || backendErrors.language?.[0]}
                        </p>
                      )}
                    </div>

                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="education"
                          type="text"
                          placeholder=" "
                          value={form.education}
                          onChange={(e) => update('education', e.target.value)}
                          aria-invalid={Boolean(errors.education || backendErrors.education)}
                          aria-describedby={(errors.education || backendErrors.education) ? "education-error" : undefined}
                          className={(errors.education || backendErrors.education) ? 'invalid' : ''}
                        />
                        <label htmlFor="education">Highest education</label>
                        <GraduationCap className="field-icon" size={16} />
                      </div>
                      {(errors.education || backendErrors.education) && (
                        <p id="education-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.education || backendErrors.education?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="neo-form-actions">
                    <button type="button" className="neo-secondary-button" onClick={() => setStep(0)}>
                      <ArrowLeft /> Back
                    </button>
                    <button className="neo-primary-button" type="submit">
                      Continue <ArrowRight />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: SECURE ACCOUNT */}
              {step === 2 && (
                <form onSubmit={finish} noValidate>
                  <span className="neo-icon-box"><LockKeyhole /></span>
                  <p className="neo-eyebrow dark">Final step</p>
                  <h2>Secure your member account.</h2>
                  <p className="neo-form-lead">These credentials protect your profile. They cannot access administrative portals.</p>

                  <div className="neo-field-grid">
                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder=" "
                          value={form.email}
                          onChange={(e) => {
                            update('email', e.target.value);
                            validateField('email', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, email: true }));
                            validateField('email', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.email || backendErrors.email)}
                          aria-describedby={(errors.email || backendErrors.email) ? "email-error" : undefined}
                          className={(errors.email || backendErrors.email) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="email">Email address *</label>
                        <Mail className="field-icon" size={16} />
                      </div>
                      {(errors.email || backendErrors.email) && (
                        <p id="email-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.email || backendErrors.email?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="neo-field-grid">
                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          placeholder=" "
                          value={form.phone}
                          onChange={(e) => {
                            update('phone', e.target.value);
                            validateField('phone', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, phone: true }));
                            validateField('phone', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.phone || backendErrors.phone)}
                          aria-describedby={(errors.phone || backendErrors.phone) ? "phone-error" : undefined}
                          className={(errors.phone || backendErrors.phone) ? 'invalid' : ''}
                          required
                        />
                        <label htmlFor="phone">Mobile number *</label>
                        <Phone className="field-icon" size={16} />
                      </div>
                      {(errors.phone || backendErrors.phone) && (
                        <p id="phone-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.phone || backendErrors.phone?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="neo-field-grid two">
                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder=" "
                          value={form.password}
                          onChange={(e) => {
                            update('password', e.target.value);
                            validateField('password', e.target.value);
                            if (touched.confirmPassword) {
                              validateField('confirmPassword', form.confirmPassword);
                            }
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, password: true }));
                            validateField('password', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.password || backendErrors.password)}
                          aria-describedby={(errors.password || backendErrors.password) ? "password-error" : undefined}
                          className={(errors.password || backendErrors.password) ? 'invalid' : ''}
                          style={{ paddingRight: '44px' }}
                          required
                        />
                        <label htmlFor="password">Password *</label>
                        <LockKeyhole className="field-icon" size={16} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a18e95' }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {(errors.password || backendErrors.password) && (
                        <p id="password-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.password || backendErrors.password?.[0]}
                        </p>
                      )}
                    </div>

                    <div className="form-field">
                      <div className="floating-label-group">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder=" "
                          value={form.confirmPassword}
                          onChange={(e) => {
                            update('confirmPassword', e.target.value);
                            validateField('confirmPassword', e.target.value);
                          }}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, confirmPassword: true }));
                            validateField('confirmPassword', e.target.value);
                          }}
                          aria-invalid={Boolean(errors.confirmPassword || backendErrors.confirmPassword)}
                          aria-describedby={(errors.confirmPassword || backendErrors.confirmPassword) ? "confirmPassword-error" : undefined}
                          className={(errors.confirmPassword || backendErrors.confirmPassword) ? 'invalid' : ''}
                          style={{ paddingRight: '44px' }}
                          required
                        />
                        <label htmlFor="confirmPassword">Confirm password *</label>
                        <LockKeyhole className="field-icon" size={16} />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a18e95' }}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {(errors.confirmPassword || backendErrors.confirmPassword) && (
                        <p id="confirmPassword-error" className="field-error" role="alert">
                          <AlertCircle size={14} className="inline-icon" /> {errors.confirmPassword || backendErrors.confirmPassword?.[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Live Password Checklist Redesign */}
                  {form.password && (
                    <div className="strength-meter-container">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4b3d43' }}>Password Security</span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: pwdStrength === 'Strong' ? '#10b981' : pwdStrength === 'Medium' ? '#fbbf24' : '#f43f5e'
                        }}>
                          {pwdStrength}
                        </span>
                      </div>
                      
                      <div className="strength-progress-row">
                        <div className={`strength-segment ${requirementsMet >= 1 ? (pwdStrength === 'Strong' ? 'active-strong' : pwdStrength === 'Medium' ? 'active-medium' : 'active-weak') : ''}`} />
                        <div className={`strength-segment ${requirementsMet >= 3 ? (pwdStrength === 'Strong' ? 'active-strong' : pwdStrength === 'Medium' ? 'active-medium' : '') : ''}`} />
                        <div className={`strength-segment ${requirementsMet === 5 ? 'active-strong' : ''}`} />
                      </div>
                      
                      <ul className="checklist-list" style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem', color: '#7a6870' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdRequirements.length ? '#10b981' : '#a18e95' }}>
                          <Check size={12} /> 8+ Characters
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdRequirements.upper ? '#10b981' : '#a18e95' }}>
                          <Check size={12} /> Uppercase letter
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdRequirements.lower ? '#10b981' : '#a18e95' }}>
                          <Check size={12} /> Lowercase letter
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdRequirements.number ? '#10b981' : '#a18e95' }}>
                          <Check size={12} /> One number
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdRequirements.special ? '#10b981' : '#a18e95' }}>
                          <Check size={12} /> Special char
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="neo-field-grid" style={{ marginTop: '20px' }}>
                    <div className="form-field checkbox-field" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="acceptTerms"
                        type="checkbox"
                        checked={form.acceptTerms}
                        onChange={(e) => {
                          update('acceptTerms', e.target.checked);
                          validateField('acceptTerms', e.target.checked);
                        }}
                        aria-invalid={Boolean(errors.acceptTerms || backendErrors.acceptTerms)}
                        aria-describedby={(errors.acceptTerms || backendErrors.acceptTerms) ? "acceptTerms-error" : undefined}
                        required
                      />
                      <label htmlFor="acceptTerms" style={{ fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                        I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: '#2563eb' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: '#2563eb' }}>Privacy Policy</a> *
                      </label>
                    </div>
                    {(errors.acceptTerms || backendErrors.acceptTerms) && (
                      <p id="acceptTerms-error" className="field-error" role="alert" style={{ marginTop: '4px' }}>
                        <AlertCircle size={14} className="inline-icon" /> {errors.acceptTerms || backendErrors.acceptTerms?.[0]}
                      </p>
                    )}
                  </div>

                  {errors.general && (
                    <p className="neo-error" role="alert" style={{ marginTop: '15px' }}>
                      <AlertCircle size={16} className="inline-icon" /> {errors.general}
                    </p>
                  )}

                  {/* Summary of backend errors if multiple exist */}
                  {Object.keys(backendErrors).length > 1 && (
                    <div className="error-summary-box" style={{ marginTop: '15px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#991b1b', fontSize: '0.875rem' }}>
                      <strong>Please correct the highlighted fields:</strong>
                      <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                        {Object.entries(backendErrors).map(([field, msgs]) => (
                          <li key={field}>{msgs[0]}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="neo-form-actions">
                    <button type="button" className="neo-secondary-button" onClick={() => setStep(1)} disabled={submitting}>
                      <ArrowLeft /> Back
                    </button>
                    <button className="neo-primary-button" type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner-loader inline" /> Creating account...
                        </>
                      ) : (
                        <>
                          Create profile <ArrowRight />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
