# Alpine.js Deployment

## Build Options

### CDN (Default)

```html
<!-- Production CDN -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

| Approach | Bundle Size | Build Step | Best For |
|----------|------------|------------|----------|
| CDN | ~14kB min+gz | None | Simple pages, prototypes |
| NPM + Bundle | ~12kB min+gz | Yes | Larger apps, TypeScript |
| Module CDN | ~15kB min+gz | None | ES modules, import maps |

### NPM Build

```bash
npm install alpinejs
```

```js
// src/app.js
import Alpine from 'alpinejs'
import './components/dropdown'
import './components/modal'

Alpine.start()
```

```js
// vite.config.js
import { defineConfig } from 'vite'
export default defineConfig({
  build: { rollupOptions: { input: 'src/app.js', output: { dir: 'dist' } } }
})
```

## Production Optimization

| Technique | Implementation |
|-----------|---------------|
| Minify HTML | Use backend middleware or SSI |
| HTTP/2 | CDN or reverse proxy |
| Defer Alpine | Defer attribute on script tag |
| Critical CSS | Inline above-the-fold styles |
| Bundle splitting | Split Alpine.data() definitions |

## Alpine + Backend Integration

### Laravel

```blade
<!-- layouts/app.blade.php -->
<script defer src="{{ asset('js/alpine.min.js') }}"></script>
@stack('scripts')
```

### Django

```html
{% load static %}
<script defer src="{% static 'js/alpine.min.js' %}"></script>
```

## Performance Budgets

| Asset | Target |
|-------|--------|
| Alpine.js bundle | <15kB |
| Total JS | <50kB |
| First paint | <1.5s |
| Alpine init time | <100ms |

## Security

```html
<!-- CSP: allow inline scripts with nonce -->
<script defer src="alpine.js" nonce="{{ csp_nonce }}"></script>
<meta http-equiv="Content-Security-Policy"
      content="script-src 'nonce-{{ csp_nonce }}' 'unsafe-inline';">
```

## Framework Detection

```html
<!-- Prevent FOUC -->
<style>[x-cloak] { display: none !important; }</style>
```

## Deployment Checklist

- [ ] Alpine.js version pinned (e.g., `@3.14.8`)
- [ ] CSP headers configured if used
- [ ] `[x-cloak]` CSS rule present
- [ ] CDN integrity hash if using CDN
- [ ] No x-init errors in browser console
- [ ] Alpine plugin versions match Alpine version
- [ ] Backend CSRF tokens passed to Alpine store
- [ ] Minified bundle used in production
