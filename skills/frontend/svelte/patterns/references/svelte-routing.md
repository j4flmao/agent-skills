# Svelte Routing Patterns

## SvelteKit Routing (Built-in)

```
src/routes/
  +page.svelte              ->  /
  +layout.svelte            ->  Root layout
  about/
    +page.svelte            ->  /about
  blog/
    +page.svelte            ->  /blog
    [slug]/
      +page.svelte          ->  /blog/:slug
    [slug]/comments/
      +page.svelte          ->  /blog/:slug/comments
    tags/[tag]/
      +page.svelte          ->  /blog/tags/:tag
  (app)/
    +layout.svelte          ->  Pathless layout (group)
    dashboard/
      +page.svelte          ->  /dashboard
    profile/
      +page.svelte          ->  /profile
```

## Navigation

```svelte
<script>
  import { page } from '$app/stores'
  import { goto, invalidate } from '$app/navigation'
  import { navigating } from '$app/stores'

  let search = $state('')

  function handleSearch() {
    goto(`/search?q=${search}`)
  }
</script>

<nav>
  <a href="/">Home</a>
  <a href="/blog" aria-current={$page.url.pathname.startsWith('/blog')}>Blog</a>
</nav>

{#if $navigating}
  <div class="loading-bar" />
{/if}
```

## Route Parameters

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  import { page } from '$app/stores'
  let { data } = $props()

  // Access route params
  let slug = $derived($page.params.slug)
</script>
```

## Search Params

```svelte
<script>
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'

  let query = $derived($page.url.searchParams.get('q') || '')

  function updateQuery(e: Event) {
    const value = (e.target as HTMLInputElement).value
    goto(`?q=${value}`, { replaceState: true })
  }
</script>

<input value={query} oninput={updateQuery} />
```

## Route Guards (Layout)

```svelte
<!-- src/routes/(authenticated)/+layout.svelte -->
<script>
  import { redirect } from '@sveltejs/kit'
  let { data, children } = $props()

  if (!data.user) {
    redirect(302, '/login')
  }
</script>

{@render children()}
```

## Custom Router (Standalone Svelte)

```svelte
<script>
  import { writable } from 'svelte/store'

  const route = writable(window.location.pathname)

  function navigate(href: string) {
    history.pushState({}, '', href)
    route.set(href)
  }

  window.addEventListener('popstate', () => route.set(window.location.pathname))
</script>

{#if $route === '/'}
  <Home />
{:else if $route === '/about'}
  <About />
{:else}
  <NotFound />
{/if}
```
