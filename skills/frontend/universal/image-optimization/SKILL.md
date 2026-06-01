---
name: frontend-image-optimization
description: >
  Use this skill when the user says 'image optimization', 'responsive images', 'image CDN', 'lazy loading images', 'next/image', 'srcset', 'picture element', 'WebP', 'AVIF', 'image compression', 'image CDN', 'blur placeholder', 'progressive image'. Optimize images for web performance including format selection, responsive images, lazy loading, and CDN integration. Do NOT use for: video optimization or server-side image processing.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, images, optimization, phase-7, universal]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Image Optimization

**Description:** Implements image optimization — format selection, responsive images, lazy loading, CDN transforms, placeholder strategies, and performance budgets. Triggered by "image optimization", "responsive images", "image CDN", "lazy loading images", "next/image", "srcset", "picture element", "WebP", "AVIF", "image compression", "image CDN", "blur placeholder", "progressive image".

**Version:** 2.0.0
**Author:** j4flmao
**License:** MIT

---

## Purpose

Deliver optimized images that load fast, look crisp on any screen, and minimize bandwidth usage — directly impacting LCP, CLS, and overall page weight budgets.

---

## Agent Protocol

### Trigger
User request includes any of: "image optimization", "responsive images", "image CDN", "lazy loading images", "next/image", "srcset", "picture element", "WebP", "AVIF", "image compression", "image CDN", "blur placeholder", "progressive image".

### Input Context
- Image sources (CMS, local, CDN, user uploads)
- Layout requirements (hero, card thumbnails, full-width banners)
- Breakpoints and device targets
- Performance budget (LCP target, total image weight)

### Output Artifact
Image optimization strategy with srcset/picture markup and performance notes.

### Response Format
```
## Strategy
<formats, breakpoints, CDN, placeholders>

## Markup
<srcset, picture, lazy-loading code>

## Performance
<LCP-image, preload, budgets>

—
Compression footer: frontend-image-optimization/v1 | 3 sections | formats: <avif+webp+jpeg> | LCP: <ok|warn>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- All content images use srcset with appropriate breakpoints
- AVIF with WebP fallback in picture element
- LCP image preloaded in document head
- lazy loading applied to all below-fold images
- Aspect ratio wrapper on every image (prevent CLS)
- Alt text on every image

### Max Response Length
4096 tokens

## Image Optimization Architecture / Decision Trees

### Format Selection Decision Tree
```
Type of image?
  |-- Photograph / complex scene -->
  |     |-- AVIF available? --> Use AVIF (50% smaller than JPEG)
  |     |-- WebP available? --> Use WebP fallback
  |     |-- Neither --> Progressive JPEG (perceived faster load)
  |     NOTE: Always serve AVIF + WebP + JPEG via <picture>
  |
  |-- Logo / icon / illustration with few colors -->
  |     |-- Simple shapes? --> SVG (inline for small, sprite for many)
  |     |-- Has transparency? --> PNG + WebP (with transparency support)
  |
  |-- Screenshot / UI mockup -->
        |-- AVIF with WebP fallback (good for synthetic images)
```

### Loading Strategy Decision Tree
```
Position in viewport?
  |-- Above fold (visible on load) -->
  |     |-- LCP candidate? -->
  |     |     YES: Eager load + preload via `<link rel="preload">`
  |     |     NO:  Eager load (omit loading attribute)
  |     |
  |     |-- Art direction needed?
  |           YES: <picture> with mobile/desktop variants
  |           NO:  <img> with srcset + sizes
  |
  |-- Below fold (scrolled into view) -->
        |-- Native lazy loading? -->
        |     YES: loading="lazy" (supported in all modern browsers)
        |     NO:  IntersectionObserver polyfill
        |
        |-- Placeholder needed?
              YES: LQIP (blur placeholder, ~20px width)
              NO:  aspect-ratio container only
```

### Placeholder Strategy Decision Tree
```
Perceived loading time?
  |-- Instant (< 1s on fast connection) -->
  |     No placeholder needed, use aspect-ratio box only
  |
  |-- Fast (1-3s) -->
  |     |-- Dominant color: simplest, least data
  |     |-- Blur-up: better UX, needs tiny thumbnail URL
  |
  |-- Slow (3s+) -->
  |     |-- LQIP: Low Quality Image Placeholder (blurred, 20-30px)
  |     |-- Progressive JPEG: loads in passes, perceived faster
  |
  |-- Very slow / poor connectivity -->
        LQIP with skeleton shimmer animation
```

---

## Workflow

### 1. Format Selection
- **AVIF:** Best compression (50% smaller than JPEG). Serve first via `<picture>` with WebP/JPEG fallback.
- **WebP:** Widely supported fallback. Good compression. Use when AVIF not available.
- **JPEG:** Photos, complex scenes. Progressive JPEG for perceived speed.
- **PNG:** Transparency requirements (icons, logos with transparency).
- **SVG:** Icons, illustrations, logos. Always inline or use sprite sheet for small SVGs.

### 2. Responsive Images
- `srcset` + `sizes` attribute for resolution switching.
- Device pixel ratio awareness: `1x`, `2x`, `3x` descriptors.
- Art direction via `<picture>` with `media` queries for mobile/crop variants.
- Use image CDN transforms to generate variants on-the-fly.
- Typical breakpoints: 640w, 768w, 1024w, 1280w, 1536w.

### 3. Lazy Loading
- Native `loading="lazy"` attribute on `<img>` and `<iframe>`.
- IntersectionObserver for custom thresholds (rootMargin, threshold).
- Eager load (`loading="eager"` or omit) for above-fold images.
- LCP image must not be lazy-loaded — preload it.
- Fade-in transition after load for lazy images (opacity 0→1, 300ms).

### 4. CDN Optimization
- Image CDN transforms on-the-fly: Cloudinary, Imgix, Cloudflare Images.
- Resize, format, quality via URL parameters.
- CDN caching with long TTL (30+ days) and cache bust via URL versioning.
- Serve from CDN edge closest to user.
- Transform image at request time — no pre-generation needed.

### 5. Placeholder Strategies
- **Blur-up:** Tiny thumbnail (20–30px) blurred as background, replaced by full image on load.
- **Dominant color:** Extract average color, use as background while image loads.
- **LQIP:** Low-quality image placeholder (blurred, highly compressed).
- **Skeleton:** Aspect-ratio container with shimmer animation.
- All placeholders prevent CLS by occupying the image's aspect ratio space.

### 6. Performance Budgets
- Max 100KB per individual image.
- Total page image weight < 1MB.
- Core Web Vitals: LCP < 2.5s (preload LCP image, optimize it).
- Preload LCP image via `<link rel="preload" as="image">` in `<head>`.
- Compress images at build time (sharp) or serve via CDN.

### 7. Build-Time Image Processing (sharp)
```typescript
import sharp from 'sharp'
import { glob } from 'glob'

async function optimizeImages() {
  const images = await glob('src/assets/images/**/*.{jpg,png}')

  for (const image of images) {
    const name = image.replace(/\.\w+$/, '')

    // Generate AVIF
    await sharp(image)
      .avif({ quality: 65 })
      .toFile(`${name}.avif`)

    // Generate WebP
    await sharp(image)
      .webp({ quality: 80 })
      .toFile(`${name}.webp`)

    // Generate resized variants for srcset
    for (const width of [640, 768, 1024, 1280]) {
      await sharp(image)
        .resize(width)
        .jpeg({ quality: 80, progressive: true })
        .toFile(`${name}-${width}w.jpg`)
    }
  }
}
```

### 8. next/image Configuration (Next.js)
```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net', // Contentful CDN
      },
    ],
  },
}
```

### 9. Responsive Image Component
```tsx
function OptimizedImage({
  src,
  alt,
  widths = [640, 768, 1024, 1280],
  sizes = '100vw',
  priority = false,
}: {
  src: string
  alt: string
  widths?: number[]
  sizes?: string
  priority?: boolean
}) {
  const srcset = widths
    .map((w) => `${src}?w=${w}&q=75 ${w}w`)
    .join(', ')

  return (
    <picture>
      <source srcSet={srcset.replace(/&q=75/g, '&fm=avif&q=65')} type="image/avif" sizes={sizes} />
      <source srcSet={srcset.replace(/&q=75/g, '&fm=webp&q=75')} type="image/webp" sizes={sizes} />
      <img
        src={`${src}?w=${widths[0]}&q=75`}
        srcSet={srcset}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
      />
    </picture>
  )
}
```

### 10. Accessibility & Alt Text
```typescript
// Decorative image (no meaningful content)
<img src="bg.jpg" alt="" role="presentation" />

// Informative image
<img src="chart.png" alt="Bar chart showing Q4 revenue increased 25%" />

// Functional image (link, button)
<a href="/docs">
  <img src="icon-pdf.svg" alt="Download PDF guide" />
</a>

// Complex image (chart, diagram)
<img
  src="org-chart.png"
  alt="Organization chart. CEO at top, CTO and CFO reporting to CEO."
/>
<a href="org-chart-description.html">Full organization chart description</a>
```

## Common Pitfalls

### 1. No Aspect Ratio Container
```html
<!-- BAD -- CLS when image loads -->
<img src="photo.jpg" />

<!-- GOOD -- aspect ratio prevents layout shift -->
<div style="aspect-ratio: 16/9">
  <img src="photo.jpg" />
</div>
```

### 2. Lazy Loading LCP Image
```html
<!-- BAD -- LCP image delayed -->
<img src="hero.jpg" loading="lazy" />

<!-- GOOD -- LCP image preloaded -->
<link rel="preload" as="image" href="hero.avif" />
<img src="hero.jpg" loading="eager" />
```

### 3. Single Format
Serving only JPEG misses 50%+ bandwidth savings from AVIF/WebP. Always serve multiple formats via `<picture>`.

### 4. Missing Alt Text
Every `<img>` must have alt text. Decorative images use `alt=""` (empty). Informational images need descriptive alt text.

### 5. Oversized Images
Serving a 4000px image for a 300px thumbnail wastes bandwidth. Use `srcset` to serve appropriately sized variants.

## Compared With

| Approach | Avg File Size | Browser Support | Build Step | LCP Impact |
|----------|--------------|-----------------|------------|------------|
| JPEG (baseline) | 100% | 100% | No | Baseline |
| Progressive JPEG | ~98% | 100% | Yes | Better (perceived) |
| WebP | ~70% of JPEG | 96% | Optional | Better |
| AVIF | ~50% of JPEG | 82% | Optional | Best |
| JPEG 2000 | ~80% | Safari only | Yes | Niche |
| SVG (vector) | Variable | 100% | No | Best (tiny) |

## Performance Considerations

### Image CDN vs Build-Time Processing
| Factor | Image CDN | Build-Time (sharp) |
|--------|-----------|-------------------|
| On-the-fly transformations | Yes | No |
| Cache strategy | CDN edge cache | Static file cache |
| Deployment speed | No build step for new images | Requires rebuild |
| Cost | Per-transformation | One-time compute |
| Best for | Dynamic/user-uploaded images | Static assets, icons |

### Core Web Vitals Impact
- **LCP:** Preload LCP image, serve AVIF, use responsive widths. Target: < 2.5s
- **CLS:** Always set width/height or aspect-ratio on every image. Target: < 0.1
- **FID/INP:** No direct impact from images, but heavy images block main thread on decode. Use `decoding="async"`.

## Accessibility Considerations

- Every `<img>` requires alt text (empty `alt=""` for decorative images)
- Complex images (charts, diagrams) need a text alternative nearby or via `longdesc`
- Avoid using images of text when real text is possible
- Ensure color contrast in images with text overlay
- SVG icons need `role="img"` + `<title>` when they convey meaning

## Security Considerations

- Sanitize user-uploaded image filenames to prevent path traversal
- Validate image MIME types on upload (don't trust extension alone)
- Use `Content-Security-Policy: img-src` to restrict image sources
- Image CDN URLs can leak information -- use signed URLs for private images
- Strip EXIF data from user-uploaded images (may contain GPS location)

---

## Rules

1. Serve AVIF with WebP fallback in `<picture>` element — never a single format.
2. `srcset` required for every content image that varies by viewport.
3. `loading="lazy"` for all below-fold images; never lazy-load the LCP image.
4. Preload LCP image via `<link rel="preload" as="image">` in document `<head>`.
5. Use image CDN for all dynamic images (user uploads, CMS images).
6. Alt text required on every `<img>` element for accessibility.
7. Aspect ratio wrapper (`aspect-ratio` CSS or padding hack) prevents layout shift.
8. Keep each image under 100KB; total page images under 1MB.

---

## References
  - references/image-accessibility.md — Image Accessibility
  - references/image-cdn-configuration.md — Image CDN Configuration
  - references/image-components.md — Image Components
  - references/image-delivery.md — Image Delivery
  - references/image-formats.md — Image Formats & Delivery
  - references/image-performance.md — Image Performance
## Handoff

If project requires real-time image transformation pipeline setup (Cloudinary, Imgix, or custom), deliver CDN configuration. For build-time image processing pipeline, hand off to bundler-tools skill. Otherwise implement complete image optimization.
