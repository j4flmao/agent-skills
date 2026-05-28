# Astro Content Collections

## Overview

Content Collections are Astro's built-in content management system for type-safe Markdown, MDX, JSON, YAML, and TOML files. They provide schema validation, TypeScript inference, and optimized query APIs. Content Collections are the recommended way to manage blog posts, documentation, product listings, team members, and any structured content.

## Architecture

### Directory Structure

```
src/content/
  config.ts              -- Collection definitions and schemas
  blog/                  -- Content collection (type: 'content')
    post-1.md
    post-2.md
    authors/             -- Nested subdirectories are not supported
  authors/               -- Data collection (type: 'data')
    alice.json
    bob.yaml
  products/              -- Content collection with MDX
    product-1.mdx
```

Each collection is a top-level directory under `src/content/`. Nested subdirectories inside a collection are not supported. Collections can be:

- `type: 'content'` — Markdown/MDX files with frontmatter
- `type: 'data'` — JSON, YAML, or TOML files with structured data

### Configuration File

```ts
// src/content/config.ts
import { z, defineCollection, reference } from 'astro:content'

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.date().optional(),
    description: z.string().max(160).optional(),
    author: reference('authors'),
    cover: image().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    canonical: z.string().url().optional(),
  }),
})

const authors = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    avatar: z.string(),
    bio: z.string().optional(),
    twitter: z.string().url().optional(),
    github: z.string().url().optional(),
    role: z.enum(['author', 'contributor', 'guest']).default('author'),
  }),
})

const products = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    name: z.string(),
    price: z.number().positive(),
    compareAt: z.number().positive().optional(),
    description: z.string(),
    images: z.array(image()).default([]),
    category: z.enum(['electronics', 'clothing', 'food']),
    variants: z.array(z.object({
      name: z.string(),
      sku: z.string(),
      price: z.number().positive(),
    })).default([]),
    featured: z.boolean().default(false),
    publishedAt: z.coerce.date(),
  }),
})

export const collections = { blog, authors, products }
```

## Schema Reference

### Field Types

```ts
import { z } from 'astro:content'

// Basic types
z.string()
z.number()
z.boolean()
z.coerce.date()           // Accepts string input, coerces to Date

// Arrays and objects
z.array(z.string())
z.object({ key: z.string() })

// Optional and defaults
z.string().optional()
z.string().default('default')
z.array(z.string()).default([])

// Enums and unions
z.enum(['a', 'b', 'c'])
z.union([z.string(), z.number()])

// References to other collections
reference('authors')      // Must match an entry in the 'authors' collection

// Image validation (lazy function)
({ image }) => z.object({
  cover: image(),          // Validates as an Astro image import
})

// String validators
z.string().min(1)
z.string().max(160)
z.string().email()
z.string().url()
z.string().regex(/^[a-z-]+$/)

// Number validators
z.number().positive()
z.number().min(0)
z.number().max(100)
z.number().int()

// Coercion (for string inputs)
z.coerce.number()
z.coerce.boolean()        // 'true'/'false' or 1/0
```

### Advanced Schema Patterns

```ts
// Conditional fields
const conditionalSchema = z.object({
  type: z.enum(['post', 'page']),
  // 'post' requires author and tags
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(data => {
  if (data.type === 'post' && !data.author) return false
  return true
}, { message: 'Posts require an author' })

// Nested validation
const complexSchema = z.object({
  metadata: z.object({
    seo: z.object({
      title: z.string().max(60),
      description: z.string().max(160),
      ogImage: z.string().optional(),
    }),
    schema: z.record(z.unknown()).optional(),
  }),
})

// Union discriminator
const pageSchema = z.discriminatedUnion('layout', [
  z.object({ layout: z.literal('default'), sidebar: z.boolean() }),
  z.object({ layout: z.literal('landing'), heroImage: z.string() }),
  z.object({ layout: z.literal('docs'), sidebar: z.boolean(), toc: z.boolean() }),
])
```

## Querying Collections

### Getting All Entries

```astro
---
import { getCollection } from 'astro:content'

// All blog posts, including drafts
const allPosts = await getCollection('blog')

// Filtered — exclude drafts, sorted by date
const publishedPosts = await getCollection('blog', ({ data }) => {
  return !data.draft && data.pubDate <= new Date()
})
const sorted = publishedPosts.sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
)

// Filter by field value
const featuredPosts = await getCollection('blog', ({ data }) => data.featured)

// Filter by tag
const taggedPosts = await getCollection('blog', ({ data }) =>
  data.tags.includes('astro')
)
---
```

### Getting a Single Entry

```astro
---
import { getEntry } from 'astro:content'

// By collection and slug
const post = await getEntry('blog', 'post-1')

// By slug variable
const { slug } = Astro.params
const currentPost = await getEntry('blog', slug)

// Get referenced entry
const author = await getEntry(post.data.author)
// post.data.author is a reference to the 'authors' collection
---
```

### Rendering Content

```astro
---
import { getEntry, render } from 'astro:content'

const post = await getEntry('blog', 'post-1')
const { Content, headings, remarkPluginFrontmatter } = await render(post)
---

<h1>{post.data.title}</h1>
<p>By {post.data.author}</p>

<!-- Rendered Markdown/MDX content -->
<Content />

<!-- Table of contents from headings -->
<nav>
  {headings.map(h => <a href={`#${h.slug}`}>{h.text}</a>)}
</nav>
```

### Rendering with Custom Components

For MDX collections, you can provide custom components:

```astro
---
import { getEntry, render } from 'astro:content'
import CodeBlock from '../components/CodeBlock.astro'
import YouTube from '../components/YouTube.astro'

const post = await getEntry('blog', 'mdx-post')
const { Content } = await render(post, {
  components: {
    pre: CodeBlock,       // Override <pre> with custom component
    YouTube,              // Custom MDX component
  },
})
---

<Content />
```

## Content Entry Format

### Markdown (Content Collection)

```markdown
---
title: Getting Started with Astro
pubDate: 2024-01-15
updatedDate: 2024-03-20
description: Learn how to build your first Astro site
author: alice
tags: [astro, tutorial, getting-started]
draft: false
cover:
  src: ../../assets/hero.png
  alt: Astro logo
---

## Introduction

Welcome to Astro! This guide will help you get started.

### Prerequisites

- Node.js 18+
- A text editor
- Basic knowledge of HTML and CSS

### Installation

```bash
npm create astro@latest
```

## Next Steps

Check out the [documentation](https://docs.astro.build) for more.
```

### Data Collection (JSON)

```json
{
  "name": "Alice Johnson",
  "avatar": "/images/alice.jpg",
  "bio": "Senior frontend developer and Astro enthusiast",
  "twitter": "https://twitter.com/alice",
  "github": "https://github.com/alice",
  "role": "author"
}
```

### Data Collection (YAML)

```yaml
name: Bob Smith
avatar: /images/bob.jpg
bio: "Technical writer and documentation expert"
role: contributor
```

## Advanced Query Patterns

### Multiple Collections

```astro
---
import { getCollection } from 'astro:content'

const [posts, products, authors] = await Promise.all([
  getCollection('blog'),
  getCollection('products'),
  getCollection('authors'),
])
---
```

### Pagination

```astro
---
// src/pages/blog/[page].astro
export async function getStaticPaths({ paginate }) {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return paginate(posts, { pageSize: 10 })
}

const { page } = Astro.props
---

<h1>Blog — Page {page.current} of {page.last}</h1>

<ul>
  {page.data.map(post => (
    <li><a href={`/blog/${post.id}/`}>{post.data.title}</a></li>
  ))}
</ul>

{page.url.prev && <a href={page.url.prev}>Previous</a>}
{page.url.next && <a href={page.url.next}>Next</a>}
```

### Related Content

```astro
---
const currentPost = await getEntry('blog', slug)
const relatedPosts = await getCollection('blog', ({ data }) => {
  return (
    !data.draft &&
    data.id !== slug &&
    data.tags.some(tag => currentPost.data.tags.includes(tag))
  )
})
const sorted = relatedPosts
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .slice(0, 3)
---
```

### RSS Feed from Collection

```astro
---
// src/pages/rss.xml.js
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  const sorted = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())

  return rss({
    title: 'My Blog',
    description: 'Latest blog posts',
    site: context.site,
    items: sorted.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      customData: post.data.tags.map(t => `<category>${t}</category>`).join(''),
    })),
  })
}
```

## Performance Optimization

### Caching Queries

```astro
---
const posts = await getCollection('blog')
// Results are cached at build time (SSG) or server level (SSR)
// In SSR, you can add your own caching:
//
// if (Astro.locals.cache.has('blog-posts')) {
//   posts = Astro.locals.cache.get('blog-posts')
// } else {
//   posts = await getCollection('blog')
//   Astro.locals.cache.set('blog-posts', posts)
// }
---
```

### Selective Loading

```astro
---
// Load only slugs and titles (if you don't need full content)
const posts = await getCollection('blog')
// getCollection always loads full entries
// Filter early in the callback to minimize processing
---
```

### Content Collection Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No nested subdirectories | Collections are flat | Use tags or categories for grouping |
| No cross-collection queries | Multiple queries needed | Use Promise.all and join in memory |
| No partial loading | Always loads full entry | Filter aggressively in callback |
| No real-time updates | Build-time only | Use SSR mode with external CMS |
| No built-in pagination | Manual or custom | Use Astro's paginate utility |

## Migration from Frontmatter-Only

Before Content Collections (Astro <2.0):

```astro
---
// Unsafe — no validation, no TypeScript
const frontmatter = Astro.frontmatter
---
```

After Migration:

```astro
---
import { getCollection } from 'astro:content'
const posts = await getCollection('blog')
// Type-safe: posts[0].data.title is a validated string
---
```

Migration steps:
1. Create `src/content/config.ts` with schemas
2. Move Markdown files from `src/pages/` to `src/content/{collection}/`
3. Replace `Astro.frontmatter` with `getCollection()` queries
4. Update dynamic routes to use `getStaticPaths` with collection data

## Error Handling

### Validation Errors

When a content entry violates its schema, Astro reports the error at build time:

```
Error: blog/post-1.md frontmatter validation
  - title: Required
  - pubDate: Expected date, received string "invalid-date"
  - tags: Expected array, received string
```

### Type Safety

```ts
// Import inferred types from collections
import { type CollectionEntry } from 'astro:content'

// Type for a blog post entry
type BlogPost = CollectionEntry<'blog'>
// { id: string, slug: string, body: string, collection: 'blog', data: { title, pubDate, ... }, render(): ... }

// Type for the data only
type BlogPostData = CollectionEntry<'blog'>['data']
// { title: string, pubDate: Date, description?: string, ... }
```

## Integration with Frameworks

### React Component Displaying Content

```tsx
// src/components/PostCard.tsx
import type { CollectionEntry } from 'astro:content'

interface Props {
  post: CollectionEntry<'blog'>
}

export default function PostCard({ post }: Props) {
  return (
    <article>
      <h2>{post.data.title}</h2>
      <time>{post.data.pubDate.toLocaleDateString()}</time>
      <p>{post.data.description}</p>
      <div>
        {post.data.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
    </article>
  )
}
```

### Using in Client Components

Pass content collection data as props to framework islands:

```astro
---
import PostCard from '../components/PostCard.tsx'
import { getCollection } from 'astro:content'
const posts = await getCollection('blog')
---

<PostCard client:visible post={posts[0]} />
```

## Summary

| Operation | API | Output |
|-----------|-----|--------|
| Get all entries | `getCollection('blog')` | `CollectionEntry[]` |
| Get filtered entries | `getCollection('blog', filterFn)` | `CollectionEntry[]` |
| Get single entry | `getEntry('blog', 'slug')` | `CollectionEntry` |
| Get referenced entry | `getEntry(post.data.author)` | `CollectionEntry` |
| Render content | `render(entry)` | `{ Content, headings }` |
| Define collection | `defineCollection({ type, schema })` | `CollectionConfig` |
| Inferred type | `CollectionEntry<'blog'>` | Full type |
