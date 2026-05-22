# Astro Content Patterns

## Content Collections Setup

### Directory Structure
```
src/content/
  config.ts                    -- Collection schemas
  blog/                         -- Content collection (markdown/MDX)
    my-first-post.md
    using-astro.mdx
  authors/                      -- Data collection (JSON/YAML)
    jane.yml
    john.json
  products/                     -- Mixed collection
    widget-1.md
    widget-2.mdx
```

### Configuration
```typescript
// src/content/config.ts
import { z, defineCollection, reference } from 'astro:content'

const authors = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    avatar: z.string().url(),
    bio: z.string().optional(),
    social: z.object({
      twitter: z.string().optional(),
      github: z.string().optional(),
    }).optional(),
  }),
})

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string().max(120),
    description: z.string().max(280),
    pubDate: z.coerce.date(),
    updatedDate: z.date().optional(),
    heroImage: image().optional(),
    author: reference('authors'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    canonical: z.string().url().optional(),
  }),
})

export const collections = { blog, authors }
```

## Querying Collections

### Basic Queries
```typescript
import { getCollection, getEntry } from 'astro:content'

// All blog posts, filtered
const posts = await getCollection('blog', ({ data }) =>
  import.meta.env.PROD ? !data.draft : true
)

// Single entry by slug
const post = await getEntry('blog', 'my-first-post')

// Related entries by reference
const authorPosts = await getCollection('blog', ({ data }) =>
  data.author.id === post.data.author.id
)
```

### Pagination
```astro
---
export async function getStaticPaths({ paginate }) {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return paginate(posts, { pageSize: 10 })
}
const { page } = Astro.props
---
<h1>Blog — Page {page.currentPage}</h1>
{page.data.map(post => <ArticleCard post={post} />)}
```

## Markdown/MDX Rendering

### Content Entry Rendering
```astro
---
import { getEntry, render } from 'astro:content'
import BaseLayout from '../../layouts/BaseLayout.astro'

const post = await getEntry('blog', Astro.params.slug)
if (!post) return Astro.redirect('/404')

const { Content, headings } = await render(post)
---
<BaseLayout title={post.data.title} description={post.data.description}>
  <article>
    <h1>{post.data.title}</h1>
    <Content />
  </article>
  <TableOfContents headings={headings} />
</BaseLayout>
```

### MDX Components
```astro
---
// src/pages/blog/[slug].astro
import { getEntry, render } from 'astro:content'
import CodeBlock from '../../components/CodeBlock.astro'
import Callout from '../../components/Callout.astro'

const post = await getEntry('blog', Astro.params.slug)
const { Content } = await render(post, {
  components: { pre: CodeBlock, blockquote: Callout },
})
---
```

## SSR/SSG Hybrid

### Per-Route Rendering
```astro
---
// src/pages/blog/[slug].astro — SSG (static)
export async function getStaticPaths() {
  const posts = await getCollection('blog')
  return posts.map(post => ({ params: { slug: post.slug } }))
}
---

---astro
---
// src/pages/dashboard/orders.astro — SSR (server)
export const prerender = false
const orders = await getOrders(Astro.locals.userId)
---
```

### Hybrid Mode Config
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config'
export default defineConfig({
  output: 'hybrid',
})
```

## Image Optimization
```astro
---
import { Image, Picture } from 'astro:assets'
import hero from '../assets/hero.jpg'
import product from '../assets/product.png'
---
<Image src={hero} alt="Hero" width={1200} height={600} format="webp" loading="eager" />
<Picture src={product} alt="Product" formats={['avif', 'webp']} widths={[400, 800, 1200]} />
```

## Content Anti-Patterns
- ❌ No schema — plain markdown frontmatter without Zod validation.
- ❌ Bare `<img>` — always use `Image` or `Picture` from astro:assets.
- ❌ All static — marking every page `prerender = true` when some need auth or dynamic data.
- ❌ Deeply nested content — keep src/content/ flat by collection type.
