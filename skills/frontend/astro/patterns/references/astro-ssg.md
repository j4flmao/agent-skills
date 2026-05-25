# Astro SSG Patterns

## Static Site Generation

Astro is zero-JS by default — every page is pre-rendered to static HTML at build time.

```astro
---
// All frontmatter runs at build time
const content = await fetch('https://api.example.com/content').then(r => r.json())
---

<html>
  <body>
    <h1>{content.title}</h1>
    <p>{content.body}</p>
  </body>
</html>
```

## Dynamic Page Generation

```astro
---
export async function getStaticPaths() {
  const posts = await getCollection('blog')
  const totalPages = Math.ceil(posts.length / 10)

  // Generate all page paths at build time
  const paths = []
  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * 10
    const pagePosts = posts.slice(start, start + 10)
    paths.push({
      params: { page: String(page) },
      props: { posts: pagePosts, currentPage: page, totalPages },
    })
  }
  return paths
}

const { posts, currentPage, totalPages } = Astro.props
---

{posts.map(post => <BlogCard post={post} />)}
{pagination}
```

## RSS Feed (SSG)

```astro
---
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return rss({
    title: 'Blog',
    description: 'Latest posts',
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

## Sitemap Generation

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap'
export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap()],
})
```

## Build Output

```bash
npm run build
# Output: dist/
#   dist/index.html
#   dist/blog/post-1/index.html
#   dist/blog/tags/astro/index.html
#   dist/_astro/ (hashed assets)
```

## Incremental Static Regeneration (ISR)

```js
// For adapters that support ISR (Vercel, Netlify)
export async function GET({ params }) {
  const data = await fetchData()
  return new Response(JSON.stringify(data), {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
```

## Performance Targets for SSG

| Metric | Target |
|--------|--------|
| Build time (100 pages) | <30s |
| Zero JS output | 0kB JS |
| Page weight (SSG) | <50kB HTML |
| Lighthouse | 100/100 |

## SSG Best Practices

1. All data fetching in frontmatter (runs at build time)
2. Use `getStaticPaths()` for dynamic routes
3. Set `output: 'static'` in astro.config.mjs (default)
4. Use `@astrojs/sitemap` for SEO
5. Deploy to any static host (Netlify, Vercel, S3, GitHub Pages)
6. Client components use `client:only` or `client:load` for interactivity
7. No server runtime needed — pure HTML output
