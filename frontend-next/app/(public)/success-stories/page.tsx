import type { Metadata } from 'next';
import SuccessStoriesPage from '@/legacy/pages/SuccessStoriesPage';
import { fetchPublicApi } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Success Stories', description: 'Read real stories from couples who met through My Dear Partner.', alternates: { canonical: '/success-stories' } };

export default async function Page() {
  const [stories, reviews] = await Promise.all([
    fetchPublicApi<any[]>('/success-stories/').catch(() => []),
    fetchPublicApi<any[]>('/testimonials/').catch(() => []),
  ]);
  return <SuccessStoriesPage
    initialStories={stories.map((story) => ({ ...story, coupleNames: story.couple_names }))}
    initialReviews={reviews}
  />;
}
