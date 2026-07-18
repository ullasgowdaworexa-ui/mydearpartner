'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/legacy/contexts/AuthContext';
import { fetchApi } from '@/legacy/services/apiClient';

const identifierSchema = z.string().trim().min(3, 'Enter your registered email address or mobile number.');
type IdentifierForm = { identifier: string };

export function ForgotPasswordForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<IdentifierForm>();
  const [message, setMessage] = useState('');
  const [developerOtp, setDeveloperOtp] = useState('');

  const submit = handleSubmit(async ({ identifier }) => {
    setMessage('');
    const parsed = identifierSchema.safeParse(identifier);
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
    try {
      const result = await fetchApi<{ expires_in: number; developer_otp?: string }>('/member-auth/forgot-password/', {
        method: 'POST', body: JSON.stringify({ identifier: parsed.data }), skipAuthRefresh: true,
      });
      setDeveloperOtp(result.developer_otp ?? '');
      setMessage('If this member exists, a reset code has been sent. It expires in 10 minutes.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The reset request could not be submitted.'); }
  });

  return <AuthCard title="Reset your password" copy="We will send a one-time reset code to your verified contact.">
    <form onSubmit={submit} noValidate><label>Email or mobile<input autoComplete="username" {...register('identifier', { required: true })} aria-invalid={Boolean(errors.identifier)} /></label>
      <button disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send reset code'}</button></form>
    {message && <p className="form-message" role="status">{message}</p>}
    {developerOtp && <p className="form-message">Development code: <strong>{developerOtp}</strong></p>}
    <p><Link href="/reset-password">Already have a code?</Link> · <Link href="/login">Return to login</Link></p>
  </AuthCard>;
}

type ResetForm = { identifier: string; code: string; password: string; confirm: string };
const resetSchema = z.object({
  identifier: identifierSchema,
  code: z.string().trim().min(4, 'Enter the reset code.'),
  password: z.string().min(8, 'Use at least 8 characters.').regex(/[A-Z]/, 'Add an uppercase letter.').regex(/[a-z]/, 'Add a lowercase letter.').regex(/\d/, 'Add a number.'),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, { path: ['confirm'], message: 'Passwords do not match.' });

export function ResetPasswordForm() {
  const query = useSearchParams();
  const router = useRouter();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ResetForm>({ defaultValues: { identifier: query.get('identifier') ?? '' } });
  const [message, setMessage] = useState('');

  const submit = handleSubmit(async (values) => {
    setMessage('');
    const parsed = resetSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => setError(issue.path[0] as keyof ResetForm, { message: issue.message }));
      return;
    }
    try {
      await fetchApi('/member-auth/reset-password/', { method: 'POST', body: JSON.stringify({ identifier: parsed.data.identifier, code: parsed.data.code, new_password: parsed.data.password }), skipAuthRefresh: true });
      setMessage('Password changed successfully. Redirecting to login…');
      window.setTimeout(() => router.replace('/login'), 900);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The password could not be reset.'); }
  });

  return <AuthCard title="Choose a new password" copy="Enter the code you received and a strong new password."><form onSubmit={submit} noValidate>
    <label>Email or mobile<input autoComplete="username" {...register('identifier')} />{errors.identifier && <span role="alert">{errors.identifier.message}</span>}</label>
    <label>Reset code<input inputMode="numeric" autoComplete="one-time-code" {...register('code')} />{errors.code && <span role="alert">{errors.code.message}</span>}</label>
    <label>New password<input type="password" autoComplete="new-password" {...register('password')} />{errors.password && <span role="alert">{errors.password.message}</span>}</label>
    <label>Confirm password<input type="password" autoComplete="new-password" {...register('confirm')} />{errors.confirm && <span role="alert">{errors.confirm.message}</span>}</label>
    <button disabled={isSubmitting}>{isSubmitting ? 'Updating…' : 'Update password'}</button>
  </form>{message && <p className="form-message" role="status">{message}</p>}</AuthCard>;
}

type OtpForm = { identifier: string; code: string };
export function VerifyOtpForm() {
  const { requestOtp, loginWithOtp, isAuthenticated, user, updateUser } = useAuth();
  const router = useRouter();
  const { register, getValues, handleSubmit, formState: { isSubmitting } } = useForm<OtpForm>();
  const [message, setMessage] = useState('');
  const contactMode = isAuthenticated;
  const request = async () => {
    const parsed = identifierSchema.safeParse(getValues('identifier'));
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
    try {
      const result = await requestOtp(parsed.data, contactMode ? 'PHONE_VERIFY' : 'PASSWORDLESS_LOGIN');
      setMessage(result.developer_otp ? `Code sent. Development code: ${result.developer_otp}` : 'If this member exists, a code has been sent.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'A code could not be sent.'); }
  };
  const verify = handleSubmit(async ({ identifier, code }) => {
    try {
      if (contactMode) {
        const result = await fetchApi<{ user: Record<string, unknown> }>('/member-auth/otp/verify/', {
          method: 'POST',
          body: JSON.stringify({ identifier: identifier.trim(), code: code.trim(), purpose: 'PHONE_VERIFY' }),
        });
        updateUser(result.user as any);
        router.replace('/verification');
      } else {
        await loginWithOtp(identifier.trim(), code.trim());
        router.replace('/dashboard');
      }
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The code is invalid or expired.'); }
  });
  return <AuthCard title={contactMode ? 'Verify your contact details' : 'Sign in with a one-time code'} copy={contactMode ? 'Verify your registered email address and mobile number one at a time.' : 'Use a verified email address or mobile number.'}><form onSubmit={verify}>
    <label>Email or mobile<input autoComplete="username" defaultValue={user?.mobile_number || user?.email || ''} {...register('identifier', { required: true })} /></label>
    <button type="button" onClick={request}>Send code</button>
    <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" {...register('code', { required: true })} /></label>
    <button disabled={isSubmitting}>{isSubmitting ? 'Verifying…' : 'Verify and sign in'}</button>
  </form>{message && <p className="form-message" role="status">{message}</p>}<p><Link href="/login">Use your password instead</Link></p></AuthCard>;
}

function AuthCard({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) {
  return <main className="auth-utility-page"><section className="auth-utility-card"><p>Secure account access</p><h1>{title}</h1><p>{copy}</p>{children}</section></main>;
}
