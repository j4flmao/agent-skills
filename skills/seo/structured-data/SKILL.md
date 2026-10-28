---
name: seo-structured-data
description: >
  Use this skill when the user says 'structured data', 'JSON-LD', 'schema.org markup', 'rich results', 'Product schema', 'Article schema', 'BreadcrumbList', 'Organization schema', 'review stars in Google', 'Rich Results Test errors'. It implements schema.org JSON-LD that is eligible for Google rich results, renders it server-side in React/Next.js safely, and validates it in CI and Search Console. Do NOT use for: knowledge-graph/RDF modelling beyond search features, general technical SEO (use seo-fundamentals), or meta tags/Open Graph (use frontend-seo).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [seo, structured-data, json-ld, schema-org, rich-results]
---

# Structured Data (JSON-LD)

## Purpose
Structured data describes page content with the schema.org vocabulary so search engines can understand entities and show rich results (product price/availability, review stars, breadcrumbs, article info, events, recipes, videos). Google recommends JSON-LD. Markup only makes a page **eligible**; Google decides whether to show a rich result, and markup must describe content visible on the page.

## Agent Protocol

### Trigger
"json-ld", "schema.org", "structured data", "rich results", "rich snippets", "Product markup", "BreadcrumbList", "Organization logo", "Merchant listing".

### Input Context
- Page types (product, article, category, local business, event, video, recipe).
- Data available per page (price, currency, availability, ratings, author, dates).
- Rendering (SSR/SSG vs. client-only SPA) and framework.

### Output Artifact
Typed JSON-LD builders per page type, rendering component, validation step.

### Response Format
```
Page type: {type}
Schema: {@type list}
Required props: {Google-required fields present?}
Recommended props: {added}
Rendering: {server HTML|client}
Validation: {Rich Results Test / Schema Markup Validator / CI}
```

## Which Types Still Produce Rich Results
| Type | Notes |
|------|-------|
| `Product` + `Offer` / `AggregateRating` / `Review` | Product snippets and merchant listings; self-serving reviews of your own business (LocalBusiness/Organization) are not eligible for stars |
| `Article` / `NewsArticle` / `BlogPosting` | Helps title, image, date understanding |
| `BreadcrumbList` | Breadcrumb trail (shown on desktop results) |
| `Organization` | Logo, name, contact info in knowledge panels |
| `LocalBusiness` | Business details; Google Business Profile matters more |
| `Event`, `Recipe`, `VideoObject`, `JobPosting`, `Course`, `SoftwareApplication` | Type-specific features |
| `FAQPage` | Since Aug 2023 shown only for well-known authoritative government/health sites |
| `HowTo` | Rich result deprecated (2023); markup harmless but no display |

Check Google Search Central's current "Search gallery" before promising a rich result; the list changes.

## Typed Builders

```ts
// lib/schema.ts
import type { Product as SchemaProduct, WithContext, BreadcrumbList } from 'schema-dts';

export interface ProductData {
  name: string; description: string; sku: string; url: string; images: string[];
  brand: string; price: number; currency: string; inStock: boolean;
  rating?: { value: number; count: number };
}

export function productJsonLd(p: ProductData): WithContext<SchemaProduct> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku,
    image: p.images,
    brand: { '@type': 'Brand', name: p.brand },
    offers: {
      '@type': 'Offer',
      url: p.url,
      price: p.price.toFixed(2),
      priceCurrency: p.currency,
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(p.rating && p.rating.count > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating.value, reviewCount: p.rating.count } }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem', position: i + 1, name: item.name, item: item.url,
    })),
  };
}
```
`schema-dts` (Google-maintained types) catches misspelled properties at compile time.

## Rendering Safely (React / Next.js)

```tsx
// components/JsonLd.tsx — works in Server Components
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so data containing "</script>" cannot break out of the tag (XSS)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
```
```tsx
// app/products/[slug]/page.tsx
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', url: 'https://example.com/' }, { name: product.name, url: product.url }])} />
      <ProductView product={product} />
    </>
  );
}
```
- JSON-LD may live in `<head>` or `<body>`; server-render it so every crawler sees it (Google can read JS-injected JSON-LD, many others cannot).
- `react-helmet` is unmaintained; in non-Next React apps use `react-helmet-async` or render the script directly.

## Linking Entities with @id
Use stable `@id` URLs to connect entities across pages (e.g. `https://example.com/#organization` referenced as `publisher` from every Article). One `@graph` array per page is a clean way to emit several connected nodes.

## Validation
- **Rich Results Test** (Google): eligibility for Google features.
- **Schema Markup Validator** (validator.schema.org): generic schema.org validity.
- **Search Console** enhancement reports: errors/warnings at scale after deploy.
- CI: render key templates, extract `application/ld+json` blocks, `JSON.parse` them and assert required fields with a schema (e.g. zod) so regressions fail the build.

## Rules
- Markup must match visible content (price, rating, availability). Mismatch can trigger a manual action.
- Do not mark up content hidden from users or reviews you wrote about yourself.
- Keep prices/availability in sync with the page (same data source).
- Dates in ISO 8601 with timezone (`2026-10-22T09:00:00+02:00`).
- Absolute URLs for `url`, `image`, `item`.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| FAQPage on every page for "more SERP space" | Not displayed for most sites since 2023; skip |
| AggregateRating with zero reviews | Omit the property |
| Client-only injection after hydration | Server-render the script |
| Unescaped `JSON.stringify` in `dangerouslySetInnerHTML` | Escape `<` |
| Hand-written JSON strings | Typed builders |

## Checklist
- [ ] Types chosen from current Google search gallery.
- [ ] Required + recommended properties populated from the same data as the UI.
- [ ] JSON-LD server-rendered and escaped.
- [ ] Rich Results Test passes for each template; CI guards regressions.
- [ ] Search Console enhancement reports monitored.
