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
  windsure: true
tags: [frontend, seo, phase-3, universal]
---

# Frontend SEO

## Purpose
Optimize web applications for search engine ranking and rich snippet eligibility through meta tags, structured data, sitemaps, and SSR-friendly rendering. Covers Core Web Vitals, hreflang for multi-language, canonical URLs, JSON-LD schemas, and automated audit tooling.

## Agent Protocol

### Trigger
Exact phrases: "seo", "meta tags", "open graph", "og tags", "structured data", "json-ld", "schema.org", "sitemap", "robots.txt", "canonical url", "seo audit", "seo optimization", "ssr seo", "rich results", "hreflang", "core web vitals", "lighthouse seo"

### Input Context
- Check for existing `<head>` meta tag patterns and SSR framework (Next.js, Nuxt, Astro, SvelteKit, Remix)
- Determine if a sitemap (`sitemap.xml`) or robots.txt already exists
- Identify the routing library for canonical URL generation
- Verify whether structured data (JSON-LD) is already present
- Check multi-language setup for hreflang requirements
- Note existing Lighthouse SEO scores

### Output Artifact
No file output unless requested.

### Response Format
1. Output complete HTML `<head>` snippet for meta tags — never abbreviate with `<!-- ... -->`
2. Output full JSON-LD blocks — never truncate with ellipsis
3. For sitemaps, output the full XML structure with at least 3 example `<url>` entries
4. For robots.txt, output the complete file
5. For framework-specific meta, output the full component/page config
6. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] `<title>` (50-60 chars) and `<meta name="description">` (150-160 chars) present on every page
- [ ] Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) on every page
- [ ] Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) present
- [ ] Canonical URL `<link rel="canonical">` set on every page to prevent duplicate content
- [ ] JSON-LD structured data present for relevant content types (Article, Product, FAQ, BreadcrumbList, Organization)
- [ ] `sitemap.xml` lists all public pages with `<lastmod>`, `<changefreq>`, `<priority>`
- [ ] `robots.txt` allows crawling of public paths, disallows admin/internal paths, references sitemap
- [ ] SSR or prerendering ensures crawlers see fully rendered content (no empty shells)
- [ ] Lighthouse SEO audit scores 90+ across all pages
- [ ] Hreflang tags present for multi-language sites

### Max Response Length
150 lines unless generating full sitemap or multiple JSON-LD blocks.

## Workflow

### Step 1: Audit Current State
Check existing `<head>` for title, description, OG, Twitter cards, canonical. Run one Lighthouse SEO audit to baseline:

```bash
npx lighthouse https://example.com --view --preset=desktop
```

Identify missing or duplicate tags. Check `robots.txt` and `sitemap.xml` existence.

### Step 2: Implement Base Meta Tags
Every page must have:
```html
<title>Primary Keyword — Secondary Keyword | Site Name</title>
<meta name="description" content="Compelling value prop with keyword, 150-160 chars." />
<link rel="canonical" href="https://example.com/current-path" />
<meta name="robots" content="index, follow" />
```

| Tag | Requirement | Character Limit |
|-----|-------------|-----------------|
| `title` | Unique per page, includes keyword | 50-60 |
| `description` | Unique per page, CTA + value prop | 150-160 |
| `canonical` | Absolute URL, no trailing slash mismatch | — |
| `robots` | `index, follow` for public pages | — |

### Step 3: Add Social Graph Tags
```html
<meta property="og:title" content="Primary Keyword — Site Name" />
<meta property="og:description" content="Compelling description." />
<meta property="og:image" content="https://example.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://example.com/page" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@yourhandle" />
```

### Step 4: Inject Structured Data (JSON-LD)
Add at minimum: `Organization` (homepage), `BreadcrumbList` (every page), content-specific types.

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

### Step 5: Configure Sitemap & Robots
Generate `sitemap.xml` with all public URLs. Create `robots.txt`:

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /login
Sitemap: https://example.com/sitemap.xml
```

### Step 6: Implement SSR/SSG
Ensure crawlers receive server-rendered HTML. Use framework head management for dynamic meta tags:

| Framework | Meta API | Sitemap API |
|-----------|----------|-------------|
| Next.js App Router | `export const metadata: Metadata` | `app/sitemap.ts` |
| Nuxt 3 | `useHead()` / `nuxt.config` | `@nuxtjs/sitemap` |
| Astro | Frontmatter `head` | `src/pages/sitemap.xml.ts` |
| SvelteKit | `svelte:head` | `src/routes/sitemap.xml/+server.ts` |

### Step 7: Set Up Hreflang
```html
<link rel="alternate" hreflang="en" href="https://example.com/page" />
<link rel="alternate" hreflang="es" href="https://example.com/es/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page" />
```

### Step 8: Run Audit & Fix
```bash
npx lhci collect --url=https://example.com
npx lhci assert --preset=lighthouse:recommended
```

## Best Practices

| Area | Practice |
|------|----------|
| Title format | `Primary Keyword — Secondary Keyword | Brand` |
| OG image | 1200x630px, < 300 KB, serve via CDN |
| Canonical URL | Always absolute, no `?ref=` or tracking params |
| JSON-LD placement | `<head>` or end of `<body>` — non-blocking |
| Sitemap updates | Regenerate on content publish |
| robots.txt | Allow CSS/JS (Google needs them to render) |

## Pitfalls to Avoid

- **Duplicate titles/descriptions**: Every page must have unique values. Duplicate = cannibalization.
- **Missing canonical on paginated pages**: Each page of pagination needs its own canonical pointing to itself.
- **Blocking CSS/JS in robots.txt**: Google needs CSS/JS for rendering assessment. Only block if you know why.
- **Relative URLs in canonical/sitemap**: Always use absolute URLs with `https://`.
- **Client-only rendering for crawlers**: Googlebot executes JS but has a budget. SSR/SSG for content pages.
- **Overly large sitemaps**: Max 50,000 URLs or 50 MB per sitemap. Use sitemap index if exceeded.
- **No `lastmod` in sitemap**: Helps Google understand freshness. Always include.

## Rules
- Never use `noindex` on public pages unless explicitly requested
- Always set `canonical` URL to the preferred version (no trailing slash inconsistency, no `?ref=` params)
- Never block CSS or JS files in robots.txt — Google needs them for rendering
- Always use absolute URLs in canonical tags, sitemaps, and JSON-LD `@id` fields
- Never duplicate `hreflang` tags — one per language variant, with self-referencing
- Always use `application/ld+json` script tag for structured data — never JSON-LD in HTML attributes
- Never include session IDs, tracking params, or filter params in canonical URLs
- Always validate JSON-LD with Google Rich Results Test before deploying

## References
- `references/meta-tags.md` — Title, description, OG, Twitter Cards, hreflang
- `references/ssr-seo.md` — SSR/SSG strategies, Core Web Vitals, framework-specific meta APIs
- `references/structured-data.md`
- `references/sitemap.md`
- `references/performance-seo.md`

## Handoff
No artifact produced unless requested.
Next skill: `frontend-pwa` (if the app needs offline PWA capabilities alongside SEO)
Carry forward: Canonical URL pattern, current meta tags, JSON-LD schema decisions

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
