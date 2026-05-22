# Astro Islands — Client Directives, Hydration Strategies, Framework Components

## Client Directives

Controls when and how framework components hydrate:

| Directive | Behavior |
|-----------|----------|
| `client:load` | Hydrates immediately on page load |
| `client:idle` | Hydrates when browser is idle (requestIdleCallback) |
| `client:visible` | Hydrates when element enters viewport |
| `client:media` | Hydrates only when media query matches |
| `client:only` | Skips SSR, renders only on client |

```astro
---
import ReactCounter from '../components/ReactCounter.tsx'
import VueSlider from '../components/VueSlider.vue'
import SvelteAccordion from '../components/SvelteAccordion.svelte'
---

<!-- Hydrates immediately -->
<ReactCounter client:load />

<!-- Hydrates when browser is idle (default pattern) -->
<VueSlider client:idle />

<!-- Hydrates when scrolled into view -->
<SvelteAccordion client:visible />

<!-- Hydrates only on desktop -->
<ReactCounter client:media="(min-width: 768px)" />

<!-- Skip SSR entirely, render only on client -->
<ReactCounter client:only="react" />
```

## Framework Component Props

```astro
---
import ReactCard from '../components/ReactCard.tsx'
---

<ReactCard
  client:load
  title="Hello"
  count={42}
  items={['a', 'b', 'c']}
  visible={true}
  data={{ key: 'value' }}
  onEvent={(e: Event) => console.log(e)}
/>
```

## Slot Patterns

```astro
---
import ReactModal from '../components/ReactModal.tsx'
---

<ReactModal client:idle>
  <p slot="title">Modal Title</p>
  <p>Main content (default slot)</p>
  <button slot="footer">Close</button>
</ReactModal>
```

## Island Scoping

Each island is independent — no shared global JS state:

```astro
---
// Each island gets its own React root
---

<ReactCounter client:load />  <!-- separate React root -->
<ReactCounter client:load />  <!-- separate React root -->
```

## Preventing Layout Shift

Always provide sizing hints for islands:

```astro
<ReactChart client:visible style="width: 100%; height: 400px;" />
```

## Framework Interop

Astro supports React, Vue, Svelte, SolidJS, Preact, Lit, and more. Configure in `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vue from '@astrojs/vue'
import svelte from '@astrojs/svelte'

export default defineConfig({
  integrations: [react(), vue(), svelte()],
})
```

## Minimal JS Output

Use `client:only` for pages that are entirely interactive (dashboards, editors). Use `client:visible` for below-the-fold components. Default to no directive when possible — Astro renders HTML/ CSS without JS.

## Debugging Hydration

Check the Network tab for individual framework chunks. Each island loads its own framework runtime lazily. Use `client:load` sparingly — prefer `client:idle` or `client:visible`.
