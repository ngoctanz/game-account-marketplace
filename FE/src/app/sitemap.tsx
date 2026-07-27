import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shopacvn.com';

  return [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
