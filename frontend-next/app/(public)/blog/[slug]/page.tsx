import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublicApi, slugify } from '@/lib/server-api';

type BlogPost = { id: string; title: string; excerpt: string; image?: string | null; date: string; author: string; category: string };

async function postFor(slug: string) {
  const posts = await fetchPublicApi<BlogPost[]>('/blogposts/').catch(() => []);
  const post = posts.find((item) => slug === `${slugify(item.title)}-${item.id}` || slug === String(item.id));
  return { post, posts };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await postFor(slug);
  if (!post) return { title: 'Article not found', robots: { index: false, follow: false } };
  return { title: post.title, description: post.excerpt, alternates: { canonical: `/blog/${slug}` }, openGraph: { type: 'article', title: post.title, description: post.excerpt, images: post.image ? [post.image] : ['/images/wedding-rings.jpg'] } };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { post, posts } = await postFor(slug);
  if (!post) notFound();
  const related = posts.filter((item) => item.id !== post.id && item.category === post.category).slice(0, 3);
  return <main className="public-content-page"><article className="content-shell" style={{ maxWidth: 860 }}>
    <Link href="/blog">← All articles</Link><p>{post.category} · {post.date}</p><h1>{post.title}</h1><p>By {post.author}</p>
    <Image src={post.image || '/images/wedding-rings.jpg'} alt="" width={1200} height={700} priority sizes="(max-width: 900px) 100vw, 860px" style={{ width: '100%', height: 'auto', borderRadius: 20, margin: '2rem 0' }} />
    <p style={{ color: 'var(--ink)', fontSize: '1.2rem', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{post.excerpt}</p>
    {related.length > 0 && <section><h2>Related reading</h2><div className="content-grid">{related.map((item) => <div className="content-card" key={item.id}><h3>{item.title}</h3><Link href={`/blog/${slugify(item.title)}-${item.id}`}>Read article</Link></div>)}</div></section>}
  </article></main>;
}
