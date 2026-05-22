# Remix SEO — Meta, Sitemap, JSON-LD, Canonical

## Meta Export Per Route

```tsx
import type { MetaFunction } from '@remix-run/node'

export const meta: MetaFunction<typeof loader> = ({ data, params, location }) => {
  if (!data?.product) {
    return [
      { title: 'Product Not Found | My Store' },
      { name: 'description', content: 'The requested product does not exist.' },
    ]
  }

  return [
    { title: `${data.product.name} | My Store` },
    { name: 'description', content: data.product.description.slice(0, 160) },
    { property: 'og:title', content: data.product.name },
    { property: 'og:description', content: data.product.description.slice(0, 160) },
    { property: 'og:type', content: 'product' },
    { property: 'og:url', content: `https://mystore.com/products/${params.id}` },
    { property: 'og:image', content: data.product.imageUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { tagName: 'link', rel: 'canonical', href: `https://mystore.com/products/${params.id}` },
  ]
}
```

## Root Meta (Fallback)

```tsx
// app/root.tsx
export const meta: MetaFunction = () => [
  { title: 'My Store' },
  { name: 'description', content: 'Best products online' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  { charSet: 'utf-8' },
]
```

## Sitemap Resource Route

```tsx
// app/routes/sitemap[.]xml.tsx
import { json } from '@remix-run/node'

export async function loader() {
  const products = await db.product.findMany({ select: { id: true, updatedAt: true } })
  const pages = [
    { loc: 'https://mystore.com', lastmod: '2025-01-01', priority: '1.0' },
    { loc: 'https://mystore.com/about', lastmod: '2025-01-01', priority: '0.5' },
    ...products.map(p => ({
      loc: `https://mystore.com/products/${p.id}`,
      lastmod: p.updatedAt.toISOString().split('T')[0],
      priority: '0.8',
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(p => `
  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <priority>${p.priority}</priority>
  </url>`).join('')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
```

## Robots.txt Resource Route

```tsx
// app/routes/robots[.]txt.tsx
export async function loader() {
  const robots = `User-agent: *
Allow: /
Sitemap: https://mystore.com/sitemap.xml`
  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
```

## JSON-LD Structured Data

```tsx
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// In a route component:
const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.imageUrl,
  offers: {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
}
```

## Canonical URLs

Always set canonical in root meta and override per route:

```tsx
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { tagName: 'link', rel: 'canonical', href: data?.canonical ?? 'https://mystore.com' },
]
```

## Breadcrumb Structured Data

```tsx
function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
```

## Performance & SEO Headers

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const data = await getData()
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  })
}
```

Use `stale-while-revalidate` for content that changes infrequently to improve LCP scores.
