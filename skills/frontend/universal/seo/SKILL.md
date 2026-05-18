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
Optimize web applications for search engine ranking and rich snippet eligibility through meta tags, structured data, sitemaps, and SSR-friendly rendering.

## Agent Protocol

### Trigger
Exact phrases: "seo", "meta tags", "open graph", "og tags", "structured data", "json-ld", "schema.org", "sitemap", "robots.txt", "canonical url", "seo audit", "seo optimization", "ssr seo", "rich results"

### Input Context
- Check for existing `<head>` meta tag patterns and SSR framework (Next.js, Nuxt, Astro, SvelteKit, Remix)
- Determine if a sitemap (`sitemap.xml`) or robots.txt already exists
- Identify the routing library for canonical URL generation
- Verify whether structured data (JSON-LD) is already present

### Output Artifact
No file output unless requested.

### Response Format
1. Output complete HTML `<head>` snippet for meta tags — never abbreviate with `<!-- ... -->`.
2. Output full JSON-LD blocks — never truncate with ellipsis.
3. For sitemaps, output the full XML structure with at least 3 example `<url>` entries.
4. For robots.txt, output the complete file.
5. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

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

### Max Response Length
150 lines unless generating full sitemap or multiple JSON-LD blocks.

## Workflow

### Step 1: Audit Current State
Check existing `<head>` for title, description, OG, Twitter cards, canonical. Run a single Lighthouse SEO audit to baseline. Identify missing or duplicate tags.

### Step 2: Implement Base Meta Tags
Add `<title>` (unique per page, 50-60 chars), `<meta name="description">` (150-160 chars, includes target keyword), `<meta name="viewport">`, `<meta charset="UTF-8">`. Ensure title format: `Primary Keyword — Site Name`.

### Step 3: Add Social Graph Tags
Add `og:title`, `og:description`, `og:image` (1200x630px, < 300 KB), `og:url`, `og:type` (`website` or `article`). Add `twitter:card` (`summary_large_image`), `twitter:site`, `twitter:title`, `twitter:description`. Image must have `og:image:width` and `og:image:height`.

### Step 4: Inject Structured Data
Add JSON-LD in `<head>` or at the end of `<body>`. Cover: `Organization` (homepage), `BreadcrumbList` (every page), `Article` or `Product` (content pages), `FAQPage` (FAQ pages). Validate with Google Rich Results Test.

### Step 5: Configure Sitemap & Robots
Generate `sitemap.xml` with all public URLs, last modified dates, change frequencies. Create `robots.txt` with `Allow`, `Disallow`, and `Sitemap` directives. Submit sitemap to Google Search Console.

## Rules
- Never use `noindex` on public pages unless explicitly requested.
- Always set `canonical` URL to the preferred version (no trailing slash inconsistency, no `?ref=` params).
- Never block CSS or JS files in robots.txt — Google needs them for rendering.
- Always use absolute URLs in canonical tags, sitemaps, and JSON-LD `@id` fields.
- Never duplicate `hreflang` tags — one per language variant, with self-referencing.
- Always use `application/ld+json` script tag for structured data — never JSON-LD in HTML attributes.
- Never include session IDs, tracking params, or filter params in canonical URLs.

## References
- `references/meta-tags.md`
- `references/structured-data.md`
- `references/sitemap.md`
- `references/performance-seo.md`

## Handoff
No artifact produced unless requested.
Next skill: `frontend-pwa` (if the app needs offline PWA capabilities alongside SEO)
Carry forward: Canonical URL pattern, current meta tags, JSON-LD schema decisions
