import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/profile', '/trainer', '/matches', '/find', '/errors', '/exercises'],
    },
    sitemap: 'https://www.breakrun.ru/sitemap.xml',
  };
}
