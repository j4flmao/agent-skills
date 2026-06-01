# SEO Fundamentals

## Overview
Search Engine Optimization improves organic search visibility and traffic. This reference covers meta tags, technical SEO, structured data, content strategy, and Core Web Vitals optimization.

## Meta Tags and HTML Structure

### Complete Head Configuration
```html
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Name | Brand — Best Solution for Your Needs</title>
  <meta name="description" content="Discover the best product for your needs. Features X, Y, and Z with 30-day satisfaction guarantee. Free shipping on orders over $50.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <meta name="author" content="Brand Name">
  <meta name="referrer" content="strict-origin-when-cross-origin">

  <!-- Generator meta — only for CMS/platform -->
  <meta name="generator" content="WordPress 6.4">

  <!-- Verification tags -->
  <meta name="google-site-verification" content="...">
  <meta name="msvalidate.01" content="...">

  <!-- Open Graph -->
  <meta property="og:title" content="Product Name | Brand">
  <meta property="og:description" content="Discover the best product for your needs.">
  <meta property="og:image" content="https://example.com/images/product-og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://example.com/product">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Brand Name">
  <meta property="og:locale" content="en_US">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@brand">
  <meta name="twitter:creator" content="@author">
  <meta name="twitter:title" content="Product Name | Brand">
  <meta name="twitter:description" content="Discover the best product for your needs.">
  <meta name="twitter:image" content="https://example.com/images/product-twitter.jpg">

  <!-- Canonical URL — prevents duplicate content issues -->
  <link rel="canonical" href="https://example.com/product">

  <!-- Hreflang for multi-language sites -->
  <link rel="alternate" href="https://example.com/product" hreflang="en-US">
  <link rel="alternate" href="https://example.com/es/product" hreflang="es-ES">
  <link rel="alternate" href="https://example.com/fr/product" hreflang="fr-FR">
  <link rel="alternate" href="https://example.com/product" hreflang="x-default">

  <!-- Preconnect to critical origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://cdn.example.com">

  <!-- DNS prefetch for resources -->
  <link rel="dns-prefetch" href="https://analytics.example.com">

  <!-- Preload critical resources -->
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/hero-image.webp" as="image" media="(min-width: 768px)">
  <link rel="preload" href="/critical.css" as="style">
</head>
```

### Semantic HTML Structure
```html
<body>
  <header>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/blog">Blog</a></li>
      </ul>
    </nav>
    <nav aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/products">Products</a></li>
        <li aria-current="page">Product Name</li>
      </ol>
    </nav>
  </header>

  <main>
    <article>
      <h1>Product Name — The Best Solution</h1>
      <p>Detailed product description with natural keyword usage.</p>
      <h2>Features</h2>
      <h3>Feature One</h3>
      <p>Description of feature one...</p>
      <h3>Feature Two</h3>
      <p>Description of feature two...</p>
      <h2>Specifications</h2>
      <!-- Table or definition list -->
    </article>
    <aside>
      <h2>Related Products</h2>
      <!-- Related product links -->
    </aside>
  </main>

  <footer>
    <p>&copy; 2025 Brand Name. All rights reserved.</p>
  </footer>
</body>
```

## Technical SEO

### Robots.txt
```javascript
// robots.txt generation for dynamic sites
function generateRobotsTxt(siteUrl: string, env: string) {
  const disallowPaths = ['/admin/', '/api/', '/private/', '/search/'];

  if (env === 'staging' || env === 'development') {
    return `User-agent: *
Disallow: /
`;
  }

  return `User-agent: *
${disallowPaths.map((p) => `Disallow: ${p}`).join('\n')}
Allow: /
Sitemap: ${siteUrl}/sitemap.xml

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /
`;
}
```

### Sitemap Generation
```javascript
function generateSitemap(pages: PageEntry[]): string {
  const urls = pages.map(page => `
    <url>
      <loc>${escapeXml(page.url)}</loc>
      <lastmod>${page.lastModified || new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>${page.changeFreq || 'weekly'}</changefreq>
      <priority>${page.priority || 0.5}</priority>
      ${page.images?.map(img => `
        <image:image>
          <image:loc>${escapeXml(img.url)}</image:loc>
          <image:title>${escapeXml(img.title)}</image:title>
          <image:caption>${escapeXml(img.caption || '')}</image:caption>
        </image:image>
      `).join('') || ''}
      ${page.alternates?.map(alt => `
        <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${escapeXml(alt.url)}"/>
      `).join('') || ''}
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${urls}
</urlset>`;
}
```

## Core Web Vitals

### LCP Optimization
```javascript
// Preload hero image
<link rel="preload" href="/hero-1200w.webp" as="image"
      imagesrcset="/hero-400w.webp 400w, /hero-800w.webp 800w, /hero-1200w.webp 1200w"
      imagesizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px">

// Inline critical CSS
<style>
  /* Critical above-the-fold styles */
  body { font-family: system-ui, sans-serif; margin: 0; }
  .hero { display: flex; align-items: center; min-height: 80vh; }
  .hero h1 { font-size: clamp(2rem, 5vw, 4rem); }
</style>

// Defer non-critical CSS
<link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'">
```

### CLS Prevention
```css
/* Set explicit dimensions for images */
img, video, iframe {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}

/* Reserve space for embeds and ads */
.ad-container {
  min-height: 250px;
  width: 100%;
}

/* Reserve space for fonts */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap; /* Show fallback text until font loads */
  size-adjust: 95%; /* Reduce CLS from font swap */
}
```

## Structured Data

### Product Schema (Complete)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Bluetooth Headphones",
  "description": "High-quality wireless headphones with active noise cancellation, 30-hour battery life, and comfortable over-ear design.",
  "sku": "WBH-2024-001",
  "mpn": "WBH-001",
  "gtin13": "1234567890123",
  "brand": {
    "@type": "Brand",
    "name": "SoundMax",
    "url": "https://example.com/brand/soundmax"
  },
  "category": "Electronics/Headphones",
  "color": "Matte Black",
  "material": "Aluminum, Leather, Memory Foam",
  "manufacturer": "SoundMax Technologies",
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/headphones",
    "priceCurrency": "USD",
    "price": "79.99",
    "priceValidUntil": "2025-12-31",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "US",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": 30,
      "returnMethod": "https://schema.org/ReturnByMail",
      "returnFees": "https://schema.org/FreeReturn"
    },
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "0",
        "currency": "USD"
      },
      "shippingDestination": {
        "@type": "DefinedRegion",
        "addressCountry": "US"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 0,
          "maxValue": 1,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 3,
          "maxValue": 5,
          "unitCode": "DAY"
        }
      }
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "bestRating": "5",
    "worstRating": "1",
    "ratingCount": "234",
    "reviewCount": "128"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "John D." },
      "reviewBody": "Excellent sound quality and battery life",
      "reviewRating": { "@type": "Rating", "ratingValue": "5" }
    }
  ],
  "image": "https://example.com/images/headphones.jpg"
}
</script>
```

## Key Points
- Unique title tags (50-60 chars) for every page
- Compelling meta descriptions (150-160 chars) with CTA
- Use semantic HTML structure (h1-h6, article, section, nav)
- Implement Open Graph and Twitter Card tags for social sharing
- Add structured data (JSON-LD) for rich snippets in search
- Use canonical tags to prevent duplicate content issues
- Generate XML sitemaps and submit to Google Search Console
- Create robots.txt with proper directives for crawlers
- Implement hreflang tags for multilingual sites
- Optimize page speed for Core Web Vitals (LCP, FID, CLS)
- Use descriptive alt text for images (accessibility + SEO)
- Build quality backlinks through content marketing
- Ensure mobile responsiveness (mobile-first indexing)
- Use HTTPS (security signal and ranking factor)
- Implement proper redirects (301 permanent, 302 temporary)
- Monitor search console for crawl errors and indexing issues
- Use breadcrumb navigation for internal linking
- Optimize URL structure (short, descriptive, hyphenated)
- Use lazy loading for below-the-fold images
- Implement pagination with rel=next/prev or view-all option
- Avoid duplicate content (canonical or 301 redirect)
- Monitor keyword rankings and adjust strategy
- Use internal linking to distribute page authority
- Optimize for featured snippets with clear Q&A format
- Track and improve organic click-through rate (CTR)

## Key Anti-Patterns
- Keyword stuffing in content and meta tags
- Duplicate content across pages without canonical tags
- Hidden text or cloaking (heavy Google penalties)
- Ignoring mobile usability (mobile-first indexing)
- Slow page speed (direct ranking factor)
- No HTTPS (browsers mark as not secure)
- Thin affiliate content without added value
- Broken internal links wasting crawl budget
- Missing alt text on images (missed image search traffic)
- Auto-generated low-quality content
- Excessive redirect chains
- Blocking CSS/JS in robots.txt (hurts rendering)
- Not monitoring Google Search Console
- Using outdated SEO tactics (private blog networks, paid links)
- Ignoring Core Web Vitals optimization
- Not having a sitemap for large sites
- Over-optimized anchor text (looks manipulative)
- Publishing duplicate blog content across platforms
- Not updating old content (freshness signal)
- Slow server response time (TTFB over 200ms)
