import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localtea.ru';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/cart',
          '/profile',
          '/login',
          '/register',
          '/confirm-email',
          '/confirm-email-change',
          '/payment/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/cart',
          '/profile',
          '/login',
          '/register',
          '/confirm-email',
          '/confirm-email-change',
          '/payment/',
        ],
      },
      {
        userAgent: 'Yandexbot',
        allow: '/',
        disallow: [
          '/api/',
          '/cart',
          '/profile',
          '/login',
          '/register',
          '/confirm-email',
          '/confirm-email-change',
          '/payment/',
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
