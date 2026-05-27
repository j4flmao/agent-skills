# Astro Architecture

## Project Structure

```typescript
// src/pages/index.astro
---
import Layout from '../layouts/Base.astro'
import Hero from '../components/Hero.astro'
import { getFeaturedPosts } from '../lib/posts'
---

<Layout title="Home">
  <Hero />
  <section class="featured-posts">
    {
      (await getFeaturedPosts()).map(post => (
        <article>
          <h2><a href={`/posts/${post.slug}`}>{post.title}</a></h2>
          <p>{post.excerpt}</p>
        </article>
      ))
    }
  </section>
</Layout>
```

## Content Collections

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content'

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.boolean(),
    date: z.date(),
    tags: z.array(z.string()),
    image: z.string().optional(),
    author: z.string().default('Anonymous'),
  }),
})

const docsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    order: z.number(),
    section: z.string(),
  }),
})

export const collections = {
  blog: blogCollection,
  docs: docsCollection,
}
```

## Hybrid Rendering

```typescript
// src/pages/dashboard.astro
---
export const prerender = false

import DashboardLayout from '../layouts/Dashboard.astro'
import UserWidget from '../components/UserWidget'
---

<DashboardLayout>
  <UserWidget client:load />
</DashboardLayout>

// src/pages/about.astro
---
export const prerender = true
---

// src/pages/api/users.ts
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ params, request }) => {
  const users = await getUsers()
  return new Response(JSON.stringify(users), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## View Transitions

```typescript
// src/layouts/Base.astro
---
---
<!DOCTYPE html>
<html>
  <head>
    <meta name="view-transition" content="same-origin" />
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/blog">Blog</a>
    </nav>
    <main transition:name="content">
      <slot />
    </main>
  </body>
</html>

// src/pages/blog/[slug].astro
---
---
<article transition:name={`post-${slug}`}>
  <slot />
</article>
```

## Image Optimization

```typescript
---
import { Image, Picture } from 'astro:assets'
import heroImage from '../assets/hero.jpg'
---

<Image
  src={heroImage}
  alt="Hero image"
  width={1200}
  height={630}
  format="webp"
  quality={80}
/>

<Picture
  src={heroImage}
  widths={[400, 800, 1200]}
  sizes="(max-width: 800px) 100vw, 800px"
  formats={['avif', 'webp', 'jpeg']}
  alt="Responsive hero image"
/>
```

## Key Points

- Use content collections with Zod schemas for type safety
- Leverage hybrid rendering with per-page prerender config
- Use View Transitions for smooth page navigation
- Optimize images with Astro's built-in Image component
- Build API endpoints alongside pages in the same project
- Use client:* directives for interactive component islands
- Leverage Astro's scoped CSS by default
- Implement RSS feeds with the RSS package
- Use environment variables with Astro's runtime config
- Deploy to serverless or edge with adapter configuration
- Use middleware for request/response transformation
- Integrate with any UI framework via framework components
