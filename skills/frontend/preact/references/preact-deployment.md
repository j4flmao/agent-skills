# Preact Deployment

## Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['preact', '@preact/signals'],
          ui: ['preact/compat'],
        },
      },
    },
    target: 'es2020',
    minify: 'esbuild',
  },
})
```

## Bundle Size Comparison

| Framework | Min+gz |
|-----------|--------|
| Preact | ~3kB |
| Preact + Signals | ~5kB |
| Preact + Compat | ~5kB |
| React | ~42kB |
| React + ReactDOM | ~45kB |

## Compat Configuration

```ts
// vite.config.ts — for React ecosystem libs
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
    },
  },
})
```

## SSR with Preact

```tsx
// server/render.tsx
import { render } from 'preact-render-to-string'
import { App } from '../src/App'

export function renderApp(url: string) {
  const html = render(<App url={url} />)
  return `<!DOCTYPE html>
    <html><head><title>Preact App</title></head>
    <body>
      <div id="root">${html}</div>
      <script type="module" src="/assets/index.js"></script>
    </body></html>`
}
```

## Deployment Targets

### Static Hosting

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Docker

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial JS (preact only) | <5kB |
| Total JS (with app) | <50kB |
| First contentful paint | <1.5s |
| Time to interactive | <2.5s |
| Lighthouse performance | >90 |

## Code Splitting Strategy

```tsx
// Route-based splitting
const Dashboard = lazy(() => import('./routes/Dashboard'))
const Settings = lazy(() => import('./routes/Settings'))

// Interaction-based splitting
async function handleExport() {
  const { PDFGenerator } = await import('./utils/pdf')
  PDFGenerator.generate(data)
}

// Component-level splitting
const HeavyChart = lazy(() => import('./components/HeavyChart'))
```

## CI/CD

```yaml
# .github/workflows/deploy.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

## Deployment Checklist

- [ ] Preact aliases configured in bundler (react -> preact/compat)
- [ ] Bundle analyzed with `npx vite-bundle-analyzer`
- [ ] Route-level code splitting in place
- [ ] Signals used for shared state (not Context)
- [ ] Service worker registered for offline support
- [ ] SPA redirect (/* -> /index.html) configured
- [ ] preact-render-to-string installed if SSR needed
- [ ] Total bundle under 50kB
- [ ] TypeScript strict mode enabled
- [ ] @preact/signals version matches preact version
