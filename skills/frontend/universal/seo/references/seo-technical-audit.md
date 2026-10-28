# Technical SEO Audit Methodology

A repeatable process for auditing how well a site can be crawled, rendered and indexed, with tools, checks per phase, and remediation priorities. Performance specifics are in `performance-seo.md`; structured data in `structured-data.md`; sitemaps in `sitemap.md`.

## Audit Phases

| Phase | Question | Main sources |
|-------|----------|--------------|
| 1. Crawlability | Can bots discover and fetch URLs? | robots.txt, sitemaps, crawler, server logs |
| 2. Indexability | Are the right URLs eligible and chosen for the index? | Meta robots, canonicals, Search Console Page indexing report |
| 3. Rendering | Does the rendered HTML contain the content and links? | URL Inspection (rendered HTML), crawler with JS rendering |
| 4. Site architecture | Are important pages well linked and shallow? | Crawl depth, internal link counts, orphan detection |
| 5. Page experience | Are pages fast, stable, mobile-friendly, secure? | CrUX/Search Console, Lighthouse |
| 6. Structured data and international | Valid markup, correct hreflang? | Rich Results Test, Schema validator, crawler |

## Tooling

| Tool | Purpose |
|------|---------|
| Google Search Console | Indexing status, crawl stats, Core Web Vitals, URL Inspection, sitemaps |
| Bing Webmaster Tools | Bing indexing, IndexNow, site scan |
| Desktop/cloud crawlers (Screaming Frog, Sitebulb, Lumar, JetOctopus) | Full-site crawls with JS rendering |
| Lighthouse / Lighthouse CI | Lab performance and basic SEO checks |
| Server log analysis | What bots actually request, status codes, crawl frequency |
| Rich Results Test, Schema Markup Validator | Structured data |

Lighthouse CI config with SEO budget:

```yaml
# lighthouserc.yml
ci:
  collect:
    numberOfRuns: 3
    startServerCommand: npm run start
    url:
      - http://localhost:3000/
      - http://localhost:3000/products/example
      - http://localhost:3000/blog/example-post
  assert:
    assertions:
      categories:seo: ["error", { minScore: 0.9 }]
      categories:performance: ["warn", { minScore: 0.8 }]
      largest-contentful-paint: ["warn", { maxNumericValue: 2500 }]
      cumulative-layout-shift: ["error", { maxNumericValue: 0.1 }]
```

Lighthouse's SEO category checks basics (title, meta description, crawlable links, status code, `hreflang` validity); it is not a full audit.

## Phase 1: Crawlability

robots.txt checks:
- Served at `/robots.txt` with status 200 (a 5xx can cause Google to pause crawling; a 404 means "no restrictions").
- Does not block CSS/JS needed for rendering.
- Blocks only what should not be crawled (internal search results, faceted combinations, admin). Remember: robots.txt prevents crawling, not indexing; use `noindex` for pages that must not appear in results (and do not block them, or the bot cannot see the `noindex`).
- References the sitemap(s): `Sitemap: https://www.example.com/sitemap.xml`.

```txt
User-agent: *
Disallow: /cart
Disallow: /search
Allow: /

Sitemap: https://www.example.com/sitemap.xml
```

Sitemap checks: only canonical, indexable, 200-status URLs; under 50,000 URLs or 50 MB uncompressed per file (use a sitemap index otherwise); accurate `lastmod`.

Server logs: confirm Googlebot (verified by reverse DNS) reaches important sections, and find crawl waste on parameters, redirects and errors.

## Phase 2: Indexability

| Check | Problem signal |
|-------|----------------|
| `<meta name="robots" content="noindex">` or `X-Robots-Tag` header | Accidentally on important pages (often left from staging) |
| Canonical tags | Missing, pointing to non-200 URLs, chains, or to different content |
| Duplicate content | HTTP/HTTPS, www/non-www, trailing slash, parameter variants without canonicalization |
| Thin or near-duplicate pages | Faceted pages, tag pages with little content |
| Soft 404s | 200 status with "not found" content |
| Redirect chains/loops | More than one hop; mixed 302/301 |

Search Console's Page indexing report explains why URLs are not indexed ("Crawled - currently not indexed", "Duplicate without user-selected canonical", and so on).

## Phase 3: Rendering

- Compare raw HTML (view-source / curl) with rendered HTML (URL Inspection, crawler with JS rendering).
- Critical content, links, title, canonical and structured data should be in the raw HTML when possible.
- Check that blocked resources, failed API calls or consent walls do not hide content from bots.
- Ensure client-side routing updates titles/canonicals and that every route works on direct load (no 404 on refresh).

```bash
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://www.example.com/products/example | grep -iE "<title>|canonical|robots"
```

## Phase 4: Architecture and Internal Linking

- Important pages within a few clicks of the homepage.
- No orphan pages (in sitemap but not linked internally).
- Descriptive anchor text; breadcrumb navigation with markup.
- Pagination using normal links to subsequent pages (Google no longer uses `rel=prev/next` as an indexing signal).
- Faceted navigation controlled: canonicalize or `noindex` low-value combinations; avoid infinite URL spaces.

## Phase 5: Page Experience and Security

- Core Web Vitals passing for main templates (field data).
- HTTPS everywhere, HSTS, no mixed content; HTTP redirects to HTTPS in one hop.
- Mobile-friendly responsive layout with viewport meta tag.
- No intrusive interstitials on mobile.

## Phase 6: Structured Data and Internationalization

- JSON-LD validated with Rich Results Test; markup matches visible content.
- hreflang: reciprocal annotations, self-reference, valid language-region codes (`en-GB`, not `en-UK`), `x-default` for selectors; each hreflang URL returns 200 and is canonical.

```html
<link rel="alternate" hreflang="en-us" href="https://www.example.com/us/" />
<link rel="alternate" hreflang="en-gb" href="https://www.example.com/uk/" />
<link rel="alternate" hreflang="x-default" href="https://www.example.com/" />
```

## Prioritizing Findings

| Priority | Examples |
|----------|----------|
| Critical | Site-wide `noindex`, robots.txt blocking everything, broken canonical to homepage, 5xx on key templates |
| High | Important templates not rendering content server-side, large-scale duplicate URLs, redirect chains on main navigation |
| Medium | Missing structured data, slow LCP on key templates, orphan pages |
| Low | Missing alt text on decorative images, minor meta description issues |

Report each finding with affected URL count, evidence, fix, and owner. Re-crawl after fixes and monitor Search Console.

## Preventing Regressions

- CI checks: Lighthouse CI budgets, tests that key routes return 200 with expected title/canonical/robots tags.
- Block `noindex` and `Disallow: /` from leaking from staging to production (environment-specific config, deploy checks).
- Monitor Search Console coverage and Core Web Vitals reports; alert on sudden drops in indexed pages.

## Checklist

- [ ] robots.txt and sitemaps valid and consistent
- [ ] No accidental `noindex`; canonicals correct and self-consistent
- [ ] Content and links present in raw or reliably rendered HTML
- [ ] Shallow architecture, no orphans, controlled facets
- [ ] Core Web Vitals and HTTPS passing on main templates
- [ ] Structured data and hreflang validated
- [ ] Findings prioritized with owners; CI and monitoring guard regressions
