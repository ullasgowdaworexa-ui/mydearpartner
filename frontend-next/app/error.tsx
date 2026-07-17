'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="auth-utility-page">
    <section className="auth-utility-card" role="alert">
      <p>Something went wrong</p>
      <h1>We could not load this page.</h1>
      <p>Your data has not been changed. Try the request again, or return later if the service is unavailable.</p>
      <button type="button" onClick={reset}>Try again</button>
    </section>
  </main>;
}
