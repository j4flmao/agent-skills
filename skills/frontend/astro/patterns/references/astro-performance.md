# Astro Performance Reference

## Build Optimization

```astro
---
// Use static generation where possible
export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post = await getEntry('blog', slug);
---

<!-- Output static HTML at build time -->
<article>
  <h1>{post.data.title}</h1>
  <Content />
</article>
```

## Image Optimization

```astro
---
import { Image } from '@astrojs/image/components';
---

<Image
  src={heroImage}
  alt="Hero"
  width={1200}
  height={630}
  formats={['webp', 'avif']}
  loading="lazy"
  decoding="async"
/>
```

## Island Architecture

```astro
<!-- Only hydrate visible components -->
<MyHeavyComponent client:visible />

<!-- Hydrate after page is idle -->
<AnalyticsWidget client:idle />

<!-- Hydrate on interaction -->
<ExpandableCard client:media="(min-width: 768px)" />
```

## Key Points

- Static generation outputs HTML at build time for zero JS
- Image optimization with WebP/AVIF reduces payload
- Client directives control hydration timing
- Partial hydration sends zero JS for static islands
- ViewTransitions enables SPA-like navigation without full reloads
- Inline critical CSS and defer non-critical styles
- Preload above-the-fold images and fonts
- Use CDN caching for static assets
- Content collections generate type-safe routes
- Tree-shake unused JavaScript from framework islands
