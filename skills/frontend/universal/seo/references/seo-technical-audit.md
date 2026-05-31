# Technical SEO Audit

## Overview

A technical SEO audit evaluates how well a website can be crawled, indexed, and rendered by search engines. It covers crawlability, indexability, site structure, Core Web Vitals, structured data, mobile-friendliness, internationalization, and security. This reference provides a complete audit methodology, tooling configuration, and remediation strategies.

## Audit Framework

### Audit Phases

```
Phase 1: Crawl Analysis
  ├── robots.txt validation
  ├── Sitemap validation
  ├── Internal link structure
  └── Crawl budget analysis

Phase 2: Index Analysis
  ├── Meta robots tags
  ├── Canonical URLs
  ├── Duplicate content detection
  ├── Orphan pages
  └── Thin content pages

Phase 3: Rendering Analysis
  ├── SSR/CSR detection
  ├── JavaScript execution
  ├── Lazy-loaded content
  └── Core Web Vitals

Phase 4: Structured Data
  ├── JSON-LD validation
  ├── Schema.org compliance
  ├── Rich result eligibility
  └── Breadcrumb markup

Phase 5: Technical Signals
  ├── HTTPS/SSL validation
  ├── Mobile-friendliness
  ├── Page speed
  ├── Hreflang implementation
  └── Internationalization
```

## Automated Audit Tools

### Lighthouse CI

```yaml
# lighthouserc.yml
ci:
  collect:
    numberOfRuns: 3
    startServerCommand: npm run preview
    url:
      - https://example.com/
      - https://example.com/about
      - https://example.com/products
      - https://example.com/blog/post-1
  assert:
    preset: lighthouse:no-throttling
    assertions:
      categories:seo: ['error', { minScore: 0.9 }]
      categories:performance: ['warn', { minScore: 0.8 }]
      categories:accessibility: ['warn', { minScore: 0.9 }]
  upload:
    target: temporary-public-storage
```

```bash
# Run audit
npx lhci autorun

# Or collect and assert separately
npx lhci collect
npx lhci assert
```

### Screaming Frog SEO Spider

Configuration for CLI usage:

```bash
# Crawl with default settings
screamingfrogseospider --crawl https://example.com --output-folder ./seo-audit

# Crawl with specific configuration
screamingfrogseospider \
  --crawl https://example.com \
  --thread-count 10 \
  --crawl-duration 120 \
  --save-report ./seo-audit/report.csv
```

### Sitebulb

```bash
# CLI audit
sitebulb https://example.com --output ./seo-audit --strategy "technical-seo"
```

## robots.txt Audit

### Validation Checklist

```
- [ ] robots.txt exists at /robots.txt
- [ ] Returns 200 (not 404 or 301)
- [ ] Allows Googlebot access to CSS/JS
- [ ] Disallows admin, staging, internal paths
- [ ] References sitemap URL
- [ ] No conflicting directives
- [ ] Clean syntax (no unclosed groups)
- [ ] User-agent * covers all crawlers
```

### Example robots.txt

```txt
User-agent: *
Allow: /
Allow: /assets/
Allow: /styles/
Allow: /scripts/
Disallow: /admin/
Disallow: /api/
Disallow: /login/
Disallow: /cart/
Disallow: /checkout/
Disallow: /*?session=
Disallow: /*?ref=
Sitemap: https://example.com/sitemap.xml
```

### Testing robots.txt

```bash
# Google's robots.txt tester via Search Console
# Or use curl to verify
curl -v https://example.com/robots.txt

# Simulate Googlebot access
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  -I https://example.com/admin/
```

## Sitemap Audit

### Validation Checklist

```
- [ ] Sitemap referenced in robots.txt
- [ ] Submitted to Google Search Console
- [ ] XML is well-formed
- [ ] Contains only indexable URLs (no pagination, no filter pages)
- [ ] Uses absolute URLs with https
- [ ] <lastmod> dates are accurate
- [ ] <changefreq> is set realistically
- [ ] <priority> reflects page importance
- [ ] Max 50,000 URLs per sitemap
- [ ] Sitemap index used if >50,000 URLs
- [ ] No 3xx or 4xx URLs in sitemap
- [ ] Confirms to schema.org/Sitemap protocol
```

### Generating Sitemap Programmatically

```typescript
// next-sitemap.config.js (Next.js)
module.exports = {
  siteUrl: 'https://example.com',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/admin/*', '/api/*', '/login'],
  alternateRefs: [
    { href: 'https://es.example.com', hreflang: 'es' },
    { href: 'https://fr.example.com', hreflang: 'fr' },
  ],
  transform: async (config, path) => {
    // Custom per-path logic
    if (path === '/') return { loc: path, changefreq: 'daily', priority: 1.0 }
    if (path.startsWith('/blog')) return { loc: path, changefreq: 'weekly', priority: 0.8 }
    return { loc: path, changefreq: config.changefreq, priority: config.priority }
  },
}
```

### Sitemap Index

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2024-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2024-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-blog.xml</loc>
    <lastmod>2024-01-15</lastmod>
  </sitemap>
</sitemapindex>
```

## Canonical URL Audit

### Rules

```
- Every page has a self-referencing canonical (or points to preferred version)
- No trailing slash inconsistency (https://example.com/page vs https://example.com/page/)
- No query parameters in canonical (except when needed for pagination)
- Absolute URLs only (never relative)
- Case sensitivity consistent (use lowercase)
- www vs non-www consistent across site
- HTTP vs HTTPS — always use HTTPS
```

### Common Issues

```html
<!-- BAD: Missing canonical -->
<html>
<head>
  <title>Page Title</title>
</head>

<!-- BAD: Relative URL -->
<link rel="canonical" href="/page" />

<!-- BAD: With tracking params -->
<link rel="canonical" href="https://example.com/page?utm_source=google" />

<!-- BAD: Wrong protocol -->
<link rel="canonical" href="http://example.com/page" />

<!-- GOOD: Self-referencing, absolute, clean -->
<link rel="canonical" href="https://example.com/page" />
```

## Duplicate Content Detection

### Types of Duplicates

```
1. Exact duplicates (same content, different URLs)
   - WWW vs non-www
   - HTTP vs HTTPS
   - Trailing slash vs no slash
   - UTM tracking params
   - Session IDs

2. Near duplicates (very similar content)
   - Paginated pages with thin content
   - Product pages with minimal variation
   - Tag/category pages with overlapping content
   - Printer-friendly versions

3. Cross-domain duplicates
   - Syndicated content
   - Scraped content
   - Mirror sites
```

### Detection Script

```bash
# Using Screaming Frog CSV output
# Check for duplicate titles
awk -F',' 'NR>1{print $4}' seo-audit.csv | sort | uniq -d

# Check for duplicate meta descriptions
awk -F',' 'NR>1{print $5}' seo-audit.csv | sort | uniq -d

# Check for similar content (requires content extraction tool)
```

## Core Web Vitals Audit

### Metrics

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4.0s | > 4.0s |
| FID | < 100ms | 100ms - 300ms | > 300ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| INP (2024) | < 200ms | 200ms - 500ms | > 500ms |
| TTFB | < 800ms | 800ms - 1.8s | > 1.8s |

### Field Data Collection

```javascript
// Collect Core Web Vitals data
import { onLCP, onFID, onCLS, onINP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric) {
  const body = JSON.stringify(metric)
  navigator.sendBeacon('/api/vitals', body)
}

onLCP(sendToAnalytics)
onFID(sendToAnalytics)
onCLS(sendToAnalytics)
onINP(sendToAnalytics)
onTTFB(sendToAnalytics)
```

### Lab Testing

```bash
# Lighthouse with specific throttling
npx lighthouse https://example.com --view --preset=desktop --throttling-method=simulate

# WebPageTest CLI
webpagetest test https://example.com --location Dulles:Chrome --firstViewOnly

# PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile"
```

## Structured Data Audit

### Validation

```bash
# Google Rich Results Test API
curl -X POST "https://search.google.com/test/rich-results/api" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'

# Schema.org validator
curl -X POST "https://validator.schema.org/validate" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'
```

### Common Validation Errors

```
1. Missing @context or @type
2. Invalid enum values (e.g., wrong Offer type)
3. Missing required properties
4. Incorrect property nesting
5. URL format issues (relative vs absolute)
6. Image URL not accessible
7. Date format not ISO 8601
8. Multiple conflicting schemas on same page
```

## Mobile-Friendliness Audit

### Checklist

```
- [ ] Viewport meta tag with width=device-width
- [ ] Tap targets at least 48x48px with 4px spacing
- [ ] Font size minimum 16px (prevents zoom on input focus)
- [ ] Content width matches viewport (no horizontal scroll)
- [ ] All functionality available on touch
- [ ] No interstitials that block content
- [ ] Images scale with viewport
- [ ] Tables are responsive
- [ ] Forms usable on mobile
- [ ] Accelerated Mobile Pages (if applicable) valid
```

### Testing

```bash
# Google Mobile-Friendly Test
curl "https://search.google.com/test/mobile-friendly/result?id=..."

# Chrome DevTools device emulation
# lighthouse with mobile preset
npx lighthouse https://example.com --view --preset=mobile
```

## Internationalization Audit

### Hreflang Validation

```html
<!-- Correct implementation -->
<link rel="alternate" hreflang="en" href="https://example.com/page" />
<link rel="alternate" hreflang="es" href="https://example.com/es/page" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page" />
```

### Common Hreflang Errors

```
1. Missing return-tags (page A links to page B, but page B doesn't link back)
2. Incorrect language codes (use ISO 639-1, not "english" or "en-us")
3. Missing x-default tag
4. Conflicting hreflang declarations (HTML vs HTTP headers vs sitemap)
5. Broken hreflang URLs (return 4xx or 5xx)
6. URLs in hreflang don't match actual page content language
```

### Sitemap with Hreflang

```xml
<url>
  <loc>https://example.com/page</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://example.com/page" />
  <xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/page" />
  <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
  <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/page" />
</url>
```

## Log File Analysis

### Key Metrics

```bash
# Crawl frequency
grep "Googlebot" access.log | awk '{print $4}' | cut -d: -f1 | sort | uniq -c

# Crawl status codes
grep "Googlebot" access.log | awk '{print $9}' | sort | uniq -c | sort -rn

# Most crawled URLs
grep "Googlebot" access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -20

# Crawl budget waste (non-indexable pages)
grep "Googlebot" access.log | grep -E " /admin/| /api/| /login" | awk '{print $7}' | sort -u | wc -l
```

### Crawl Budget Optimization

```
- Block non-indexable paths in robots.txt (not just noindex)
- Fix 404/5xx errors that waste crawl budget
- Prioritize high-value pages in sitemap
- Use appropriate crawl rate in Search Console
- Implement canonical URLs to consolidate duplicate pages
- Reduce redirect chains (max 3 hops)
```

## Index Coverage Analysis

### Google Search Console API

```typescript
// Fetch index coverage data
const response = await fetch(
  'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inspectionUrl: 'https://example.com/page',
      siteUrl: 'sc:https://example.com/',
    }),
  }
)
```

### Coverage Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| Submitted and indexed | Success | None |
| Submitted not indexed | Queue delay | Wait or improve quality |
| Discovered not indexed | Found but not crawled | Improve internal linking |
| Crawled not indexed | Crawled but excluded | Check noindex, canonical, content quality |
| Excluded | Removed from index | Review if intended |
| Error | Blocked from index | Fix technical issue |
| Duplicate | Similar to another page | Implement canonical |

## Performance Monitoring

### Continuous Monitoring Setup

```yaml
# .github/workflows/seo-audit.yml
name: SEO Audit
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}
      - name: Check sitemap
        run: |
          curl -f https://example.com/sitemap.xml > /dev/null
          curl -f https://example.com/robots.txt > /dev/null
      - name: Validate structured data
        run: npx structured-data-testing-tool https://example.com
```

## Remediation Priority

### Critical (Fix Immediately)

```
1. Site not indexable (meta noindex or blocked in robots.txt)
2. Site returning 5xx errors
3. HTTPS issues (mixed content, expired certificate)
4. Site hacked or spam content detected
5. Critical Core Web Vitals failures (LCP > 4s, CLS > 0.25)
```

### High (Fix Within Week)

```
6. Missing or incorrect canonical URLs
7. Duplicate title/meta description clusters
8. Orphan pages not linked from anywhere
9. Broken internal links (4xx)
10. Redirect chains more than 3 hops
11. Missing sitemap or sitemap has errors
12. Mobile usability issues
13. Thin content pages (< 300 words for informational)
```

### Medium (Fix Within Month)

```
14. Missing Open Graph / Twitter Card tags
15. Missing or incomplete JSON-LD
16. Pagination without rel next/prev
17. Slow pages (LCP 2.5-4s)
18. Images missing alt text
19. Hreflang implementation errors
20. Missing or incorrect hreflang return tags
```

### Low (Monitor)

```
21. Low-value pages indexed (tag pages, filter pages)
22. Nofollow on internal links
23. Image file sizes large (> 200KB)
24. Missing schema markup for non-critical types
25. Non-HTTPS internal links
```

## Audit Report Template

```markdown
# SEO Audit Report: example.com
Date: 2024-01-15
Tool: Lighthouse CI + Screaming Frog

## Summary
- Total URLs crawled: 1,234
- Indexable URLs: 1,100
- Non-indexable URLs: 134
- Errors: 23
- Warnings: 89

## Critical Issues
1. 15 pages returning 404 errors
2. 3 pages with missing canonical tags
3. Homepage LCP: 4.2s (poor)

## High Priority
1. 45 duplicate title tags
2. 12 orphan pages
3. Missing schema markup on product pages

## Improvements
- Sitemap: valid, 2,400 URLs
- robots.txt: valid
- HTTPS: valid, all pages
- Mobile: 98% pages pass mobile test
```

## API Endpoint SEO Check

```typescript
async function runSEOAudit(url: string): Promise<AuditResult> {
  const response = await fetch(url)
  const html = await response.text()
  const audit: AuditResult = { url, passed: [], failed: [], warnings: [] }

  // Check robots meta
  const robotsMatch = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)
  if (robotsMatch && robotsMatch[1].includes('noindex')) {
    audit.failed.push({ rule: 'robots-noindex', message: 'Page has noindex directive' })
  }

  // Check title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (!titleMatch) {
    audit.failed.push({ rule: 'missing-title', message: 'No title tag found' })
  } else if (titleMatch[1].length > 60) {
    audit.warnings.push({ rule: 'title-long', message: `Title too long: ${titleMatch[1].length} chars` })
  }

  // Check meta description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
  if (!descMatch) {
    audit.failed.push({ rule: 'missing-description', message: 'No meta description found' })
  }

  // Check canonical
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)
  if (!canonicalMatch) {
    audit.warnings.push({ rule: 'missing-canonical', message: 'No canonical URL' })
  }

  // Check Open Graph
  if (!html.includes('property="og:title"')) {
    audit.warnings.push({ rule: 'missing-og', message: 'No Open Graph tags' })
  }

  // Check JSON-LD
  if (!html.includes('application/ld+json')) {
    audit.warnings.push({ rule: 'missing-jsonld', message: 'No structured data found' })
  }

  // Check viewport
  if (!html.includes('name="viewport"')) {
    audit.failed.push({ rule: 'missing-viewport', message: 'No viewport meta tag' })
  }

  return audit
}

runSEOAudit('https://example.com/page').then(console.log)
```
