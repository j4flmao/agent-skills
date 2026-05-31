---
name: frontend-seo
description: >
  Use this skill when the user says 'seo', 'meta tags', 'open graph', 'structured data', 'JSON-LD', 'sitemap', 'robots.txt', 'canonical url', 'ssr seo'. This skill enforces SEO best practices — meta tag optimization, structured data injection, XML sitemap generation, robots.txt configuration, canonical URL handling, and SSR strategies for search engine crawlers. Applies to any frontend stack.
version: "1.0.0"
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

## Component Architecture

### Meta Tag Decision Tree
```
Is this a content page (article, product)?
  Yes → Generate OG tags from content: title, description, image
  No → Is this a listing/category page?
    Yes → OG tags with category name + generic image
    No → Default OG tags from site config

Does the page have dynamic content?
  Yes → Use framework meta API (generateMetadata, useHead)
  No → Static metadata in page config

Is the page paginated?
  Yes → Add rel="next" and rel="prev", self-referencing canonical
  No → Standard canonical to current URL
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

## Best Practices

1. Title format: `Primary Keyword — Secondary Keyword | Brand`
2. OG image: 1200x630px, < 300 KB, serve via CDN
3. Canonical URL always absolute, no tracking params
4. JSON-LD in `<head>` or end of `<body>` — non-blocking
5. Regenerate sitemap on content publish
6. Allow CSS/JS in robots.txt — Google needs them to render
7. Use structured data testing tool before deployment
8. Monitor Core Web Vitals via Search Console

## Compared With

| Aspect | SSR/SSG | Client-side (CSR) | Hybrid |
|--------|---------|-------------------|--------|
| Crawler visibility | Full content | Limited (budget) | Full content |
| Meta tag control | Server-side | Client injection | Server-side |
| Sitemap generation | Framework API | Manual | Framework API |
| Core Web Vitals | Good (fast FCP) | Variable | Good |
| Complexity | Higher | Lower | Medium |
| Use case | Content sites | Apps | Both |

## Performance

1. SSR improves LCP by 40-60% compared to CSR for content pages.
2. JSON-LD in `<head>` adds ~1-5KB to HTML size.
3. Sitemap generation: static at build time preferred over dynamic generation.
4. Preconnect to CDN for OG images reduces LCP font/hero image delay.
5. Inline critical CSS for above-the-fold content improves FCP.
6. Proper cache headers on SSG pages enables CDN caching (s-maxage).

## Tooling

1. `Lighthouse` — SEO audit + performance audit.
2. `Google Search Console` — monitor index status, submit sitemaps.
3. `Ahrefs / Semrush` — competitive SEO analysis.
4. `Google Rich Results Test` — validate JSON-LD.
5. `Schema.org Validator` — validate structured data.
6. `next-sitemap` — sitemap and robots.txt generation for Next.js.
7. `sitemap-generator-cli` — standalone sitemap generator.
8. `Yoast SEO` (WordPress) or equivalent for CMS.

## Rules
- Never use `noindex` on public pages unless explicitly requested.
- Always set `canonical` URL to the preferred version.
- Never block CSS or JS files in robots.txt.
- Always use absolute URLs in canonical tags, sitemaps, and JSON-LD.
- Never duplicate `hreflang` tags — one per language variant.
- Always use `application/ld+json` for structured data.
- Never include session IDs or tracking params in canonical URLs.
- Always validate JSON-LD with Google Rich Results Test before deploying.

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
