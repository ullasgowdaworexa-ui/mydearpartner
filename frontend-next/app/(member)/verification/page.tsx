'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Clock,
  AlertCircle,
  FileCheck,
  Camera,
  FileText,
  User,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useGetVerificationStatusQuery } from '@/legacy/services/verificationStatusApi';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'incomplete' | 'pending' | 'approved' | 'rejected';
  action?: string;
  actionLink?: string;
  reason?: string | null;
}

export default function VerificationCenterPage() {
  const { data: verification, isLoading, error, refetch } = useGetVerificationStatusQuery();
  const [steps, setSteps] = useState<VerificationStep[]>([]);

  // Verification status can change out-of-band (e.g. an admin approves a
  // document while the member keeps the app open). Refetch on mount so the
  // step list always reflects the latest server state.
  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (verification) {
      setSteps([
        {
          id: 'contact',
          title: 'Email & Mobile',
          description: 'Verify both your email address and mobile number',
          icon: User,
          status: verification.contact.status as any,
          action: 'Verify Contact Details',
          actionLink: '/verify-otp',
          reason: verification.contact.reason,
        },
        {
          id: 'profile',
          title: 'Profile Information',
          description: 'Complete and submit your profile details',
          icon: User,
          status: verification.profile.status as any,
          action: 'Complete Profile',
          actionLink: '/profile/edit',
          reason: verification.profile.reason,
        },
        {
          id: 'photo',
          title: 'Profile Photo',
          description: 'Upload a clear profile photo for verification',
          icon: Camera,
          status: verification.primary_photo.status as any,
          action: 'Upload Photo',
          actionLink: '/profile/photos',
          reason: verification.primary_photo.reason,
        },
        {
          id: 'document',
          title: 'Government ID',
          description: 'Upload a valid government-issued ID (Aadhar, Passport, etc)',
          icon: FileText,
          status: verification.documents.status as any,
          action: 'Upload Document',
          actionLink: '/profile/documents',
          reason: verification.documents.reason,
        },
      ]);
    }
  }, [verification]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'pending':
        return 'text-blue-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileCheck className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Not Started';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Verification Status</h2>
          <p className="text-gray-600 mb-6">Please try again or contact support if the problem persists.</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const anyRejected = steps.some((s) => s.status === 'rejected');
  // The account is "verified" once the lightweight requirement is met
  // (email + mobile confirmed). This drives the overall verified banner.
  const isVerified = Boolean(verification?.is_verified);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-rose-600" />
            <h1 className="text-4xl font-bold text-gray-900">Account Verification</h1>
          </div>
          <p className="text-lg text-gray-600">
            Complete these steps to verify your account and access premium features
          </p>
        </motion.div>

        {/* Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 p-6 rounded-lg border-2 ${
            isVerified
              ? 'bg-green-50 border-green-200'
              : anyRejected
              ? 'bg-red-50 border-red-200'
              : verification.account_status === 'IN_REVIEW'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {isVerified ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : anyRejected ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : verification.account_status === 'IN_REVIEW' ? (
                <Clock className="w-6 h-6 text-blue-600" />
              ) : (
                <FileCheck className="w-6 h-6 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg mb-1">
                {isVerified
                  ? 'Your account is fully verified!'
                  : anyRejected
                  ? 'Some items need resubmission'
                  : verification.account_status === 'IN_REVIEW'
                  ? 'Your documents are under review'
                  : 'Complete your verification'}
              </h2>
              <p className="text-sm mb-3">
                {verification.next_action}
              </p>
              {verification.membership_pending && (
                <div className="flex items-center gap-2 p-3 bg-white/50 rounded border border-current border-opacity-20">
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    ✓ You've selected a plan waiting for account verification
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Verification Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-lg border-2 transition-all ${getStatusBgColor(step.status)}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-1">
                    {step.status === 'approved' ? (
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                    ) : step.status === 'pending' ? (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                    ) : step.status === 'rejected' ? (
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{step.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 ${getStatusColor(
                          step.status
                        )} bg-white/50`}
                      >
                        {getStatusLabel(step.status)}
                      </span>
                    </div>

                    {/* Rejection Reason */}
                    {step.status === 'rejected' && step.reason && (
                      <div className="mt-3 p-3 bg-white/60 rounded border border-red-200 text-sm text-red-700">
                        <strong>Reason:</strong> {step.reason}
                      </div>
                    )}

                    {/* Action Button */}
                    {step.status !== 'approved' && step.actionLink && (
                      <Link
                        href={step.actionLink}
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
                      >
                        {step.action}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <h3 className="font-bold text-blue-900 mb-3">Why We Verify</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Ensure safety and authenticity of all members</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Prevent fraud and fake profiles</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Build trust in our community</span>
            </li>
          </ul>
        </motion.div>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-600 mb-4">Need help with verification?</p>
          <Link
            href="/tickets"
            className="inline-flex items-center gap-2 px-6 py-2 border-2 border-rose-500 text-rose-600 font-medium rounded-lg hover:bg-rose-50 transition-colors"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
