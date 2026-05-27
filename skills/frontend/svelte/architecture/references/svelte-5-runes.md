# Svelte 5 Runes

## $state and $derived

```svelte
<script lang="ts">
  let count = $state(0)
  let doubled = $derived(count * 2)

  function increment() {
    count += 1
  }

  $effect(() => {
    console.log(`Count is now ${count}`)
  })
</script>

<div>
  <p>Count: {count}</p>
  <p>Doubled: {doubled}</p>
  <button onclick={increment}>Increment</button>
</div>
```

## $props

```svelte
<script lang="ts">
  interface UserCardProps {
    user: {
      id: string
      name: string
      email: string
      avatar?: string
    }
    variant?: 'compact' | 'full'
    onSelect?: (id: string) => void
  }

  let { user, variant = 'compact', onSelect }: UserCardProps = $props()
</script>

<div class="user-card {variant}">
  {#if user.avatar}
    <img src={user.avatar} alt={user.name} />
  {/if}
  <h3>{user.name}</h3>
  {#if variant === 'full'}
    <p>{user.email}</p>
  {/if}
  {#if onSelect}
    <button onclick={() => onSelect(user.id)}>Select</button>
  {/if}
</div>
```

## $effect

```svelte
<script lang="ts">
  let searchQuery = $state('')
  let searchResults = $state([])
  let isLoading = $state(false)

  $effect(() => {
    if (!searchQuery) {
      searchResults = []
      return
    }

    isLoading = true
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${searchQuery}`, {
          signal: controller.signal,
        })
        searchResults = await res.json()
      } catch {
        // handle error
      } finally {
        isLoading = false
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  })
</script>

<input bind:value={searchQuery} placeholder="Search..." />
{#if isLoading}
  <div>Searching...</div>
{/if}
<ul>
  {#each searchResults as result}
    <li>{result.name}</li>
  {/each}
</ul>
```

## Snippets and Render Functions

```svelte
<script lang="ts">
  let { data, children } = $props()
</script>

{#snippet tableRow(item: { id: string; name: string; email: string })}
  <tr>
    <td>{item.name}</td>
    <td>{item.email}</td>
  </tr>
{/snippet}

<table>
  <thead>
    <tr><th>Name</th><th>Email</th></tr>
  </thead>
  <tbody>
    {#each data as item}
      {@render tableRow(item)}
    {/each}
  </tbody>
</table>

<div>
  {@render children?.()}
</div>
```

## Key Points

- Use $state for reactive local state
- Use $derived for computed values
- Use $effect for side effects with cleanup
- Use $props for component props with TypeScript
- Use snippets for reusable template fragments
- Use bind:value for two-way form bindings
- Use {#each} with keys for list rendering
- Use {#if} for conditional rendering
- Use {#await} for promise handling in templates
- Use $inspect for debugging reactive state
- Implement cleanup functions in $effect
- Use TypeScript generics with snippets for type safety
