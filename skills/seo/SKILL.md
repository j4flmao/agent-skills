# SEO Skill

## Overview
Search Engine Optimization improves website visibility in search results. This skill covers technical SEO, on-page optimization, structured data, content strategy, and performance optimization.

## Decision Tree: SEO Strategy

### SEO Priority by Site Type
```
What kind of site?
├── E-commerce → Product schema, reviews, images, category optimization (highest ROI)
├── Blog/Content → Content quality, keyword research, internal linking, readability
├── SaaS/Landing page → Technical SEO, Core Web Vitals, conversion optimization
├── Local business → Google Business Profile, local schema, location pages
├── Marketplace → Unique product descriptions, category hierarchy, faceted navigation
└── Enterprise/Portal → Site architecture, crawl efficiency, duplicate content resolution
```

### Indexing Decision
```
Should this page be indexed?
├── Public, useful content → index, follow (default for most pages)
├── Thin content / duplicate → noindex, follow (don't waste crawl budget)
├── Admin, login, internal tools → noindex, nofollow (private pages)
├── Search results pages → noindex (prevents infinite indexation)
├── Filtered/faceted URLs with parameters → noindex or canonical to parent
├── Paginated pages (page 2, 3...) → index (with rel=prev/next or view all)
├── Thank-you / confirmation pages → noindex (no user value)
└── PDF files → index if content-rich, noindex if thin
```

## Technical SEO

### Core Web Vitals Optimization
```
LCP (Largest Contentful Paint) — target < 2.5s:
  - Optimize images (WebP, responsive sizes, lazy loading)
  - Preload hero images / LCP element
  - Minimize render-blocking resources
  - Use CDN with good time-to-first-byte
  - Remove large layout shifting elements

FID (First Input Delay) — target < 100ms:
  - Code-split JavaScript (reduce main thread work)
  - Defer non-critical scripts
  - Minimize polyfills for modern browsers
  - Use web workers for heavy computation

CLS (Cumulative Layout Shift) — target < 0.1:
  - Set explicit width/height on images and embeds
  - Reserve space for ads and dynamic content
  - Use font-display: swap with appropriate fallback sizes
  - Avoid inserting content above existing content after load
  - Use transform animations instead of layout-triggering properties
```

### Robots.txt Patterns
```
# Allow all
User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml

# Block admin and API
User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /*.pdf$
Allow: /
Sitemap: https://example.com/sitemap.xml

# Block specific crawler
User-agent: GPTBot
Disallow: /

# Crawl-delay for large sites
User-agent: *
Crawl-delay: 10
Allow: /
```

### Sitemap Strategy
```javascript
function generateSitemap(pages) {
  const urls = pages.map((page) => `
    <url>
      <loc>${escapeXml(page.url)}</loc>
      <lastmod>${page.lastModified || new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>${page.changeFreq || 'weekly'}</changefreq>
      <priority>${page.priority || 0.5}</priority>
      ${page.images?.map((img) => `
        <image:image>
          <image:loc>${escapeXml(img.url)}</image:loc>
          <image:title>${escapeXml(img.title)}</image:title>
        </image:image>
      `).join('') || ''}
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
      ${urls}
    </urlset>`;
}
```

### Sitemap Index for Large Sites
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2025-06-01</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-blog.xml</loc>
    <lastmod>2025-06-01</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-categories.xml</loc>
    <lastmod>2025-06-01</lastmod>
  </sitemap>
</sitemapindex>
```

## Structured Data

### Schema Selection Decision Tree
```
What is this page about?
├── Product → Product + Offer + AggregateRating + Review
├── Article/Blog → Article + BreadcrumbList
├── Local business → LocalBusiness + OpeningHours + GeoCoordinates
├── Event → Event + Place + Offer
├── Recipe → Recipe + NutritionInformation + Video
├── FAQ → FAQPage (question/answer pairs)
├── How-to → HowTo (step-by-step with images)
├── Video → VideoObject (with watch-action)
├── Course → Course + EducationalOccupationalCredential
├── Job posting → JobPosting + Organization
├── Software app → SoftwareApplication + AggregateRating
└── Organization → Organization + ContactPoint + SocialMediaPosting
```

### Product Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Bluetooth Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "sku": "WBH-2024-001",
  "mpn": "WBH-001",
  "brand": {
    "@type": "Brand",
    "name": "SoundMax"
  },
  "category": "Electronics/Headphones",
  "offers": [
    {
      "@type": "Offer",
      "url": "https://example.com/products/headphones",
      "priceCurrency": "USD",
      "price": "79.99",
      "priceValidUntil": "2025-12-31",
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition",
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 30,
        "returnMethod": "https://schema.org/ReturnByMail"
      }
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "234",
    "bestRating": "5"
  },
  "image": "https://example.com/images/headphones.jpg"
}
</script>
```

## On-Page SEO

### Title and Meta Patterns
```
Title tag: 50-60 characters
  Primary Keyword | Brand Name
  Primary Keyword - Secondary Keyword | Brand
  [Action] [Topic]: [Benefit]

Meta description: 150-160 characters
  Include primary keyword naturally
  Include call to action
  Differentiate from competitors
  Match search intent

URL structure:
  /category/product-name         (e-commerce)
  /blog/post-slug                (blog)
  /services/service-name         (services)
  /locations/city/service        (local)
```

## Content Strategy

### Keyword Research Decision
```
What stage of the funnel?
├── Informational (top of funnel) → Long-tail questions, how-to guides, blog posts
│   Search intent: "how to fix leaky faucet"
├── Commercial investigation (middle) → Comparison guides, best-of lists, reviews
│   Search intent: "best wireless headphones 2025"
├── Transactional (bottom) → Product pages, pricing, buy now
│   Search intent: "buy sony wh-1000xm5"
└── Navigation → Brand terms, specific product names
    Search intent: "example.com login"
```

### Internal Linking Pattern
```html
<!-- Breadcrumb → linked navigation -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/electronics">Electronics</a></li>
    <li><a href="/electronics/headphones">Headphones</a></li>
    <li aria-current="page">Wireless Bluetooth Headphones</li>
  </ol>
</nav>

<!-- Contextual links in content -->
<p>Our <a href="/noise-cancelling-headphones">noise-cancelling technology</a>
ensures crystal-clear audio even in noisy environments.
Compare with our <a href="/wired-headphones">wired headphones</a> for studio use.</p>
```

## Key Anti-Patterns
- **Keyword stuffing**: Natural language over repetition
- **Duplicate content across pages**: Use canonical tags or unique content
- **Hidden text / cloaking**: Search engines penalize these heavily
- **Ignoring mobile usability**: Mobile-first indexing means mobile is primary
- **Slow page speed**: Direct ranking factor since 2018
- **No HTTPS**: Security signal and ranking factor
- **Thin affiliate content**: Provide genuine value beyond affiliate links
- **Broken internal links**: Wastes crawl budget and hurts user experience
- **Missing alt text**: Image search traffic + accessibility
- **Auto-generated content without value**: Panda penalty risk
- **Excessive redirect chains**: Each redirect adds latency and crawl cost
- **Blocking CSS/JS in robots.txt**: Modern crawlers need CSS/JS for rendering
- **Not monitoring search console**: Misses critical issues and opportunities
