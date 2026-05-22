# Image Performance

LCP optimization, lazy loading, preloading, budgets, and Core Web Vitals.

---

## LCP Image Optimization

The Largest Contentful Paint (LCP) element is usually an image. Optimize aggressively:

```html
<head>
  <!-- Preload the LCP image before the stylesheet blocks it -->
  <link rel="preload" as="image" href="hero.avif" imagesrcset="hero-640.avif 640w, hero-1280.avif 1280w" imagesizes="100vw" />
</head>
```

- Identify LCP image early — it's the largest image in the initial viewport.
- Never lazy-load the LCP image.
- Optimize LCP image to < 100KB, AVIF format, appropriate dimensions.
- Preload LCP image in `<head>` — not in the body or via CSS.
- Remove any `loading="lazy"` from the LCP candidate.
- 4s to LCP paint target: < 2.5s.

---

## Lazy Loading

### Native lazy loading
```html
<img src="photo.jpg" loading="lazy" alt="..." />
<iframe src="widget.html" loading="lazy"></iframe>
```

Native `loading="lazy"` defers loading until the browser estimates the element is near the viewport. Supported in all modern browsers since 2020.

### Custom IntersectionObserver
```ts
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement;
      img.src = img.dataset.src!;
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px' }); // start loading 200px before visible

document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
```

Custom observer useful for: custom thresholds, fade-in effects, or framework wrappers. RootMargin of 200px ensures images start loading before they scroll into view.

### Which images to lazy-load
| Position | loading attribute |
|----------|------------------|
| Above fold (LCP candidate) | Omit or `eager` |
| Below fold | `lazy` |
| Background images (CSS) | Depends — in viewport? eager; below? defer via JS |

---

## Preloading

```html
<!-- Critical images -->
<link rel="preload" as="image" href="critical.avif" />

<!-- Preconnect to image CDN -->
<link rel="preconnect" href="https://images.example.com" />

<!-- For responsive images -->
<link rel="preload" as="image" imagesrcset="hero-640.avif 640w, hero-1280.avif 1280w" imagesizes="100vw" />
```

Preload only the LCP image and maybe 1–2 critical below-fold images. Over-preloading fights bandwidth with other critical resources (fonts, CSS, JS).

---

## Performance Budgets

### Image weight budgets
| Category | Budget | Notes |
|----------|--------|-------|
| Individual image | < 100 KB | AVIF + reasonable dimensions |
| Total page images | < 1 MB | All images combined |
| LCP image | < 100 KB | Heaviest optimization target |
| Hero/banner | < 200 KB | Full-width images |
| Thumbnails | < 20 KB | Card images, avatars |

### Core Web Vitals targets
| Metric | Target | Image Impact |
|--------|--------|-------------|
| LCP | < 2.5s | Preload + optimize hero image |
| CLS | < 0.1 | Aspect ratio containers on every image |
| INP | < 200ms | Avoid large image decode on main thread |

### Measurement
```bash
# Lighthouse CI
npx lhci collect

# WebPageTest
# Check "Image Analysis" tab for compression opportunities
```

Set CI thresholds: fail if total image weight > 1MB or LCP > 2.5s.
