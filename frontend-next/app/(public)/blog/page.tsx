import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { fetchPublicApi, slugify } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Relationship & Matrimony Blog', description: 'Practical guidance for thoughtful matchmaking, relationships, families, and marriage.', alternates: { canonical: '/blog' } };

type BlogPost = { id: string; title: string; excerpt: string; image?: string | null; date: string; author: string; category: string };

export default async function BlogPage() {
  const posts = await fetchPublicApi<BlogPost[]>('/blogposts/').catch(() => []);
  return <main className="public-content-page"><div className="content-shell">
    <p>Journal</p><h1>Thoughtful guidance for a meaningful journey.</h1>
    <p>Perspectives on compatibility, conversations, family, safety, and building a lasting partnership.</p>
    {posts.length ? <div className="content-grid">{posts.map((post) => <article className="content-card" key={post.id}>
      <Image src={post.image || '/images/wedding-rings.jpg'} alt="" width={720} height={420} sizes="(max-width: 768px) 100vw, 33vw" style={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: 12 }} />
      <p>{post.category} · {post.date}</p><h2>{post.title}</h2><p>{post.excerpt}</p>
      <Link href={`/blog/${slugify(post.title)}-${post.id}`}>Read article<span className="sr-only">: {post.title}</span></Link>
    </article>)}</div> : <div className="content-card" style={{ marginTop: '2rem' }}><h2>No articles yet</h2><p>Our editorial team is preparing the first collection.</p></div>}
  </div></main>;
}
