# Svelte Component Patterns

## Component Composition

```svelte
<script lang="ts">
  interface CardProps {
    variant?: 'default' | 'elevated' | 'bordered'
    padding?: 'sm' | 'md' | 'lg'
  }

  let { variant = 'default', padding = 'md', children }: CardProps = $props()

  const variantClasses = {
    default: 'bg-white',
    elevated: 'bg-white shadow-lg',
    bordered: 'bg-white border border-gray-200',
  }

  const paddingClasses = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  }
</script>

<div class="card {variantClasses[variant]} {paddingClasses[padding]}">
  {#if $$slots.header}
    <div class="card-header">
      {@render children.header?.()}
    </div>
  {/if}
  <div class="card-body">
    {@render children.default?.()}
  </div>
  {#if $$slots.footer}
    <div class="card-footer">
      {@render children.footer?.()}
    </div>
  {/if}
</div>
```

## Event Handling

```svelte
<script lang="ts">
  function handleClick(event: MouseEvent) {
    console.log('Clicked at', event.clientX, event.clientY)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleAction()
    }
  }

  let inputValue = $state('')

  function handleInput(event: Event) {
    inputValue = (event.target as HTMLInputElement).value
  }
</script>

<button onclick={handleClick} onkeydown={handleKeydown}>
  Click me
</button>

<input oninput={handleInput} bind:value={inputValue} />

<div class:active={isActive} class:disabled={isDisabled}>
  Dynamic classes
</div>
```

## Transition and Animation

```svelte
<script lang="ts">
  import { fade, slide, fly, scale } from 'svelte/transition'
  import { flip } from 'svelte/animate'
  import { crossfade } from 'svelte/transition'

  let visible = $state(false)
  let items = $state(['Item 1', 'Item 2', 'Item 3'])

  const [send, receive] = crossfade({ duration: 300 })
</script>

<button onclick={() => visible = !visible}>
  Toggle
</button>

{#if visible}
  <div in:fly={{ y: 20, duration: 300 }} out:fade={{ duration: 200 }}>
    Animated content
  </div>
{/if}

<div transition:slide>
  {#each items as item (item)}
    <div animate:flip>{item}</div>
  {/each}
</div>
```

## Key Points

- Use bind:value for two-way form bindings
- Use on:click syntax or onclick attribute for events
- Use transition directives for enter/leave animations
- Use animate:flip for list reordering animations
- Use class:name directive for conditional classes
- Use use:action for reusable DOM behaviors
- Leverage two-way binding with bind:group for radio groups
- Use bind:this for component references
- Use bind:clientWidth for reactive dimension tracking
- Use onMount for initialization and onDestroy for cleanup
- Use tick() for DOM state after state changes
- Use beforeUpdate and afterUpdate for DOM timing
