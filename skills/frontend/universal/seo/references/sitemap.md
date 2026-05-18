# Sitemap Reference

## XML Sitemap Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-05-18T10:00:00+00:00</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/orders</loc>
    <lastmod>2026-05-17T08:30:00+00:00</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-04-01T00:00:00+00:00</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

## Sitemap Index (50k+ URLs)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2026-05-18T10:00:00+00:00</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-orders.xml</loc>
    <lastmod>2026-05-18T10:00:00+00:00</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-blog.xml</loc>
    <lastmod>2026-05-18T10:00:00+00:00</lastmod>
  </sitemap>
</sitemapindex>
```

## Images in Sitemap

```xml
<url>
  <loc>https://example.com/products/order-manager</loc>
  <image:image>
    <image:loc>https://example.com/images/product.png</image:loc>
    <image:caption>Order Manager Pro dashboard screenshot</image:caption>
    <image:title>Order Manager Pro</image:title>
  </image:image>
</url>
```

## Hreflang in Sitemap

```xml
<url>
  <loc>https://example.com/page</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://example.com/page" />
  <xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/page" />
  <xhtml:link rel="alternate" hreflang="de" href="https://example.com/de/page" />
  <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/page" />
</url>
```

## Priority Guidelines

| Priority | Page Type                     |
|----------|-------------------------------|
| 1.0      | Homepage                      |
| 0.9      | Main section pages            |
| 0.8      | Category / listing pages      |
| 0.7      | Individual content / product  |
| 0.5      | Static pages (about, contact) |
| 0.3      | Archive / tag pages           |
| 0.0      | Thin content, paginated       |

## Changefreq Guidelines

| Frequency | Page Type                     |
|-----------|-------------------------------|
| always    | Real-time dashboards          |
| hourly    | News, live data               |
| daily     | Blog, listings                |
| weekly    | Static content, products      |
| monthly   | About, FAQ, policies          |
| yearly    | Legal pages, archives         |
| never     | Permanent redirects           |

## Exclusions

Do NOT include:

- `/admin/*` — Admin panels
- `/api/*` — API endpoints
- `/login`, `/signup` — Auth pages
- URL params (`?sort=`, `?filter=`, `?page=`) — Canonical versions only
- `/404`, `/500` — Error pages
- Paginated beyond page 5 (for infinite archives)

## Generation Tools

### Next.js

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://example.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://example.com/orders', lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
  ];
}
```

### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  sitemap: {
    hostname: 'https://example.com',
    routes: ['/', '/orders', '/about'],
  },
});
```

### Astro

```ts
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const urls = [
    { loc: 'https://example.com/', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://example.com/orders', priority: '0.9', changefreq: 'hourly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
```

### Static Generation Script

```js
// scripts/generate-sitemap.js
import { writeFileSync } from 'fs';

const pages = [
  { loc: 'https://example.com/', changefreq: 'daily', priority: '1.0' },
  { loc: 'https://example.com/orders', changefreq: 'hourly', priority: '0.9' },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>\n    <loc>${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`).join('\n')}
</urlset>`;

writeFileSync('public/sitemap.xml', xml);
```

## robots.txt

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /_nuxt/
Disallow: /login
Disallow: /signup
Disallow: /*?*
Disallow: /*sort=*
Disallow: /*filter=*

Sitemap: https://example.com/sitemap.xml
```

## Submission

- Google Search Console: `https://search.google.com/search-console`
- Bing Webmaster Tools: `https://www.bing.com/webmasters`
- Ping Google: `https://www.google.com/ping?sitemap=https://example.com/sitemap.xml`
