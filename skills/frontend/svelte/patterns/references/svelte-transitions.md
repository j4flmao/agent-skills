# Svelte Transitions — Transition, Animation, InView Directives, Custom Transitions

## Built-In Transitions

```svelte
<script>
  import { fade, slide, scale, fly, blur, crossfade } from 'svelte/transition'
  import { flip } from 'svelte/animate'
  import { inView } from 'svelte/inview'
  let visible = $state(false)
  let items = $state(['A', 'B', 'C'])
</script>

<button onclick={() => visible = !visible}>Toggle</button>

{#if visible}
  <!-- fade: opacity transition -->
  <div transition:fade={{ duration: 300 }}>Fade</div>

  <!-- slide: slide up/down with height -->
  <div transition:slide={{ duration: 200 }}>Slide</div>

  <!-- scale: scale from start -->
  <div transition:scale={{ start: 0.5, duration: 300 }}>Scale</div>

  <!-- fly: move and fade -->
  <div transition:fly={{ x: 200, y: -50, duration: 500 }}>Fly in</div>

  <!-- blur: blur and fade -->
  <div transition:blur={{ amount: 10, duration: 300 }}>Blur in</div>
{/if}

<!-- In/out separate -->
<div in:fly={{ y: -50 }} out:slide>Content</div>
```

## Keyed Each Blocks — List Transitions

```svelte
<script>
  import { flip } from 'svelte/animate'
  import { slide } from 'svelte/transition'

  let todos = $state([
    { id: 1, text: 'Learn Svelte' },
    { id: 2, text: 'Build app' },
  ])

  function addTodo() {
    todos = [...todos, { id: Date.now(), text: 'New todo' }]
  }

  function removeTodo(id: number) {
    todos = todos.filter(t => t.id !== id)
  }

  function shuffle() {
    todos = [...todos].reverse()
  }
</script>

<button onclick={addTodo}>Add</button>
<button onclick={shuffle}>Shuffle</button>

{#each todos as todo (todo.id)}
  <div
    transition:slide
    animate:flip={{ duration: 300 }}
  >
    {todo.text}
    <button onclick={() => removeTodo(todo.id)}>x</button>
  </div>
{/each}
```

## InView Directive

```svelte
<script>
  import { inView } from 'svelte/inview'

  let isVisible = $state(false)

  function onEnter() { isVisible = true }
  function onLeave() { isVisible = false }
</script>

<div
  use:inView={{
    threshold: 0.3,
    once: false,
  }}
  oninview={() => onEnter()}
  onoutview={() => onLeave()}
  class:visible={isVisible}
>
  Content animates in when visible
</div>
```

## Custom Transition Function

```svelte
<script>
  function typewriter(node: HTMLElement, { speed = 50 }) {
    const text = node.textContent ?? ''
    const total = text.length
    return {
      duration: total * speed,
      tick: (t: number) => {
        const chars = Math.floor(t * total)
        node.textContent = text.slice(0, chars)
      },
    }
  }

  let visible = $state(false)
</script>

<button onclick={() => visible = !visible}>Toggle</button>

{#if visible}
  <div transition:typewriter={{ speed: 30 }}>
    Hello, this text types itself in!
  </div>
{/if}
```

## Crossfade

```svelte
<script>
  import { crossfade } from 'svelte/transition'

  const [send, receive] = crossfade({
    duration: 400,
    fallback: (node) => ({ duration: 200 }),
  })

  let items = $state([1, 2, 3])

  function moveItem(id: number) {
    items = items.filter(i => i !== id)
  }
</script>

<!-- Source list -->
{#each items as item (item)}
  <div
    in:receive={{ key: item }}
    out:send={{ key: item }}
    onclick={() => moveItem(item)}
  >
    Item {item}
  </div>
{/each}
```

## Transition Events

```svelte
<div
  transition:fade
  onintrostart={() => console.log('start')}
  onintroend={() => console.log('end')}
  onoutrostart={() => console.log('outro start')}
  onoutroend={() => console.log('outro end')}
>
  Content
</div>
```
