# Svelte Components — Slots, Context, Lifecycle, Events, Actions, Transitions

## Slots / Snippets (Svelte 5)

```svelte
<!-- Button.svelte -->
<script>
  let { children }: { children?: import('svelte').Snippet } = $props()
</script>

<button>
  {@render children?.()}
</button>

<!-- Named snippets -->
<script>
  let { header, default: children }: {
    header?: import('svelte').Snippet
    default?: import('svelte').Snippet
  } = $props()
</script>

<div class="card">
  <div class="header">{@render header?.()}</div>
  <div class="body">{@render children?.()}</div>
</div>

<!-- Usage -->
<Card>
  {#snippet header()}<h2>Title</h2>{/snippet}
  <p>Content</p>
</Card>
```

## Context API

```svelte
<script>
  // context.svelte.js
  import { getContext, setContext } from 'svelte'

  const AUTH_KEY = Symbol('auth')

  export function setAuth(auth: Auth) {
    setContext(AUTH_KEY, auth)
  }

  export function getAuth(): Auth {
    return getContext(AUTH_KEY)
  }
</script>

<!-- Provider -->
<script>
  import { setAuth } from './context.svelte.js'
  let user = $state({ name: 'Alice' })
  setAuth(user)
</script>

<slot />

<!-- Consumer -->
<script>
  import { getAuth } from './context.svelte.js'
  let user = getAuth()
</script>

<p>{user.name}</p>
```

## Lifecycle

```svelte
<script>
  import { onMount, onDestroy, tick } from 'svelte'

  let el = $state<HTMLElement>()

  onMount(() => {
    console.log('Mounted', el)
    return () => console.log('Cleanup on unmount')
  })

  onDestroy(() => {
    console.log('Destroyed')
  })

  async function handleClick() {
    // tick() — wait for DOM to update
    await tick()
    console.log('DOM updated')
  }
</script>

<div bind:this={el}>Content</div>
```

## Events

```svelte
<!-- In parent -->
<script>
  function handleGreet(event: CustomEvent<string>) {
    console.log(event.detail)  // 'Hello!'
  }
</script>

<Child ongreet={handleGreet} />

<!-- Child — Svelte 4 style -->
<svelte:options accessors={true} />
<script>
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()
</script>
<button onclick={() => dispatch('greet', 'Hello!')}>Greet</button>

<!-- Child — Svelte 5 callback prop -->
<script>
  let { ongreet }: { ongreet?: (msg: string) => void } = $props()
</script>
<button onclick={() => ongreet?.('Hello!')}>Greet</button>
```

## Actions — Reusable DOM Behavior

```svelte
<script>
  function clickOutside(node: HTMLElement, callback: () => void) {
    function handler(e: MouseEvent) {
      if (!node.contains(e.target as Node)) callback()
    }
    document.addEventListener('click', handler)
    return {
      destroy() { document.removeEventListener('click', handler) },
      update(newCallback: () => void) { callback = newCallback },
    }
  }

  let open = $state(false)
</script>

<div use:clickOutside={() => open = false}>
  <p>This menu closes when clicking outside</p>
</div>
```

## Transitions

```svelte
<script>
  import { fade, slide, scale, fly } from 'svelte/transition'
  let visible = $state(false)
</script>

<button onclick={() => visible = !visible}>Toggle</button>

{#if visible}
  <div transition:fade={{ duration: 300 }}>Fade</div>
  <div transition:slide>Slide</div>
  <div transition:scale={{ start: 0.5 }}>Scale</div>
  <div transition:fly={{ x: 200, duration: 500 }}>Fly</div>
{/if}

<!-- In/out transitions -->
<div in:fly={{ y: -50 }} out:slide>Content</div>
```
