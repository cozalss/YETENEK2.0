import type { MetadataRoute } from 'next';
import { SPORTS } from '@/lib/content/sports';
import { PROGRAM_LIST } from '@/lib/training/programs';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yetenek.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/test`, changeFrequency: 'weekly', priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/test/full`, changeFrequency: 'weekly', priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/result/demo`, changeFrequency: 'monthly', priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/training`, changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/sports`, changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
  ];

  const sportsRoutes: MetadataRoute.Sitemap = SPORTS.map((s) => ({
    url: `${SITE_URL}/sports/${s.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.55,
    lastModified: now,
  }));

  const trainingRoutes: MetadataRoute.Sitemap = PROGRAM_LIST.map((p) => ({
    url: `${SITE_URL}/training/${p.dimension}`,
    changeFrequency: 'monthly' as const,
    priority: 0.55,
    lastModified: now,
  }));

  return [...staticRoutes, ...sportsRoutes, ...trainingRoutes];
}
