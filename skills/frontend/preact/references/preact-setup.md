# Preact Setup Guide

## Installation

```bash
# Fresh Vite + Preact project
npm create vite@latest my-app -- --template preact
cd my-app && npm install

# Add to existing project
npm install preact
npm install -D @preact/preset-vite

# Signals
npm install @preact/signals

# SSR
npm install preact-render-to-string

# Routing
npm install preact-router
```

## Vite Configuration

```ts
// vite.config.ts
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

## Entry Point

```tsx
// src/main.tsx
import { render } from 'preact'
import App from './app'

render(<App />, document.getElementById('app')!)
```

## WMR (alternative to Vite)

```bash
npm init wmr my-app
cd my-app
npm install
npm run dev
```

WMR has Preact built-in — no config needed. Uses `preact/jsx-runtime` by default.

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true
  }
}
```

## Directory Structure

```
src/
  components/
    Button.tsx
    Header.tsx
  pages/
    Home.tsx
    About.tsx
  stores/
    counter.ts         # Signal stores
    user.ts
  hooks/
    useDebounce.ts
  utils/
    format.ts
  app.tsx
  main.tsx
```

## Using React Libraries via Compat

```tsx
// Any React library works via preact/compat
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

## Routing with preact-router

```tsx
import { Router, Route } from 'preact-router'
import Home from './pages/Home'
import About from './pages/About'

export function App() {
  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
    </Router>
  )
}
```

## SSR Setup

```tsx
// server.js
import express from 'express'
import { render } from 'preact-render-to-string'
import App from './src/app'

const app = express()

app.get('*', (req, res) => {
  const html = render(<App url={req.url} />)
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Preact SSR</title></head>
      <body>
        <div id="app">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `)
})
```

## Testing Setup

```tsx
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

```tsx
// Component test
import { render, screen, fireEvent } from '@testing-library/preact'
import Counter from './Counter'

test('increments count', () => {
  render(<Counter />)
  fireEvent.click(screen.getByText('+1'))
  expect(screen.getByText(/Count: 1/)).toBeTruthy()
})
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm create vite@latest -- --template preact` | Scaffold Preact + Vite |
| `npm init wmr` | Scaffold Preact + WMR |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Build Output

Preact produces small bundles:
- Minimal app: ~4 kB gzipped (Preact + signals + router)
- Compat layer adds ~2 kB
- Typical page: 5-15 kB gzipped
