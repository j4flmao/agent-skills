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
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Image Optimization

**Description:** Implements image optimization — format selection, responsive images, lazy loading, CDN transforms, placeholder strategies, and performance budgets. Triggered by "image optimization", "responsive images", "image CDN", "lazy loading images", "next/image", "srcset", "picture element", "WebP", "AVIF", "image compression", "image CDN", "blur placeholder", "progressive image".

**Version:** 1.0.0
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
