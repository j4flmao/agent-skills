# Astro Data Loading

## Static Data Loading

```typescript
// src/lib/posts.ts
import { getCollection } from 'astro:content'

export async function getAllPosts() {
  const posts = await getCollection('blog', ({ data }) => {
    return data.published === true
  })

  return posts
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

export async function getFeaturedPosts(limit = 6) {
  const posts = await getAllPosts()
  return posts.slice(0, limit)
}

export async function getPostBySlug(slug: string) {
  const posts = await getAllPosts()
  return posts.find(post => post.slug === slug)
}
```

## Server-Side Data Fetching

```typescript
// src/pages/api/search.astro
---
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q')

  if (!query) {
    return new Response(null, { status: 400 })
  }

  const results = await searchPosts(query)
  const html = results.map(post => `
    <a href="/posts/${post.slug}" class="search-result">
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
    </a>
  `).join('')

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}

// src/pages/users/[id].astro
---
import type { GetStaticPaths } from 'astro'

export const getStaticPaths = (async () => {
  const users = await fetch('https://api.example.com/users').then(r => r.json())
  return users.map((user: { id: string }) => ({
    params: { id: user.id },
    props: { user },
  }))
}) satisfies GetStaticPaths

const { user } = Astro.props
---
```

## Environment Variables

```typescript
// src/env.d.ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string
  readonly API_SECRET: string
  readonly DATABASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Usage in pages
---
const apiUrl = import.meta.env.PUBLIC_API_URL
const response = await fetch(`${apiUrl}/users`)
const users = await response.json()
---
```

## External API Integration

```typescript
// src/lib/api.ts
import { z } from 'astro:content'

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
})

type User = z.infer<typeof UserSchema>

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('https://api.example.com/users')
  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data = await response.json()
  const result = z.array(UserSchema).safeParse(data)

  if (!result.success) {
    console.error('API validation failed:', result.error)
    return []
  }

  return result.data
}
```

## Key Points

- Use getCollection for type-safe content queries
- Leverage getStaticPaths for dynamic static routes
- Validate API responses with Zod schemas
- Use environment variables with proper PUBLIC prefix
- Implement pagination for large datasets
- Cache API responses to reduce external calls
- Use SSR mode for dynamic data requirements
- Handle loading states with conditional rendering
- Use Astro.cookies for server-side cookie access
- Implement search with API routes and HTMX
- Stream responses for large datasets
- Use CDN caching headers for static content
