# Astro Collections & Content Management

## Content Collections Schema

### Basic Schema

```ts
// src/content/config.ts
import { z, defineCollection, reference } from 'astro:content'

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.date().optional(),
    heroImage: image().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    author: reference('authors').optional(),
    featured: z.boolean().default(false),
    order: z.number().optional(),
  }),
})

const authors = defineCollection({
  type: 'data',
  schema: ({ image }) => z.object({
    name: z.string(),
    avatar: image(),
    bio: z.string().optional(),
    twitter: z.string().url().optional(),
  }),
})

export const collections = { blog, authors }
```

### Querying Collections

```astro
---
import { getCollection, getEntry, render } from 'astro:content'

// All entries, sorted
const posts = await getCollection('blog', ({ data }) => !data.draft)
const sorted = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())

// Single entry
const entry = await getEntry('blog', 'my-post-slug')

// By tag
const taggedPosts = posts.filter(post => post.data.tags.includes('astro'))

// Render content
const { Content, headings } = await render(entry)
---

<Content />
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

{page.data.map(post => <article><h2>{post.data.title}</h2></article>)}
<a href={page.url.prev || '#'}>Previous</a>
<a href={page.url.next || '#'}>Next</a>
```

## RSS Feed

```astro
---
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'

export async function GET(context) {
  const posts = await getCollection('blog')
  return rss({
    title: 'My Blog',
    description: 'My blog description',
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
    })),
  })
}
```

## MDX

```astro
---
import { getEntry, render } from 'astro:content'
const post = await getEntry('blog', 'post-slug')
const { Content } = await render(post)
---

<Content />

<style is:global>
  .content h2 { /* MDX component styles */ }
</style>
```

## Image Content

```astro
---
import { Image } from 'astro:assets'
import { getEntry } from 'astro:content'
const author = await getEntry('authors', 'alice')
---

<Image src={author.data.avatar} alt={author.data.name} />
```

## Collection Metadata

```astro
---
export async function getStaticPaths() {
  const posts = await getCollection('blog')
  const tags = [...new Set(posts.flatMap(p => p.data.tags))]
  return tags.map(tag => ({ params: { tag } }))
}
const { tag } = Astro.params
const tagged = await getCollection('blog', p => p.data.tags.includes(tag!))
---
```
