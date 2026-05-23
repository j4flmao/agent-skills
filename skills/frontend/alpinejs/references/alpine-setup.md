# Alpine.js Setup Guide

## Installation Options

### CDN (Recommended for simplicity)

```html
<!-- Latest v3 -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- Specific version -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"></script>
```

Place before closing `</body>` tag or in `<head>` with `defer` attribute.

### npm + Bundler

```bash
npm install alpinejs
```

```js
// app.js
import Alpine from 'alpinejs'
import './components/dropdown'
import './components/modal'

window.Alpine = Alpine
Alpine.start()
```

### Laravel + Vite

```bash
composer require laravel/breeze --dev
php artisan breeze:install alpine
npm install && npm run dev
```

## Basic HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alpine App</title>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body>
  <div x-data="{ message: 'Hello Alpine!' }">
    <h1 x-text="message"></h1>
  </div>
</body>
</html>
```

## Directory Structure (npm)

```
src/
  js/
    app.js              # Alpine init, store registration
    components/
      dropdown.js       # Alpine.data('dropdown', ...)
      modal.js
    stores/
      auth.js           # Alpine.store(...)
  index.html
package.json
vite.config.js
```

## Global Alpine Object

```js
// Register new data component
Alpine.data('dropdown', () => ({
  open: false,
  toggle() { this.open = !this.open },
  close() { this.open = false },
}))

// Register global store
Alpine.store('theme', {
  dark: false,
  toggle() { this.dark = !this.dark },
})

// Magic methods
Alpine.magic('now', () => new Date().toLocaleString())

// Lifecycle hooks
document.addEventListener('alpine:init', () => {
  console.log('Alpine initialized')
})
```

## Plugins

### Mask Plugin

```bash
npm install @alpinejs/mask
```

```js
import Alpine from 'alpinejs'
import mask from '@alpinejs/mask'
Alpine.plugin(mask)
Alpine.start()
```

```html
<input x-mask="(999) 999-9999" placeholder="Phone">
```

### Collapse Plugin

```bash
npm install @alpinejs/collapse
```

```html
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open" x-collapse>
    Collapsible content
  </div>
</div>
```

### Intersect Plugin

```bash
npm install @alpinejs/intersect
```

```html
<div x-data="{ visible: false }"
     x-intersect="visible = true"
     x-show="visible"
     x-transition>
  Animate in on scroll
</div>
```

### Persist Plugin

```bash
npm install @alpinejs/persist
```

```html
<div x-data="{ theme: $persist('light').as('theme-pref') }">
  <button @click="theme = theme === 'light' ? 'dark' : 'light'">
    <span x-text="theme"></span>
  </button>
</div>
```

## ESM Import Map (CDN, no build)

```html
<script type="importmap">
{
  "imports": {
    "alpinejs": "https://cdn.jsdelivr.net/npm/alpinejs@3/dist/alpine.esm.js",
    "@alpinejs/collapse": "https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3/dist/collapse.esm.js"
  }
}
</script>
<script type="module">
  import Alpine from 'alpinejs'
  import collapse from '@alpinejs/collapse'
  Alpine.plugin(collapse)
  Alpine.start()
</script>
```

## DevTools

- **Alpine.js DevTools** browser extension (Chrome/Firefox)
- Debug with `Alpine.debug = true` in console
- Use `$el` magic property to inspect the DOM element
- Use `__Alpine` global to inspect internal state

## TypeScript Support

```ts
// alpine.d.ts
declare module 'alpinejs' {
  interface AlpineStore {
    user: {
      name: string
      loggedIn: boolean
      login(name: string): void
      logout(): void
    }
    theme: {
      dark: boolean
      toggle(): void
    }
  }

  interface Stores {
    user: AlpineStore['user']
    theme: AlpineStore['theme']
  }
}
```

## Build Tooling

### Vite Config

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: ['src/js/app.js', 'src/index.html'],
    },
  },
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## Browser Support

Alpine.js 3.x supports:
- Chrome 77+
- Firefox 78+
- Safari 13.1+
- Edge 79+
- IE11 (not supported)

It uses Proxy for reactivity, which cannot be polyfilled for older browsers.
