'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getInterests, updateInterestStatus } from '@/legacy/services/dataService';

type Interest = { id: string; sender: any; receiver: any; status: string; created_at: string };

export function InterestsClient({ mode }: { mode: 'received' | 'sent' | 'accepted' }) {
  const outgoing = mode === 'sent';
  const [items, setItems] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setLoading(true); setError('');
    getInterests(outgoing ? 'outgoing' : 'incoming')
      .then((rows) => setItems(mode === 'accepted' ? rows.filter((row) => row.status === 'ACCEPTED') : rows))
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Interests could not be loaded.'))
      .finally(() => setLoading(false));
  }, [mode, outgoing]);
  useEffect(load, [load]);

  const respond = async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
    try { await updateInterestStatus(id, status); load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'The interest could not be updated.'); }
  };

  return <main className="public-content-page"><div className="content-shell">
    <p>Your connections</p><h1>{mode === 'sent' ? 'Sent interests' : mode === 'accepted' ? 'Accepted interests' : 'Received interests'}</h1>
    <nav aria-label="Interest views" style={{ display: 'flex', gap: 12, marginTop: 20 }}><Link href="/interests/received">Received</Link><Link href="/interests/sent">Sent</Link><Link href="/interests/accepted">Accepted</Link></nav>
    {loading ? <div className="content-grid" role="status"><div className="skeleton-card" /><div className="skeleton-card" /></div>
      : error ? <div className="content-card" role="alert" style={{ marginTop: 24 }}><h2>Could not load interests</h2><p>{error}</p><button onClick={load}>Retry</button></div>
        : items.length ? <div className="content-grid">{items.map((interest) => {
          const profile = outgoing ? interest.receiver : interest.sender;
          return <article className="content-card" key={interest.id}><p>{interest.status}</p><h2>{profile.full_name || 'Member'}</h2><p>{profile.work_location || profile.location || 'Location private'}</p><Link href={`/profile/${profile.id}`}>View profile</Link>
            {!outgoing && interest.status === 'PENDING' && <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button onClick={() => respond(interest.id, 'ACCEPTED')}>Accept</button><button onClick={() => respond(interest.id, 'DECLINED')}>Decline</button></div>}
          </article>;
        })}</div> : <div className="content-card" style={{ marginTop: 24 }}><h2>No interests here yet</h2><p>When a connection reaches this stage, it will appear here.</p><Link href="/search">Discover matches</Link></div>}
  </div></main>;
}
