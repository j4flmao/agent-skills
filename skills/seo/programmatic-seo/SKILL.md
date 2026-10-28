---
name: programmatic-seo
description: >
  Use this skill when the user says 'programmatic SEO', 'generate thousands of landing pages', 'location pages at scale', '[service] in [city] pages', 'template pages from a database', 'pSEO', 'long-tail pages from data'. It designs data-driven page templates that each carry unique value, builds them with Next.js App Router static generation/ISR, ships sharded sitemaps and internal linking, and sets quality gates against thin or duplicate content. Do NOT use for: AI-written editorial articles (use seo-ai-content-optimization), schema markup details (use seo-structured-data), or general site SEO audits (use seo-fundamentals).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [seo, programmatic-seo, nextjs, isr, sitemaps, landing-pages]
---

# Programmatic SEO

## Purpose
Programmatic SEO builds many pages from a structured dataset and a template, each targeting a long-tail query pattern (`{tool} alternatives`, `{currency A} to {currency B}`, `{job} salary in {city}`). It works when every page answers a distinct query with distinct data; it fails — and can trip Google's scaled content abuse policy — when pages only swap a keyword. This skill designs the dataset, template, build and quality gates.

## Agent Protocol

### Trigger
"programmatic seo", "pseo", "pages at scale", "location pages", "template landing pages", "generate pages from database", "comparison pages at scale".

### Input Context
- Query pattern(s) and evidence of demand (keyword tool volumes, Search Console).
- Dataset: source, row count, fields, update frequency, licensing.
- Framework/hosting (Next.js, Astro, etc.) and current site authority.

### Output Artifact
Page-pattern spec, data model, template code, sitemap and linking plan, quality gate rules.

### Response Format
```
Pattern: {template string} → est. pages: {n}
Unique value per page: {fields/data that differ meaningfully}
Index rule: {condition for index vs noindex}
Build: {SSG|ISR|on-demand} revalidate: {interval}
Sitemaps: {count, sharding}
Internal links: {hub → spoke structure}
```

## Is the Pattern Viable?
```
Real search demand for the pattern (not just the head term)?   no → stop
Each page has data users can't get from the parent page?       no → one page with filters instead
Data is accurate, licensed and refreshable?                    no → fix data first
Competing results are thin aggregators you can beat?           yes → good opportunity
```

## Data Model
```ts
// One row = one page
export interface CityServicePage {
  slug: string;             // "plumbers-in-austin-tx"
  service: string;          // "Plumbers"
  city: string; region: string;
  providerCount: number;    // unique data
  medianPrice: number | null;
  priceSampleSize: number;
  topProviders: { name: string; rating: number; reviews: number }[];
  updatedAt: string;        // ISO date of data refresh
  nearbySlugs: string[];    // internal links
}

export function isIndexable(p: CityServicePage): boolean {
  // Quality gate: only index pages with enough unique data
  return p.providerCount >= 3 && p.priceSampleSize >= 10;
}
```

## Template (Next.js App Router)

```tsx
// app/[service]/[city]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage, listTopPages } from '@/lib/pages';
import { isIndexable } from '@/lib/model';

type Params = Promise<{ service: string; city: string }>;

export const revalidate = 86400;     // ISR: refresh data daily
export const dynamicParams = true;   // long-tail pages render on first request, then cached

export async function generateStaticParams() {
  // Prebuild only the highest-demand pages; the long tail is generated on demand
  return (await listTopPages(1000)).map((p) => ({ service: p.serviceSlug, city: p.citySlug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { service, city } = await params;
  const page = await getPage(service, city);
  if (!page) return {};
  return {
    title: `${page.service} in ${page.city}, ${page.region} — ${page.providerCount} compared`,
    description: `Compare ${page.providerCount} ${page.service.toLowerCase()} in ${page.city}. Median price ${page.medianPrice ? `$${page.medianPrice}` : 'n/a'}, updated ${page.updatedAt.slice(0, 10)}.`,
    alternates: { canonical: `/${service}/${city}` },
    robots: isIndexable(page) ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { service, city } = await params;
  const page = await getPage(service, city);
  if (!page) notFound();
  return (
    <article>
      <h1>{page.service} in {page.city}, {page.region}</h1>
      <p>{page.providerCount} providers compared. Data updated {page.updatedAt.slice(0, 10)}.</p>
      <table>
        <thead><tr><th>Provider</th><th>Rating</th><th>Reviews</th></tr></thead>
        <tbody>
          {page.topProviders.map((p) => (
            <tr key={p.name}><td>{p.name}</td><td>{p.rating.toFixed(1)}</td><td>{p.reviews}</td></tr>
          ))}
        </tbody>
      </table>
      <nav aria-label="Nearby cities">
        {page.nearbySlugs.map((s) => <a key={s} href={`/${service}/${s}`}>{s.replace(/-/g, ' ')}</a>)}
      </nav>
    </article>
  );
}
```
(Pages Router equivalent: `getStaticPaths` with `fallback: 'blocking'` + `getStaticProps` with `revalidate`.)

## Sitemaps at Scale
A sitemap file holds at most 50,000 URLs (and 50 MB uncompressed); use multiple sitemaps.

```ts
// app/sitemap.ts — Next.js generateSitemaps shards into /sitemap/0.xml, /sitemap/1.xml, ...
import type { MetadataRoute } from 'next';
import { countIndexablePages, listIndexablePages } from '@/lib/pages';

const PER_SITEMAP = 45000;

export async function generateSitemaps() {
  const total = await countIndexablePages();
  return Array.from({ length: Math.ceil(total / PER_SITEMAP) }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const pages = await listIndexablePages({ offset: id * PER_SITEMAP, limit: PER_SITEMAP });
  return pages.map((p) => ({ url: `https://example.com/${p.serviceSlug}/${p.citySlug}`, lastModified: p.updatedAt }));
}
```
In recent Next.js versions the `id` passed to `sitemap()` may be a Promise; check your version's docs. Only list indexable, canonical URLs; reference shards from `robots.txt` or a sitemap index submitted in Search Console.

## Internal Linking
- Hub pages (`/plumbers`, `/plumbers/texas`) link to spokes; spokes link to siblings (nearby cities) and back up.
- Every indexable page reachable within a few clicks from the homepage; no orphan pages only discoverable via sitemap.
- Breadcrumbs + `BreadcrumbList` schema.

## Quality Gates
| Gate | Rule |
|------|------|
| Unique data | Minimum rows/samples per page (as `isIndexable`) |
| Near-duplicate | Pages whose main content is >~80% identical to a sibling → merge or noindex |
| Freshness | Data refreshed on schedule; `updatedAt` shown |
| Accuracy | Spot-check sample pages against sources each release |
| Performance | Template passes Core Web Vitals |
| Rollout | Launch in batches; watch indexing rate and impressions before expanding |

## Monitoring
- Search Console: Pages report (crawled/discovered – not indexed counts signal low perceived value), performance by URL pattern (use regex filters).
- Server logs: Googlebot crawl frequency on the pattern.
- Prune: noindex/merge pages with zero impressions after a few months.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| Same text with city name swapped | Page-specific data, or don't build the page |
| Publishing 100k pages at once on a new domain | Batch rollout, prove value on top patterns |
| AI-spun paragraphs to fake uniqueness | Real data differences; scaled content abuse risk |
| Indexable faceted/filter combinations | Canonical to the parent, noindex thin combos |
| Sitemaps listing noindex URLs | Sitemaps only contain indexable canonicals |

## Checklist
- [ ] Demand validated per pattern.
- [ ] Indexability gate implemented in code.
- [ ] Top pages prebuilt, long tail via ISR/on-demand.
- [ ] Sharded sitemaps of indexable URLs only.
- [ ] Hub-and-spoke internal links; no orphans.
- [ ] Batch rollout with indexing and traffic monitoring.
