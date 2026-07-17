import Link from 'next/link';

export default function NotFound() {
  return <main className="auth-utility-page">
    <section className="auth-utility-card">
      <p>404</p><h1>This page could not be found.</h1>
      <p>The address may be outdated, or the resource may no longer be available.</p>
      <Link className="lc-btn-signup" href="/">Return to My Dear Partner</Link>
    </section>
  </main>;
}
