# Astro Component Strategies

## Framework-Agnostic Components

```astro
---
// src/components/Card.astro
export interface Props {
  title: string
  description: string
  image?: string
  variant?: 'default' | 'featured'
  href?: string
}

const { title, description, image, variant = 'default', href } = Astro.props
const Tag = href ? 'a' : 'div'
---

<Tag href={href} class:list={['card', `card--${variant}`]}>
  {image && <img src={image} alt="" class="card__image" />}
  <div class="card__body">
    <h3 class="card__title">{title}</h3>
    <p class="card__description">{description}</p>
  </div>
  <slot name="footer" />
</Tag>

<style scoped>
  .card {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .card--featured {
    border-color: var(--color-primary);
    border-width: 2px;
  }
  .card__image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
</style>
```

## Dynamic Component Loading

```typescript
// src/components/DynamicContent.tsx
import { useEffect, useState } from 'react'

export default function DynamicContent({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(setContent)
      .catch(err => setError(err.message))
  }, [url])

  if (error) return <div class="error">{error}</div>
  if (!content) return <div class="loading">Loading...</div>
  return <div innerHTML={content} />
}
```

## Responsive Images

```astro
---
// src/components/ResponsiveImage.astro
export interface Props {
  src: string
  alt: string
  widths?: number[]
  sizes?: string
  loading?: 'lazy' | 'eager'
}

const { src, alt, widths = [480, 768, 1200], sizes = '100vw', loading = 'lazy' } = Astro.props
---

<img
  src={src}
  alt={alt}
  loading={loading}
  decoding="async"
  class="responsive-image"
/>

<style scoped>
  .responsive-image {
    width: 100%;
    height: auto;
    object-fit: cover;
  }
</style>
```

## Fragment Components

```astro
---
// src/components/Fragments.astro
const items = ['Feature 1', 'Feature 2', 'Feature 3']
---

{items.map(item => (
  <li class="feature-item">{item}</li>
))}

<style scoped>
  .feature-item {
    padding: 0.5rem 0;
    color: var(--color-text-secondary);
  }
</style>
```

## Key Points

- Use Astro components for static, framework-agnostic UI
- Use framework components (React, Vue, Svelte) for interactivity
- Leverage scoped styles for component isolation
- Use slots for flexible content composition
- Pass TypeScript interfaces via Astro.props
- Use client:* directives for selective hydration
- Create responsive image components with lazy loading
- Build fragment components for repeated markup
- Use dynamic imports for code-splitting
- Implement error boundaries for client components
- Use CSS modules or styled-components within frameworks
- Keep interactive islands small and focused
