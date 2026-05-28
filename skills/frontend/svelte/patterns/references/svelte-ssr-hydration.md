# Svelte SSR and Hydration

## Overview

SvelteKit provides server-side rendering (SSR) out of the box. Pages are rendered on the server to HTML, sent to the browser, and then "hydrated" to become interactive. Unlike React's hydration (which re-runs every component on the client), SvelteKit's hydration is more efficient because it can reuse the server-rendered DOM without re-executing component logic.

## SSR Architecture

### Request Flow

```
1. Browser requests /page
2. SvelteKit server receives request
3. Server load functions run (+page.server.ts)
4. Component renders to HTML on server
5. HTML + serialized data sent to browser
6. Browser renders HTML (no JS needed for viewing)
7. SvelteKit client hydrates the page
8. Page becomes interactive
```

### What Runs Where

```
+page.server.ts   -> Server only (load function)
+page.ts          -> Server + Client (universal load)
+page.svelte      -> Server (SSR) + Client (hydration)
+layout.server.ts -> Server only
+layout.ts        -> Server + Client
+layout.svelte    -> Server + Client
hooks.server.ts   -> Server only
hooks.client.ts   -> Client only
```

## SvelteKit Load Functions

### Universal Load (+page.ts)

```ts
// +page.ts — runs on server for SSR, then on client for SPA navigation
export async function load({ fetch, url, params, route, depends }) {
  const response = await fetch(`/api/data?${url.searchParams}`)
  const data = await response.json()

  return { data }
}
```

### Server Load (+page.server.ts)

```ts
// +page.server.ts — runs only on server
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, cookies, request }) => {
  const user = locals.user  // From hooks handle
  const product = await db.product.findUnique({
    where: { id: params.id },
  })

  if (!product) {
    throw error(404, 'Product not found')
  }

  return {
    product,
    user,
    isAuthenticated: user !== null,
  }
}
```

### Load Function Parameters

| Parameter | Available In | Purpose |
|-----------|-------------|---------|
| params | Both | Route parameters |
| url | Both | Current URL |
| route | Both | Route ID |
| fetch | Both | Fetch with cookie forwarding |
| setHeaders | Server only | Set response headers |
| cookies | Server only | Read/write cookies |
| locals | Server only | App-level data from hooks |
| request | Server only | Original request |
| parent | Both | Data from parent layout loads |
| depends | Both | Invalidate on demand |

## Hydration in SvelteKit

### How Hydration Works

```svelte
<script>
  let { data } = $props()

  // This runs on both server and client
  // On server: renders the HTML
  // On client: hydrates from existing DOM
  let count = $state(0)
</script>

<h1>{data.title}</h1>
<button onclick={() => count++}>
  Clicks: {count}
</button>
```

SvelteKit's hydration:
1. Server renders HTML with all content visible
2. SvelteKit serializes the component state into the HTML
3. On the client, SvelteKit walks the existing DOM tree
4. It attaches event listeners without re-rendering components
5. Only components with reactive state (signals, stores) are hydrated

### Hydration vs CSR

```svelte
<!-- This component will hydrate — it has state -->
<script>
  let count = $state(0)
</script>

<button onclick={() => count++}>{count}</button>

<!-- This component will NOT hydrate — pure HTML -->
<script>
  let { title } = $props()
</script>

<h1>{title}</h1>
```

SvelteKit optimizes hydration by skipping components that have no reactive state. This means static content doesn't pay the hydration cost.

## SSR Performance Optimization

### Streaming

```svelte
<script>
  let { data } = $props()

  // data.criticalData is awaited before sending HTML
  // data.nonCriticalData streams in later
</script>

<h1>{data.criticalData.title}</h1>

{#await data.nonCriticalData}
  <p>Loading more content...</p>
{:then more}
  <p>{more.content}</p>
{/await}
```

SvelteKit supports streaming responses. The server can send the HTML shell immediately and stream in additional content as it becomes available.

### Prerendering

```ts
// +page.ts or +page.server.ts
export const prerender = true

// Also for entire routes in layout:
// export const prerender = true
```

Prerendered pages are converted to static HTML at build time. They require no server resources at runtime.

### SSG vs SSR per Route

```ts
// Static (default)
export const prerender = true

// Server-rendered
export const prerender = false

// Both (pre-render first request, then handle dynamically)
export const prerender = 'auto'
```

### Cache Headers

```ts
// +page.server.ts
export const load: PageServerLoad = async ({ setHeaders }) => {
  const data = await getData()

  setHeaders({
    'Cache-Control': 'public, max-age=300, s-maxage=3600',
  })

  return data
}
```

## SPA Mode (CSR Only)

```ts
// svelte.config.js
import adapter from '@sveltejs/adapter-static'

export default {
  kit: {
    adapter: adapter({
      fallback: 'index.html',  // SPA fallback
    }),
  },
}
```

```ts
// +layout.ts
export const prerender = true
export const ssr = false  // Disable SSR for this route
```

With `ssr = false`, the component renders only on the client. No server-rendered HTML is generated for this route.

## Form Actions (SSR Mutations)

### Server Form Action

```ts
// +page.server.ts
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Validate
    if (!email || !password) {
      return {
        status: 400,
        errors: {
          email: !email ? 'Email is required' : undefined,
          password: !password ? 'Password is required' : undefined,
        },
      }
    }

    // Process
    const user = await db.user.create({ data: { email, password } })

    // Set session cookie
    cookies.set('session', generateToken(user), {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })

    // Redirect on success
    throw redirect(303, '/dashboard')
  },
}
```

### Progressive Enhancement

```svelte
<script>
  import { enhance } from '$app/forms'

  let { form } = $props()
</script>

<form method="POST" use:enhance>
  <input name="email" type="email" />
  {#if form?.errors?.email}
    <p class="error">{form.errors.email}</p>
  {/if}
  <input name="password" type="password" />
  {#if form?.errors?.password}
    <p class="error">{form.errors.password}</p>
  {/if}
  <button type="submit">Login</button>
</form>
```

The `use:enhance` action enables progressive enhancement:
- Without JavaScript: normal form post
- With JavaScript: fetches via fetch(), updates page without full reload
- Shows loading states automatically

## Data Serialization

### What Gets Serialized

```ts
// +page.server.ts
export const load: PageServerLoad = async () => {
  return {
    // Primitives — serialized as JSON
    name: 'Alice',
    count: 42,
    isActive: true,

    // Objects — serialized as JSON
    user: { id: '1', name: 'Alice' },

    // Dates — serialized to ISO string
    createdAt: new Date(),

    // Maps and Sets — NOT serializable
    // map: new Map(),  // Will throw

    // Functions — NOT serializable
    // handler: () => {},  // Will throw
  }
}
```

### Structured Clone Algorithm

SvelteKit uses the structured clone algorithm for serialization:
- Supported: Objects, Arrays, Primitives, Date, RegExp, Map, Set, Blob, File, ArrayBuffer
- Not supported: Functions, DOM elements, Symbols, WeakMap, WeakSet

## Error Handling in SSR

### Expected Errors

```ts
// +page.server.ts
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ params }) => {
  const product = await db.product.findUnique({
    where: { id: params.id },
  })

  if (!product) {
    throw error(404, {
      message: 'Product not found',
      code: 'PRODUCT_NOT_FOUND',
    })
  }

  return { product }
}
```

### Error Pages

```svelte
<!-- +error.svelte — route-level error page -->
<script>
  import { page } from '$app/stores'
  let { error: err } = $props()
</script>

<h1>{err.message}</h1>
<p>Status: {$page.status}</p>
```

## SSR vs Hydration Differences

### Browser-Only Code

```svelte
<script>
  import { browser } from '$app/environment'

  let windowWidth = $state(0)

  if (browser) {
    // This code runs only in the browser
    windowWidth = window.innerWidth
  }
</script>
```

### onMount for Client-Only Logic

```svelte
<script>
  import { onMount } from 'svelte'

  let map = $state(null)

  onMount(() => {
    // This runs only on the client after hydration
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 40.7, lng: -74 },
      zoom: 12,
    })
  })
</script>

<div id="map" />
```

### CSR-Only Components

```svelte
<script>
  import { browser } from '$app/environment'

  let { data } = $props()
</script>

{#if browser}
  <ClientOnlyComponent {data} />
{/if}
```

## Performance Metrics

### SSR Timings

| Operation | Typical Duration |
|-----------|-----------------|
| Server load function | 20-200ms (DB/API) |
| Component rendering | 5-50ms |
| HTML serialization | 1-5ms |
| Total SSR time | 26-255ms |

### Hydration Timings

| Operation | Typical Duration |
|-----------|-----------------|
| HTML parsing | 10-50ms (browser) |
| JS download | 50-500ms (depends on size) |
| Hydration | 10-100ms |
| Total TTI | 70-650ms |

### Optimization Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | <1.5s |
| Time to Interactive (TTI) | <3.5s |
| Server response time | <200ms |
| JS bundle size | <100KB |
| HTML size | <50KB |

## SvelteKit SSR Configuration

```ts
// svelte.config.js
import adapter from '@sveltejs/adapter-node'

export default {
  kit: {
    adapter: adapter({
      precompress: true,  // Brotli + Gzip
    }),

    // SSR configuration
    prerender: {
      crawl: true,
      entries: ['*'],
      onError: 'fail',
    },

    // CSP headers
    csp: {
      mode: 'nonce',
      directives: {
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
      },
    },
  },
}
```

## Summary

| Concept | SvelteKit SSR | Notes |
|---------|---------------|-------|
| Server load | +page.server.ts | DB, secrets, redirects |
| Universal load | +page.ts | Public API fetch |
| Client load | onMount | Browser-only data |
| Prerendering | prerender = true | Static HTML generation |
| Streaming | #await data.promise | Non-critical content |
| Form actions | actions in +page.server.ts | SSR mutations |
| Progressive enhancement | use:enhance | Works without JS |
| Error handling | throw error(n, msg) | Expected errors |
| Cache headers | setHeaders() | CDN/browser caching |
