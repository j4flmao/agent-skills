# Meta Tags Reference

## Required Meta Tags

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Primary Keyword — Site Name</title>
  <meta name="description" content="Compelling description with primary keyword, 150-160 characters. Tells searchers why they should click." />
  <link rel="canonical" href="https://example.com/page" />
</head>
```

## Title Tag Guidelines

```
Format:   Primary Keyword — Secondary Keyword | Site Name
Length:   50-60 characters
Unique:   Every page has a unique title
Example:  Order Management — Real-Time Dashboard | AcmeApp
```

## Meta Description Guidelines

```
Length:       150-160 characters
Includes:     Primary keyword, call to action, value prop
Avoid:        Duplicate descriptions across pages
Example:      "Track, approve, and manage orders in real time.
               AcmeApp's dashboard gives you full visibility into
               your order pipeline with instant updates."
```

## Open Graph Tags

```html
<meta property="og:title" content="Primary Keyword — Site Name" />
<meta property="og:description" content="Same compelling description as meta description or shorter." />
<meta property="og:image" content="https://example.com/images/og-default.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://example.com/page" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="AcmeApp" />
<meta property="og:locale" content="en_US" />
```

### Article-Specific OG

```html
<meta property="og:type" content="article" />
<meta property="article:published_time" content="2026-05-18T10:00:00Z" />
<meta property="article:modified_time" content="2026-05-18T12:00:00Z" />
<meta property="article:author" content="https://example.com/authors/jane" />
<meta property="article:section" content="Technology" />
<meta property="article:tag" content="web development" />
<meta property="article:tag" content="react" />
```

## Twitter Card Tags

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@yourhandle" />
<meta name="twitter:creator" content="@authorhandle" />
<meta name="twitter:title" content="Primary Keyword — Site Name" />
<meta name="twitter:description" content="Same as OG description." />
<meta name="twitter:image" content="https://example.com/images/twitter-card.jpg" />
<meta name="twitter:image:alt" content="Alt text for the image" />
```

## Additional Meta Tags

```html
<!-- Robots control -->
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />

<!-- Verification for webmaster tools -->
<meta name="google-site-verification" content="..." />
<meta name="msvalidate.01" content="..." />

<!-- Theme color (mobile browsers) -->
<meta name="theme-color" content="#2563eb" />

<!-- Apple -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<!-- Preconnect / DNS-Prefetch -->
<link rel="dns-prefetch" href="https://api.example.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
```

## Hreflang Tags

```html
<link rel="alternate" hreflang="en" href="https://example.com/page" />
<link rel="alternate" hreflang="es" href="https://example.com/es/page" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page" />
```

## Framework Implementation

### Next.js (App Router)

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | AcmeApp',
    default: 'Order Management — AcmeApp',
  },
  description: 'Real-time order tracking and management platform.',
  openGraph: {
    title: 'Order Management — AcmeApp',
    description: 'Real-time order tracking platform.',
    url: 'https://example.com',
    siteName: 'AcmeApp',
    images: [{ url: 'https://example.com/og.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Order Management — AcmeApp',
    description: 'Real-time order tracking platform.',
    site: '@acmeapp',
  },
  robots: { index: true, follow: true },
};
```

### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      titleTemplate: '%s | AcmeApp',
      meta: [
        { name: 'description', content: 'Real-time order tracking platform.' },
        { property: 'og:title', content: 'Order Management — AcmeApp' },
        { property: 'og:description', content: 'Real-time order tracking platform.' },
      ],
    },
  },
});
```

### Vanilla SSR (Astro, SvelteKit, Remix)

```html
<!-- Astro component -->
<head>
  <title>Order Management — AcmeApp</title>
  <meta name="description" content="Real-time order tracking platform." />
  <link rel="canonical" href={Astro.url} />
  <meta property="og:url" content={Astro.url} />
</head>
```

## Audit Quick Check

| Tag                     | Present | Value                          |
|-------------------------|---------|--------------------------------|
| `<title>`               | ✓       | 55 chars, includes keyword     |
| `description`           | ✓       | 158 chars, compelling          |
| `og:title`              | ✓       | Matches `<title>`              |
| `og:description`        | ✓       | Same or shorter                |
| `og:image`              | ✓       | 1200x630, < 300 KB             |
| `og:url`                | ✓       | Canonical URL                  |
| `twitter:card`          | ✓       | `summary_large_image`          |
| `canonical`             | ✓       | No trailing slash mismatch     |
| `robots`                | ✓       | `index, follow`                |
