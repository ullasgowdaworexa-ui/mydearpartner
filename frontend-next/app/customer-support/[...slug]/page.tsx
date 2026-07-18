import { redirect } from 'next/navigation';

export default async function CustomerSupportPathRedirect({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  redirect(`/support/${slug.join('/')}`);
}
