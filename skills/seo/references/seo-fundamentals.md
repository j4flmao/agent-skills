# SEO Fundamentals

## Meta Tags

```html
<!DOCTYPE html>
<html lang="en-US">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Name | Brand - Best Product for Your Needs</title>
    <meta name="description" content="Discover the best product for your needs. Features X, Y, and Z with 30-day satisfaction guarantee.">
    <meta name="robots" content="index, follow">
    <meta name="keywords" content="product, brand, best product, quality">
    <meta name="author" content="Brand Name">
    <meta name="revisit-after" content="7 days">

    <!-- Open Graph -->
    <meta property="og:title" content="Product Name | Brand">
    <meta property="og:description" content="Discover the best product for your needs.">
    <meta property="og:image" content="https://example.com/images/product-og.jpg">
    <meta property="og:url" content="https://example.com/product">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="Brand Name">
    <meta property="og:locale" content="en_US">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Product Name | Brand">
    <meta name="twitter:description" content="Discover the best product for your needs.">
    <meta name="twitter:image" content="https://example.com/images/product-twitter.jpg">

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Product Name",
        "description": "Discover the best product for your needs.",
        "image": "https://example.com/images/product.jpg",
        "brand": {
            "@type": "Brand",
            "name": "Brand Name"
        },
        "offers": {
            "@type": "Offer",
            "price": "29.99",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.5",
            "reviewCount": "128"
        }
    }
    </script>

    <!-- Canonical -->
    <link rel="canonical" href="https://example.com/product">

    <!-- Hreflang -->
    <link rel="alternate" href="https://example.com/product" hreflang="en-US">
    <link rel="alternate" href="https://example.com/es/product" hreflang="es-ES">
    <link rel="alternate" href="https://example.com/fr/product" hreflang="fr-FR">
</head>
```

## Technical SEO

```javascript
// robots.txt generation
const robotsTxt = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /*.pdf$
Sitemap: https://example.com/sitemap.xml
`;

// sitemap.xml generation
function generateSitemap(pages) {
  const urls = pages.map(page => `
    <url>
      <loc>${page.url}</loc>
      <lastmod>${page.lastModified}</lastmod>
      <changefreq>${page.changeFreq || 'weekly'}</changefreq>
      <priority>${page.priority || 0.5}</priority>
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`;
}
```

## Key Points

- Write unique title tags (50-60 chars) for each page
- Write compelling meta descriptions (150-160 chars)
- Use semantic HTML structure (h1-h6, article, section)
- Implement Open Graph and Twitter Card tags
- Add structured data (JSON-LD) for rich snippets
- Use canonical tags to prevent duplicate content
- Generate XML sitemaps and submit to search consoles
- Create robots.txt with proper directives
- Implement hreflang tags for multilingual sites
- Optimize page speed for Core Web Vitals
- Use descriptive alt text for images
- Build quality backlinks through content marketing
