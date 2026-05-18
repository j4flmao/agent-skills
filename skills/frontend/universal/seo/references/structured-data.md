# Structured Data Reference

## JSON-LD Format

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "AcmeApp",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png"
}
</script>
```

## Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://example.com/#organization",
  "name": "AcmeApp",
  "url": "https://example.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://example.com/logo.png",
    "width": 512,
    "height": 512
  },
  "sameAs": [
    "https://twitter.com/acmeapp",
    "https://linkedin.com/company/acmeapp",
    "https://github.com/acmeapp"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-555-0199",
    "contactType": "customer service",
    "availableLanguage": ["English"]
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94105",
    "addressCountry": "US"
  }
}
```

## WebSite + SearchAction

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://example.com/#website",
  "url": "https://example.com",
  "name": "AcmeApp",
  "publisher": {
    "@id": "https://example.com/#organization"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

## BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": "https://example.com/orders/123#breadcrumb",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Dashboard",
      "item": "https://example.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Orders",
      "item": "https://example.com/orders"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Order #123",
      "item": "https://example.com/orders/123"
    }
  ]
}
```

## Article

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://example.com/blog/post-title#article",
  "headline": "How to Optimize Order Management",
  "description": "Learn best practices for managing orders efficiently.",
  "image": {
    "@type": "ImageObject",
    "url": "https://example.com/images/article-hero.jpg",
    "width": 1200,
    "height": 630
  },
  "author": {
    "@type": "Person",
    "@id": "https://example.com/authors/jane#person",
    "name": "Jane Smith",
    "url": "https://example.com/authors/jane"
  },
  "publisher": {
    "@id": "https://example.com/#organization"
  },
  "datePublished": "2026-05-18T10:00:00Z",
  "dateModified": "2026-05-18T14:30:00Z",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/blog/post-title"
  },
  "wordCount": 1200
}
```

## FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://example.com/faq#faq",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I create an order?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Navigate to the Orders section and click 'New Order'. Fill in the required fields and submit."
      }
    },
    {
      "@type": "Question",
      "name": "What payment methods do you support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We support credit cards, PayPal, and bank transfers."
      }
    }
  ]
}
```

## Product

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://example.com/products/order-manager#product",
  "name": "Order Manager Pro",
  "description": "Enterprise-grade order management platform.",
  "image": "https://example.com/images/product.png",
  "brand": {
    "@type": "Brand",
    "name": "AcmeApp"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/order-manager",
    "priceCurrency": "USD",
    "price": "29.99",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "AcmeApp"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "234"
  }
}
```

## LocalBusiness

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com/#business",
  "name": "AcmeApp HQ",
  "image": "https://example.com/images/storefront.jpg",
  "telephone": "+1-800-555-0199",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94105",
    "addressCountry": "US"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ]
}
```

## Validation Tools

| Tool                        | URL                                                    |
|-----------------------------|--------------------------------------------------------|
| Google Rich Results Test    | https://search.google.com/test/rich-results            |
| Schema.org Validator        | https://validator.schema.org                           |
| Yoast SEO Schema Debugger   | https://yoa.st/schema-debugger                         |
| Google Search Console       | https://search.google.com/search-console               |

## Testing Checklist

- [ ] JSON-LD validates without errors in Google Rich Results Test
- [ ] `@id` fields use absolute URLs and match the page URL
- [ ] No duplicate `@type` entries on the same page
- [ ] `Organization` + `WebSite` on homepage, `BreadcrumbList` everywhere
- [ ] `Article` on blog posts includes `datePublished` and `author`
- [ ] `FAQPage` uses proper `Question`/`Answer` nesting
- [ ] `Product` includes `offers.priceCurrency`, `offers.price`, and `availability`
- [ ] All images in structured data are publicly accessible and return 200
- [ ] Breadcrumb position starts at 1, increments without gaps
