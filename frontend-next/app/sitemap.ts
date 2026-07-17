import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const routes = ['', '/about', '/contact', '/success-stories', '/membership', '/blog', '/faq', '/help', '/privacy', '/terms'];
  return routes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === '/blog' ? 'weekly' : 'monthly', priority: route === '' ? 1 : .7 }));
}
