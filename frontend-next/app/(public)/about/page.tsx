import type { Metadata } from 'next';
import AboutPage from '@/legacy/pages/AboutPage';

export const metadata: Metadata = { title: 'About Us', description: 'Learn how My Dear Partner combines verification, privacy, and thoughtful compatibility.', alternates: { canonical: '/about' } };
export default function Page() { return <AboutPage />; }
