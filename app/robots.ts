import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/teach', '/profile', '/settings', '/login', '/signup', '/auth', '/api'],
    },
    sitemap: 'https://simplexer-platform.vercel.app/sitemap.xml',
  };
}
