# Astro Content — Collections, Schemas, Rendering, Images

## Content Collection Setup

```astro
---
// src/content/config.ts
import { z, defineCollection } from 'astro:content'

const blogCollection = defineCollection({
  type: 'content', // 'content' for .md / .mdx, 'data' for .json / .yaml
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.enum(['Alice', 'Bob']).default('Alice'),
    image: z.object({
      url: z.string(),
      alt: z.string(),
    }).optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
})

export const collections = {
  blog: blogCollection,
  authors: defineCollection({
    type: 'data',
    schema: z.object({
      name: z.string(),
      avatar: z.string(),
      bio: z.string(),
    }),
  }),
}
---
```

## Querying Collections

```astro
---
import { getCollection, getEntry } from 'astro:content'

// All entries, filtered
const posts = await getCollection('blog', ({ data }) => !data.draft)

// Single entry
const post = await getEntry('blog', 'my-first-post')

// Related entries by tag
const related = await getCollection('blog', ({ data }) =>
  data.tags.includes('astro') && !data.draft
)
---
```

## Rendering MDX Content

```astro
---
import { getEntry, render } from 'astro:content'

const post = await getEntry('blog', 'my-first-post')
const { Content, headings, remarkPluginFrontmatter } = await render(post)
---

<article>
  <Content />
</article>
```

## Image Optimization

```astro
---
import { Image, Picture } from 'astro:assets'
import astroLogo from '../assets/logo.png'
import heroImage from '../assets/hero.jpg'
---

<!-- Optimized <img> -->
<Image src={astroLogo} alt="Logo" width={200} height={100} format="webp" />

<!-- Responsive <picture> with multiple formats/sizes -->
<Picture
  src={heroImage}
  formats={['avif', 'webp', 'png']}
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Hero image"
  loading="lazy"
  decoding="async"
/>

<!-- Remote images require width/height -->
<Image src="https://example.com/image.png" alt="Remote" width={800} height={600} />
```

## Content with Dynamic Routes

```astro
---
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content'

export async function getStaticPaths() {
  const posts = await getCollection('blog')
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }))
}

const { post } = Astro.props
const { Content } = await render(post)
---

<h1>{post.data.title}</h1>
<Content />
```

## Table of Contents from Headings

```astro
---
const { headings } = await render(post)
---

<nav>
  {headings.filter(h => h.depth <= 3).map(h => (
    <a href={`#${h.slug}`} style={{ paddingLeft: `${(h.depth - 2) * 1}rem` }}>
      {h.text}
    </a>
  ))}
</nav>
```

## Remote Content from CMS

```astro
---
import { defineCollection, z } from 'astro:content'

// For CMS-sourced content, use loader pattern
const cmsPosts = await fetch('https://cms.example.com/posts').then(r => r.json())
---

{cmsPosts.map(post => <article><h2>{post.title}</h2></article>)}
```
