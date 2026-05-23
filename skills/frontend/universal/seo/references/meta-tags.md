# Meta Tags Reference

## Required Core Tags

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Primary Keyword — Secondary Keyword | Site Name</title>
  <meta name="description" content="Compelling description with primary keyword, 150-160 characters. Tells searchers why they should click." />
  <link rel="canonical" href="https://example.com/page" />
  <meta name="robots" content="index, follow" />
</head>
```

## Title Tag Rules

| Rule | Requirement |
|------|-------------|
| Length | 50-60 characters |
| Format | `Primary Keyword — Secondary Keyword | Brand` |
| Uniqueness | Every page has a unique title |
| Keyword | Primary keyword near the front |
| Brand | At the end after pipe or dash separator |

Good: `Order Management — Real-Time Dashboard | AcmeApp`
Bad: `Home` (too short, no keyword)

## Meta Description Rules

| Rule | Requirement |
|------|-------------|
| Length | 150-160 characters |
| Includes | Primary keyword, call to action, value proposition |
| Uniqueness | Every page has a unique description |
| Voice | Active voice, compelling, matches search intent |

## Open Graph Tags

```html
<meta property="og:title" content="Primary Keyword — Site Name" />
<meta property="og:description" content="Same compelling description as meta or shorter." />
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
```

## Twitter Card Tags

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@yourhandle" />
<meta name="twitter:creator" content="@authorhandle" />
<meta name="twitter:title" content="Primary Keyword — Site Name" />
<meta name="twitter:description" content="Same as OG description." />
<meta name="twitter:image" content="https://example.com/images/twitter-card.jpg" />
<meta name="twitter:image:alt" content="Alt text for image" />
```

## Additional Technical Tags

```html
<!-- Robots control -->
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />

<!-- Theme color (mobile browsers) -->
<meta name="theme-color" content="#2563eb" />

<!-- Apple web app -->
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

Each language variant needs a self-referencing hreflang. x-default targets unspecified language.

## Framework-Specific Implementation

### Next.js App Router
```tsx
export const metadata: Metadata = {
  title: { template: '%s | AcmeApp', default: 'Home | AcmeApp' },
  description: 'Real-time order tracking platform.',
  openGraph: { title: 'Home | AcmeApp', description: 'Real-time order tracking.', url: 'https://example.com', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: 'Home | AcmeApp', description: 'Real-time order tracking.' },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://example.com' },
};
```

### Nuxt 3
```ts
definePageMeta({
  title: 'Home',
  description: 'Real-time order tracking.',
  og: { title: 'Home | AcmeApp', description: 'Real-time order tracking.' },
});
```

### Astro
```html
<head>
  <title>Home | AcmeApp</title>
  <meta name="description" content="Real-time order tracking." />
  <link rel="canonical" href={Astro.url} />
</head>
```

## Audit Quick Check

| Tag | Present | Requirement |
|-----|---------|-------------|
| `<title>` | ✓ | 55 chars, keyword-first |
| `description` | ✓ | 158 chars, compelling |
| `og:title` | ✓ | Matches `<title>` |
| `og:description` | ✓ | Same or shorter version |
| `og:image` | ✓ | 1200x630, < 300 KB |
| `canonical` | ✓ | Absolute URL, no trailing slash mismatch |
| `twitter:card` | ✓ | `summary_large_image` |
| `robots` | ✓ | `index, follow` |
| `hreflang` | ✓ | Self-referencing + alternatives |
