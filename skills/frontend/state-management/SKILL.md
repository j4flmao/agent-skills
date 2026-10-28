---
name: react-zustand-redux-toolkit
description: >
  Use this skill when the user says 'Zustand store', 'Redux Toolkit', 'createSlice', 'RTK Query', 'configureStore', 'Zustand vs Redux', 'persist middleware', 'selector re-renders'. It implements React client state with Zustand or Redux Toolkit: typed stores, selectors that avoid re-renders, middleware (persist, devtools, immer), and when to hand server data to TanStack Query or RTK Query instead. Do NOT use for: cross-framework state architecture decisions (use frontend-state-management), server-data caching strategy (use frontend-data-fetching), or Vue/Pinia, Angular signals, Svelte runes state.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [frontend, react, state-management, zustand, redux-toolkit, rtk-query]
---

# React State: Zustand & Redux Toolkit

## Purpose
Most React state is either server data (belongs in TanStack Query / RTK Query / framework loaders) or local UI state (`useState`). The remaining shared client state needs a store. Zustand is the minimal option; Redux Toolkit (RTK) adds strict unidirectional flow, devtools time-travel and RTK Query. This skill picks one and implements it with correct typing and render performance.

## Agent Protocol

### Trigger
"zustand", "redux toolkit", "RTK", "createSlice", "configureStore", "RTK Query", "store re-renders too much", "persist state".

### Input Context
- React version and framework (Next.js App Router has per-request store concerns).
- Kind of state: server cache, URL state, form state, global UI/session state.
- Team size and need for devtools/strict patterns.

### Output Artifact
Store definition, typed hooks, selectors and usage in components.

### Response Format
```
State kind: {server|url|form|local UI|global client}
Tool: {useState|Context|Zustand|RTK|TanStack Query|RTK Query}
Store shape: {fields}
Selectors: {name -> slice}
Persistence: {none|localStorage|sessionStorage}
```

## Choosing
| Situation | Use |
|-----------|-----|
| Data from an API | TanStack Query, RTK Query, or framework loaders — not a client store |
| Filters/pagination that should survive reload/share | URL search params |
| Form inputs | React Hook Form / form actions |
| Small shared UI state (sidebar, theme, cart draft) | Zustand |
| Large app, many devs, complex event-driven updates, need time-travel | Redux Toolkit |
| Value rarely changes (theme, locale) and read widely | React Context |

## Zustand (v5)

```ts
// stores/cart.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type CartItem = { sku: string; qty: number; price: number };

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (sku: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        add: (item) =>
          set((s) => {
            const existing = s.items.find((i) => i.sku === item.sku);
            return existing
              ? { items: s.items.map((i) => (i.sku === item.sku ? { ...i, qty: i.qty + item.qty } : i)) }
              : { items: [...s.items, item] };
          }),
        remove: (sku) => set((s) => ({ items: s.items.filter((i) => i.sku !== sku) })),
        clear: () => set({ items: [] }),
      }),
      { name: 'cart-v1' }, // localStorage key; bump version on shape change
    ),
  ),
);

// Selectors: subscribe to the smallest slice
export const useCartCount = () => useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
```

```tsx
import { useShallow } from 'zustand/react/shallow';

function CartActions() {
  // Selecting multiple values: wrap in useShallow so a new object each render does not loop/re-render
  const { add, clear } = useCartStore(useShallow((s) => ({ add: s.add, clear: s.clear })));
  return <button onClick={clear}>Clear</button>;
}
```
Notes: `create<T>()(...)` (curried form) is required for correct middleware typing. In Zustand v5 a selector returning a new object/array without `useShallow` causes an infinite render loop error.

## Redux Toolkit (v2)

```ts
// store/authSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type AuthState = { user: { id: string; name: string } | null };
const initialState: AuthState = { user: null };

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loggedIn: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.user = action.payload; // Immer makes this immutable
    },
    loggedOut: (state) => {
      state.user = null;
    },
  },
  selectors: {
    selectUser: (state) => state.user,
  },
});
export const { loggedIn, loggedOut } = authSlice.actions;
export const { selectUser } = authSlice.selectors;
```

```ts
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { authSlice } from './authSlice';
import { api } from './api';

export const store = configureStore({
  reducer: { [authSlice.reducerPath]: authSlice.reducer, [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

```ts
// store/api.ts — RTK Query for server data
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Task'],
  endpoints: (b) => ({
    getTasks: b.query<{ id: string; title: string }[], void>({ query: () => 'tasks', providesTags: ['Task'] }),
    addTask: b.mutation<void, { title: string }>({
      query: (body) => ({ url: 'tasks', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
  }),
});
export const { useGetTasksQuery, useAddTaskMutation } = api;
```

## Next.js App Router Caveat
A module-level store is shared across all requests on the server. For stores that hold per-user data during SSR, create the store per request inside a Client Component provider (`useRef`/`useState` initializer) and pass initial data as props. Keep Server Components store-free.

## Render Performance
- Select primitives or memoized derived data; avoid `useStore()` with no selector (subscribes to everything).
- RTK: use `createSelector` for derived arrays/objects so references stay stable.
- Do not put rapidly changing values (mouse position, animation frames) in a global store; use refs or local state.

## Anti-patterns
| Anti-pattern | Fix |
|--------------|-----|
| Copying API responses into Zustand/Redux | TanStack Query / RTK Query cache |
| One giant Context for all app state | Split contexts or use a store with selectors |
| Mutating state outside Immer reducers | Return new objects (Zustand) or use slice reducers |
| Hand-written action types/switch reducers | `createSlice` |
| Persisting the whole store including secrets | `partialize` in persist; never persist tokens to localStorage |

## Checklist
- [ ] Server data handled by a query cache, not the client store.
- [ ] Typed hooks (`withTypes`) / curried `create<T>()`.
- [ ] Components select minimal slices; `useShallow`/`createSelector` for objects.
- [ ] Persisted state versioned and partialized.
- [ ] SSR stores created per request.
