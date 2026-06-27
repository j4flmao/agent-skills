# Advanced State Management in React

This reference guide details robust state management patterns in modern React applications, addressing client state, server state, URL state, and synchronization challenges.

## Table of Contents
1. [React Context API Limitations](#react-context-api-limitations)
2. [Client State: Zustand vs Redux Toolkit vs Recoil](#client-state-libraries)
3. [URL State Management (nuqs)](#url-state-management)
4. [Server State Management](#server-state-management)
5. [Optimistic Updates](#optimistic-updates)
6. [Hydration Mismatch Handling](#hydration-mismatch-handling)
7. [State Architecture Decision Matrix](#decision-matrix)

---

## 1. React Context API Limitations

While React Context is built-in and excellent for dependency injection (e.g., themes, auth state), it is **not** a dedicated state management tool for frequently updating data.

### Limitations:
- **Unnecessary Re-renders:** When a Context value changes, *all* components consuming that context re-render, even if they only need a sub-property of the value.
- **Boilerplate:** Requires creating Providers and custom hooks.
- **No Built-in Selectors:** Unlike Redux or Zustand, you cannot naturally "subscribe" to a slice of context.

### Mitigation Pattern (Context Splitting)
```tsx
// Split state and dispatch into separate contexts to prevent re-rendering 
// components that only need to dispatch actions.
const CountStateContext = createContext<number | null>(null);
const CountDispatchContext = createContext<React.Dispatch<Action> | null>(null);

function CountProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(countReducer, 0);
  return (
    <CountStateContext.Provider value={state}>
      <CountDispatchContext.Provider value={dispatch}>
        {children}
      </CountDispatchContext.Provider>
    </CountStateContext.Provider>
  );
}
```

---

## 2. Client State: Zustand vs Redux Toolkit vs Recoil

### Zustand
Zustand is a minimalistic, unopinionated, hooks-based state management library. It avoids wrapping your app in providers.

```tsx
import { create } from 'zustand';

interface BearState {
  bears: number;
  increase: (by: number) => void;
  removeAllBears: () => void;
}

const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
  removeAllBears: () => set({ bears: 0 }),
}));

// Usage (Component only re-renders when `bears` changes)
function BearCounter() {
  const bears = useBearStore((state) => state.bears);
  return <h1>{bears} around here ...</h1>;
}
```

### Redux Toolkit (RTK)
The industry standard for complex, centralized state. RTK reduces boilerplate significantly.

```tsx
import { configureStore, createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null },
  reducers: {
    login: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    }
  }
});

const store = configureStore({
  reducer: { auth: authSlice.reducer }
});
```

### Recoil / Jotai
Atomic state libraries. Best for derived data graphs and UI state that involves many small, interdependent pieces of data (e.g., canvas editors, complex forms).

---

## 3. URL State Management (nuqs)

Storing state in the URL makes applications shareable, bookmarkable, and resilient to page reloads. The `nuqs` library (formerly `next-usequerystate`) provides a typesafe way to manage URL search parameters.

```tsx
import { useQueryState, parseAsInteger } from 'nuqs';

export function Pagination() {
  // Synchronizes with ?page=X in the URL
  const [page, setPage] = useQueryState(
    'page', 
    parseAsInteger.withDefault(1).withOptions({ history: 'push' })
  );

  return (
    <div>
      <p>Current Page: {page}</p>
      <button onClick={() => setPage(page - 1)} disabled={page === 1}>
        Previous
      </button>
      <button onClick={() => setPage(page + 1)}>
        Next
      </button>
    </div>
  );
}
```

---

## 4. Server State Management

Server state represents data fetched from an asynchronous source that you do not own.

### React Query (TanStack Query)
The premier library for caching, synchronizing, and updating server state.

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function Todos() {
  const queryClient = useQueryClient();

  // Fetching data
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: () => fetch('/api/todos').then(res => res.json()),
  });

  // Mutating data
  const mutation = useMutation({
    mutationFn: (newTodo) => fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(newTodo)
    }),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  if (isLoading) return <span>Loading...</span>;

  return (
    <div>
      <ul>{todos?.map(todo => <li key={todo.id}>{todo.title}</li>)}</ul>
      <button onClick={() => mutation.mutate({ title: 'New Todo' })}>
        Add Todo
      </button>
    </div>
  );
}
```

---

## 5. Optimistic Updates

Optimistic updates enhance perceived performance by updating the UI immediately before the server responds.

```tsx
// Using React Query for Optimistic Updates
const queryClient = useQueryClient();

useMutation({
  mutationFn: updateTodo,
  // When mutate is called:
  onMutate: async (newTodo) => {
    // Cancel any outgoing refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot the previous value
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update to the new value
    queryClient.setQueryData(['todos'], (old) => [...old, { ...newTodo, id: 'temp-id' }]);

    // Return a context object with the snapshotted value
    return { previousTodos };
  },
  // If the mutation fails, use the context returned from onMutate to roll back
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  // Always refetch after error or success:
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

---

## 6. Hydration Mismatch Handling

Hydration mismatches occur when the HTML rendered on the server differs from the HTML rendered during the initial client pass.

### Common Causes:
- Using `typeof window !== 'undefined'` to render different content.
- Using random numbers or `Date.now()` during render.
- Incorrectly nested HTML tags (e.g., `<div>` inside `<p>`).

### Mitigation Strategy: The "Mounted" Pattern
Wait until the component has mounted on the client before rendering client-specific UI.

```tsx
import { useState, useEffect } from 'react';

function ClientOnlyThemeToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a placeholder of the same size, or null, during SSR
  if (!mounted) {
    return <div style={{ width: 40, height: 40 }} className="placeholder" />;
  }

  // Safe to use client-side APIs like localStorage or window here
  return (
    <button onClick={() => toggleTheme()}>
      {window.localStorage.getItem('theme') === 'dark' ? '🌞' : '🌙'}
    </button>
  );
}
```

---

## 7. Decision Matrix

| Requirement | Recommended Tool | Alternative |
|-------------|------------------|-------------|
| Server Data Caching | TanStack Query | SWR |
| Global UI State | Zustand | Redux Toolkit |
| Complex/Derived Global State | Redux Toolkit | Jotai |
| URL/Search Params | nuqs | React Router / next/router |
| Dependency Injection | React Context | - |
| Form State | React Hook Form | Formik |

*End of Document*
