'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { fetchApi } from '../../services/apiClient';

type Detail = {
  member: { full_name: string; email: string; mobile_number?: string; profile_status: string; photo_status: string; document_status: string; is_active: boolean };
  verifications: Array<{ id: string; verification_type: string; status: string; submitted_at: string; rejection_reason?: string }>;
  documents: Array<{ id: string; document_type: string; status: string; uploaded_at: string; rejection_reason?: string }>;
  memberships: Array<{ id: string; status: string; is_active: boolean; start_date?: string; end_date?: string; plan__name: string }>;
  activity: Array<{ id: string; action: string; module: string; description: string; created_at: string }>;
};

export default function AdminMemberDetailPage({ memberId }: { memberId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetchApi<Detail>(`/admin/users/${memberId}/`).then(setDetail).catch(() => setError('Unable to load this member.'));
  }, [memberId]);
  if (error) return <main className="admin-page"><p>{error}</p></main>;
  if (!detail) return <main className="admin-page"><p>Loading member…</p></main>;
  const { member } = detail;
  return <main className="admin-page"><Link to="../members">← Members</Link><h1>{member.full_name}</h1><p>{member.email} · {member.mobile_number || 'No mobile number'}</p><p>Account: {member.is_active ? 'Active' : 'Inactive'} · Profile: {member.profile_status} · Photo: {member.photo_status} · Documents: {member.document_status}</p>
    <h2>Verification history</h2><ul>{detail.verifications.map((row) => <li key={row.id}>{row.verification_type}: {row.status} — {new Date(row.submitted_at).toLocaleDateString()}</li>)}</ul>
    <h2>Documents</h2><ul>{detail.documents.map((row) => <li key={row.id}>{row.document_type}: {row.status}</li>)}</ul>
    <h2>Memberships</h2><ul>{detail.memberships.map((row) => <li key={row.id}>{row.plan__name}: {row.status}{row.is_active ? ' (active)' : ''}</li>)}</ul>
    <h2>Audit activity</h2><ul>{detail.activity.map((row) => <li key={row.id}>{row.action} — {new Date(row.created_at).toLocaleString()}</li>)}</ul>
  </main>;
}
