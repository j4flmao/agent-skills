# State Management Library Comparison

## Framework-Native Solutions

| Framework | Local State | Shared State | Server State |
|-----------|-------------|--------------|--------------|
| React | `useState`, `useReducer` | Context, Zustand | TanStack Query |
| Vue | `ref`, `reactive` | Pinia | TanStack Query |
| Angular | `signal()` | Signal Store, NgRx | TanStack Query |
| Solid | `createSignal` | Module signals | `createResource` |
| Svelte | `$state` | `.svelte.js` modules | SvelteKit `load` |
| Qwik | `useSignal` | Module + context | `routeLoader$` |

## Library Comparison

### TanStack Query vs SWR vs Apollo

| Feature | TanStack Query | SWR | Apollo |
|---------|---------------|-----|--------|
| Framework | React, Vue, Solid | React | React, Vue |
| Caching | Fine-grained | Basic | Normalized |
| Pagination | First-class | Basic | offset/cursor |
| Optimistic | Built-in | Manual | Built-in |
| DevTools | Built-in | Community | Built-in |
| Bundle size | ~13kB | ~11kB | ~35kB |

### Zustand vs Pinia vs Signal Store

| Feature | Zustand | Pinia | NgRx Signal Store |
|---------|---------|-------|-------------------|
| Framework | React (any via vanilla) | Vue | Angular |
| Bundle | ~1kB | ~2kB | ~5kB |
| TypeScript | Excellent | Excellent | Excellent |
| DevTools | Yes | Yes | Yes |
| Middleware | Built-in | Built-in | Custom |

### Redux Toolkit vs Zustand

| Aspect | Redux Toolkit | Zustand |
|--------|--------------|---------|
| Boilerplate | Moderate | Minimal |
| Middleware | Built-in | Add-on |
| DevTools | Excellent | Good |
| Async | createAsyncThunk | Direct async |
| Bundle | ~12kB | ~1kB |
| Learning curve | Medium | Low |

## Decision Matrix

| Scenario | Recommended |
|----------|------------|
| Small app, simple state | Framework-native (signals, $state) |
| Medium app, server data | TanStack Query + local state |
| Large app, complex state | Redux Toolkit or NgRx |
| Form-heavy app | Zustand or Pinia |
| Real-time data | TanStack Query subscriptions |
| State machine needed | XState |
| Angular, most apps | Signal Store |

## Migration Guide

```
Framework state -> Native ref/signal
Server state    -> TanStack Query
Simple shared   -> Zustand/Pinia/Signal Store
Complex shared  -> Redux Toolkit/NgRx
URL state       -> Router query params
Form state      -> In-component or form library
```
