# Web Components in Frameworks

## React Integration

```typescript
// React wrapper for web components
import { createElement, forwardRef, useEffect, useRef } from 'react'

interface WCProps {
  [key: string]: unknown
  children?: React.ReactNode
}

function createWC<T extends WCProps>(tagName: string) {
  return forwardRef<HTMLElement, T>((props, ref) => {
    const hostRef = useRef<HTMLElement>(null)
    const mergedRef = ref ?? hostRef

    useEffect(() => {
      const el = (mergedRef as React.RefObject<HTMLElement>).current
      if (!el) return

      // Set properties (not attributes) for complex types
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'children' || key === 'ref' || key === 'className' || key === 'style') return
        if (typeof value === 'object' || typeof value === 'boolean' || typeof value === 'function') {
          (el as any)[key] = value
        }
      })
    })

    return createElement(tagName, {
      ref: mergedRef,
      className: props.className,
      style: props.style,
      ...Object.fromEntries(
        Object.entries(props).filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
      ),
      children: props.children,
    })
  })
}

// Usage
const XCounter = createWC('x-counter')
;<XCounter value={5} min={0} max={10} />
```

## React with Events

```typescript
function useWCEvent<T = unknown>(
  ref: React.RefObject<HTMLElement>,
  eventName: string,
  handler: (detail: T) => void
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const wrapped = (e: Event) => handler((e as CustomEvent<T>).detail)
    el.addEventListener(eventName, wrapped)
    return () => el.removeEventListener(eventName, wrapped)
  }, [ref, eventName, handler])
}

// Usage
function CounterPage() {
  const ref = useRef<HTMLElement>(null)
  useWCEvent(ref, 'change', (detail: { value: number }) => {
    console.log('Counter changed:', detail.value)
  })

  return <x-counter ref={ref} value={0} min={0} max={10} />
}
```

## Vue Integration

```vue
<template>
  <x-counter
    :value="count"
    :min="0"
    :max="10"
    @change="onChange"
    ref="counterRef"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const count = ref(5)
const counterRef = ref<InstanceType<typeof HTMLElement>>()

const onChange = (e: CustomEvent) => {
  count.value = e.detail.value
}

onMounted(() => {
  // Set complex properties programmatically
  counterRef.value?.setAttribute('value', String(count.value))
})
</script>
```

## Angular Integration

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, AfterViewInit } from '@angular/core'

@Component({
  selector: 'app-counter',
  template: `
    <x-counter #counter
      [attr.value]="count"
      [attr.min]="0"
      [attr.max]="10"
      (change)="onChange($event)">
    </x-counter>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CounterComponent implements AfterViewInit {
  @ViewChild('counter') counterRef!: ElementRef<HTMLElement>
  count = 5

  ngAfterViewInit() {
    // Set complex properties
    // this.counterRef.nativeElement.someProperty = complexValue
  }

  onChange(event: Event) {
    this.count = (event as CustomEvent).detail.value
  }
}
```

## Svelte Integration

```svelte
<script>
  let count = 5

  function handleChange(event: CustomEvent) {
    count = event.detail.value
  }
</script>

<x-counter
  value={count}
  min={0}
  max={10}
  on:change={handleChange}
/>
```

## Lit Integration

```typescript
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('lit-counter')
export class LitCounter extends LitElement {
  @property({ type: Number }) value = 0
  @property({ type: Number }) min = 0
  @property({ type: Number }) max = 100

  render() {
    return html`
      <button ?disabled=${this.value <= this.min} @click=${() => this.value--}>−</button>
      <span>${this.value}</span>
      <button ?disabled=${this.value >= this.max} @click=${() => this.value++}>+</button>
    `
  }
}
```

## Library Comparison for Web Components

| Library | Bundle | Decorators | Reactive | Best For |
|---------|--------|------------|----------|----------|
| Vanilla | 0KB | No | Manual | Simple elements |
| Lit | ~5KB | Yes | Yes | Most projects |
| Stencil | 0KB (build-time) | Yes | Yes | Design systems |
| FAST | ~8KB | Yes | Yes | Microsoft stack |
| Hybrids | ~3KB | No | Yes | Functional approach |
| Svelte (custom elements) | Varies | No | Yes | Svelte projects |

## Cross-Framework Compatibility Rules

| Aspect | Rule |
|--------|------|
| Properties | Set primitive props via attributes, complex via properties (ref) |
| Events | Dispatch `CustomEvent` with `composed: true` and `bubbles: true` |
| Slots | Use named slots for flexibility |
| CSS | Expose parts via `part` attribute for external styling |
| Attributes | Reflect properties to attributes when possible |
| React | Create wrapper component to set properties via ref |
| Forms | Use `ElementInternals` for form participation |
| SSR | Support Declarative Shadow DOM |
