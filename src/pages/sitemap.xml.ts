import { getCollection } from 'astro:content';
import { siteConfig, siteMeta } from '../site.config';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const site = siteConfig.siteUrl.replace(/\/$/, '');
  const posts = await getCollection('posts');
  const pages = await getCollection('pages');

  const urls: string[] = [
    `${site}/`,
    `${site}/search.html`,
    `${site}/rss.xml`,
  ];

  for (const post of posts) {
    urls.push(`${site}/archives/${post.data.typechoCid}.html`);
  }
  for (const page of pages) {
    urls.push(`${site}/${page.data.pageSlug}.html`);
  }
  for (const cat of siteMeta.categories) {
    urls.push(`${site}/category/${cat.slug}.html`);
  }
  const seenTags = new Set<string>();
  for (const tag of siteMeta.tags) {
    if (seenTags.has(tag.slug)) continue;
    seenTags.add(tag.slug);
    urls.push(`${site}/tag/${encodeURIComponent(tag.slug)}.html`);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `  <url><loc>${loc}</loc><changefreq>weekly</changefreq></url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
