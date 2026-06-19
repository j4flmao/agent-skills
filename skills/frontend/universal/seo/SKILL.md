---
name: frontend-seo
description: >
  Use this skill when the user says 'seo', 'meta tags', 'open graph', 'structured data', 'JSON-LD', 'sitemap', 'robots.txt', 'canonical url', 'ssr seo'. This skill enforces SEO best practices — meta tag optimization, structured data injection, XML sitemap generation, robots.txt configuration, canonical URL handling, and SSR strategies for search engine crawlers. Applies to any frontend stack.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, seo, phase-3, universal]
---

# Frontend SEO

## Purpose
Optimize web applications for search engine ranking and rich snippet eligibility through meta tags, structured data, sitemaps, and SSR-friendly rendering. Covers Core Web Vitals, hreflang for multi-language, canonical URLs, JSON-LD schemas, and automated audit tooling.

## Agent Protocol

### Trigger
Exact phrases: "seo", "meta tags", "open graph", "og tags", "structured data", "json-ld", "schema.org", "sitemap", "robots.txt", "canonical url", "seo audit", "seo optimization", "ssr seo", "rich results", "hreflang", "core web vitals", "lighthouse seo"

### Input Context
- Check for existing `<head>` meta tag patterns and SSR framework
- Determine if a sitemap or robots.txt already exists
- Identify the routing library for canonical URL generation
- Verify whether structured data is already present
- Check multi-language setup for hreflang requirements

### Output Artifact
No file output unless requested.

### Response Format
1. Output complete HTML `<head>` snippet for meta tags — never abbreviate
2. Output full JSON-LD blocks — never truncate with ellipsis
3. For sitemaps, output full XML structure with at least 3 example `<url>` entries
4. No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] `<title>` (50-60 chars) and `<meta name="description">` (150-160 chars) on every page
- [ ] Open Graph tags on every page
- [ ] Twitter Card tags present
- [ ] Canonical URL set on every page
- [ ] JSON-LD structured data present for relevant content types
- [ ] `sitemap.xml` lists all public pages
- [ ] `robots.txt` allows crawling of public paths
- [ ] SSR or prerendering ensures crawlers see fully rendered content
- [ ] Lighthouse SEO audit scores 90+

### Max Response Length
150 lines unless generating full sitemap or multiple JSON-LD blocks.

## SEO Architecture / Decision Trees

### Meta Tag Strategy Decision Tree
```
Page type?
  |-- Content page (article, product, blog post) -->
  |     OG: title, description, image derived from content
  |     JSON-LD: Article or Product schema
  |     Title: "Primary Keyword — Secondary Keyword | Site"
  |
  |-- Listing / category page -->
  |     OG: category name + generic category image
  |     JSON-LD: CollectionPage or BreadcrumbList
  |     Title: "Category Name | Site"
  |
  |-- User profile / dashboard (auth required) -->
  |     OG: site-level defaults (noindex to prevent crawling)
  |     Robots: noindex, nofollow
  |
  |-- Error page (404, 500) -->
        OG: site-level defaults with error context
        Title: "Page Not Found | Site"
```

### Rendering Strategy for SEO Decision Tree
```
SEO critical?
  |-- YES -->
  |     |-- Public content (same for all users)? -->
  |     |     SSG or ISR (pre-rendered, crawler sees full content immediately)
  |     |
  |     |-- User-specific? -->
  |           SSR (crawler gets full HTML, but user data is dynamic)
  |
  |-- NO -->
        |-- Behind auth? --> CSR is fine (Google won't index)
        |-- Not auth, but low SEO value? --> CSR with basic SSG shell
```

### Structured Data Decision Tree
```
Content type?
  |-- Article / Blog Post -->
  |     Schema: Article, NewsArticle, or BlogPosting
  |     Required: headline, author, datePublished, dateModified, image
  |
  |-- Product -->
  |     Schema: Product
  |     Required: name, image, description, offers (price, availability)
  |     Optional: review, aggregateRating, brand
  |
  |-- Breadcrumb navigation -->
  |     Schema: BreadcrumbList
  |     Required: position, name, item URL for each level
  |
  |-- FAQ page -->
  |     Schema: FAQPage
  |     Required: mainEntity array with Question/Answer pairs
  |
  |-- Organization / Local Business -->
  |     Schema: Organization or LocalBusiness
  |     Required: name, logo, url, address (for LocalBusiness)
  |
  |-- Event -->
        Schema: Event
        Required: name, startDate, location, offers
```

---

## Workflow

### Step 1: Audit Current State
```bash
npx lighthouse https://example.com --view --preset=desktop
```
Check existing `<head>` for title, description, OG, Twitter cards, canonical.

### Step 2: Implement Base Meta Tags
Every page must have:
```html
<title>Primary Keyword — Secondary Keyword | Site Name</title>
<meta name="description" content="Compelling value prop with keyword, 150-160 chars." />
<link rel="canonical" href="https://example.com/current-path" />
<meta name="robots" content="index, follow" />
```

### Step 3: Add Social Graph Tags
```html
<meta property="og:title" content="Primary Keyword — Site Name" />
<meta property="og:description" content="Compelling description." />
<meta property="og:image" content="https://example.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://example.com/page" />
<meta property="og:type" content="website" />
```

### Step 4: Inject Structured Data (JSON-LD)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Category", "item": "https://example.com/category" }
  ]
}
</script>
```

### Step 5: Configure Sitemap and Robots
```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /login
Sitemap: https://example.com/sitemap.xml
```

### Step 6: Implement SSR/SSG
| Framework | Meta API | Sitemap API |
|-----------|----------|-------------|
| Next.js App Router | `export const metadata: Metadata` | `app/sitemap.ts` |
| Nuxt 3 | `useHead()` | `@nuxtjs/sitemap` |
| Astro | Frontmatter `head` | `src/pages/sitemap.xml.ts` |
| SvelteKit | `svelte:head` | `src/routes/sitemap.xml/+server.ts` |

### Step 7: Set Up Hreflang
```html
<link rel="alternate" hreflang="en" href="https://example.com/page" />
<link rel="alternate" hreflang="es" href="https://example.com/es/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page" />
```

### Step 8: Run Audit and Fix
```bash
npx lhci collect --url=https://example.com
npx lhci assert --preset=lighthouse:recommended
```

### Step 9: Next.js App Router Metadata API
```typescript
// app/products/[id]/page.tsx
import { Metadata } from 'next'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id)

  return {
    title: `${product.name} | Store`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: [{ url: product.image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description.slice(0, 160),
      images: [product.image],
    },
    alternates: {
      canonical: `https://example.com/products/${product.slug}`,
    },
  }
}
```

### Step 10: JSON-LD Component (React)
```tsx
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', ...data }),
      }}
    />
  )
}

// Usage
<JsonLd
  data={{
    '@type': 'Product',
    name: product.name,
    image: product.image,
    offers: { '@type': 'Offer', price: product.price, priceCurrency: 'USD' },
  }}
/>
```

### Step 11: Dynamic OG Image Generation (Next.js)
```typescript
// app/api/og/route.tsx — serverless OG image
import { ImageResponse } from 'next/og'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Default Title'

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <h1 style={{ fontSize: 64, color: 'white', textAlign: 'center' }}>
          {title}
        </h1>
        <p style={{ fontSize: 32, color: 'rgba(255,255,255,0.8)' }}>
          example.com
        </p>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

// Use in metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    openGraph: {
      images: [{ url: `/api/og?title=${encodeURIComponent(post.title)}` }],
    },
  }
}
```

### Step 12: Core Web Vitals Optimization for SEO
```typescript
// 1. Inline critical CSS for above-the-fold content
// app/layout.tsx
import { readFileSync } from 'fs'
import { join } from 'path'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const criticalCss = readFileSync(join(process.cwd(), 'public/critical.css'), 'utf-8')
  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

// 2. LCP optimization — preload hero image
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />

// 3. CLS prevention — set dimensions on all images
<img src={post.image} width={800} height={450} alt={post.title} />

// 4. INP optimization — avoid long tasks
// Defer non-critical interactions
function SearchButton() {
  const handleClick = async () => {
    await new Promise(requestIdleCallback)
    // heavy search operation
  }
  return <button onClick={handleClick}>Search</button>
}
```

### Step 13: SEO Monitoring & CI Integration
```yaml
# .github/workflows/seo-audit.yml
name: SEO Audit
on: [deployment]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx lhci collect --url=${{ github.event.deployment.payload.url }}
      - run: npx lhci assert --preset=lighthouse:recommended
      - uses: actions/upload-artifact@v4
        with:
          name: lighthouse-report
          path: .lighthouseci/
```

```bash
# Crawl and validate structured data
npx structured-data-testing-tool crawl https://example.com --max-urls=50

# Check for broken links
npx broken-link-checker https://example.com --recursive

# Validate sitemap
curl -s https://example.com/sitemap.xml | xmllint --noout -
```

### Step 14: Headless CMS SEO Patterns
```typescript
// Generate metadata from CMS content (Sanity, Contentful, Strapi)
interface SEOMetadata {
  title: string
  description: string
  ogImage?: { url: string }
  canonicalOverride?: string
  noindex?: boolean
  structuredData?: Record<string, unknown>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageFromCMS(params.slug)

  return {
    title: `${page.seo.title} | Site`,
    description: page.seo.description,
    robots: page.seo.noindex ? { index: false } : { index: true },
    alternates: { canonical: page.seo.canonicalOverride || undefined },
    openGraph: page.seo.ogImage ? {
      images: [{ url: page.seo.ogImage.url, width: 1200, height: 630 }],
    } : undefined,
  }
}

// BreadcrumbList from CMS navigation
// app/breadcrumb-jsonld.tsx
function BreadcrumbJsonLd({ path }: { path: { name: string; slug: string }[] }) {
  return (
    <JsonLd data={{
      '@type': 'BreadcrumbList',
      itemListElement: path.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: `https://example.com/${item.slug}`,
      })),
    }} />
  )
}
```

### Step 15: Advanced Structured Data Patterns
```html
<!-- FAQ Schema (rich snippet with expandable Q&A) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "How do I reset my password?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Go to Settings > Security > Reset Password."
    }
  }]
}
</script>

<!-- HowTo Schema (step-by-step, shown in search results) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Install Widget",
  "step": [{
    "@type": "HowToStep",
    "position": 1,
    "text": "Download the package.",
    "url": "https://example.com/guide#step1"
  }]
}
</script>

<!-- LocalBusiness Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Example Store",
  "address": { "@type": "PostalAddress", "streetAddress": "123 Main St", "addressLocality": "City" },
  "telephone": "+1-123-456-7890",
  "openingHours": "Mo-Fr 09:00-17:00",
  "priceRange": "$$"
}
</script>
```

## Common Pitfalls

1. **Duplicate titles/descriptions**: Every page must have unique values.
2. **Missing canonical on paginated pages**: Each pagination page needs its own canonical.
3. **Blocking CSS/JS in robots.txt**: Google needs CSS/JS for rendering assessment.
4. **Relative URLs in canonical/sitemap**: Always use absolute URLs.
5. **Client-only rendering for crawlers**: Googlebot executes JS but has a budget.
6. **Overly large sitemaps**: Max 50,000 URLs or 50 MB per sitemap.
7. **No lastmod in sitemap**: Helps Google understand freshness.
8. **Missing alt text on images**: Accessibility and SEO issue.

## Compared With

| Aspect | SSR/SSG | Client-side (CSR) | Hybrid |
|--------|---------|-------------------|--------|
| Crawler visibility | Full content | Limited (budget) | Full content |
| Meta tag control | Server-side | Client injection | Server-side |
| Sitemap generation | Framework API | Manual | Framework API |
| Core Web Vitals | Good (fast FCP) | Variable | Good |
| Complexity | Higher | Lower | Medium |
| Use case | Content sites | Apps | Both |
| Structured data | Server-side | Client injection | Server-side |
| Hreflang | Framework API | Manual | Framework API |

## Performance Considerations

- SSR improves LCP by 40-60% compared to CSR for content pages
- JSON-LD in `<head>` adds ~1-5KB to HTML size
- Sitemap generation: static at build time preferred over dynamic generation
- Preconnect to CDN for OG images reduces LCP font/hero image delay
- Inline critical CSS for above-the-fold content improves FCP
- Proper cache headers on SSG pages enables CDN caching (s-maxage)
- Dynamic OG images via serverless functions add ~100-200ms to first request (warm)
- Sitemap index for sites with >50K URLs prevents timeout on crawlers
- robots.txt should be static (generated at build) — dynamic adds latency for every crawler request

## Accessibility Considerations

- Alt text on images is both an SEO ranking factor and accessibility requirement
- Structured data does not affect visual accessibility but helps users find content
- Descriptive page titles help screen reader users navigate between tabs
- Skip-to-content links improve both accessibility and SEO (content reachable)
- Heading hierarchy (h1→h2→h3) is a ranking factor and screen reader navigation aid
- ARIA landmarks (nav, main, footer) help crawlers understand page structure

## Security Considerations

- JSON-LD can include URLs — ensure they are HTTPS and not open redirects
- Meta tags cannot be exploited for XSS (they are HTML-encoded by default)
- Sitemap URLs should not expose unpublished or sensitive content
- Noindex is a crawl directive, not a security measure — use authentication for private pages
- Dynamic OG image endpoints must sanitize input to prevent SSRF
- Revalidation tokens for ISR sitemaps must be kept secret

## Rules
- Never use `noindex` on public pages unless explicitly requested.
- Always set `canonical` URL to the preferred version.
- Never block CSS or JS files in robots.txt.
- Always use absolute URLs in canonical tags, sitemaps, and JSON-LD.
- Never duplicate `hreflang` tags — one per language variant.
- Always use `application/ld+json` for structured data.
- Never include session IDs or tracking params in canonical URLs.
- Always validate JSON-LD with Google Rich Results Test before deploying.
- Generate sitemaps at build time for SSG sites — dynamic sitemaps add latency and cost.
- Use sitemap index files (>50K URLs) to respect crawler limits.
- Set `lastmod` on every sitemap URL to help crawlers prioritize recrawl.

## References
  - references/meta-tags.md — Meta Tags Reference
  - references/performance-seo.md — Performance SEO Reference
  - references/seo-testing.md — SEO Testing Reference
  - references/sitemap.md — Sitemap Reference
  - references/ssr-seo.md — SSR/SSG SEO Reference
  - references/structured-data.md — Structured Data Reference
  - references/seo-technical-audit.md — Technical SEO Audit Reference
  - references/seo-structured-data.md — Structured Data Reference

## Handoff
No artifact produced unless requested.
Next skill: `frontend-pwa` (if the app needs offline PWA capabilities alongside SEO)
Carry forward: Canonical URL pattern, current meta tags, JSON-LD schema decisions
