# Svelte Stores and Context API

## Overview
Svelte stores provide reactive state management outside the component tree. The Context API provides dependency injection for component trees. This reference covers writable stores, derived stores, custom stores, context, and integration with SvelteKit.

## Writable Stores

### Basic Store
```typescript
// src/lib/stores/counter.ts
import { writable } from 'svelte/store';

export const count = writable(0);
export const increment = () => count.update((n) => n + 1);
export const decrement = () => count.update((n) => n - 1);
export const reset = () => count.set(0);
```

### Store with TypeScript
```typescript
// src/lib/stores/user.ts
import { writable } from 'svelte/store';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export const currentUser = writable<User | null>(null);

export async function login(email: string, password: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const user: User = await response.json();
  currentUser.set(user);
}

export function logout() {
  currentUser.set(null);
}
```

### Using Stores in Components
```svelte
<script lang="ts">
  import { count, increment, decrement, reset } from '$lib/stores/counter';
  import { currentUser, login } from '$lib/stores/user';
  import { onMount } from 'svelte';

  onMount(() => {
    login('user@example.com', 'password123');
  });
</script>

<h1>Count: {$count}</h1>
<button on:click={increment}>+</button>
<button on:click={decrement}>-</button>
<button on:click={reset}>Reset</button>

{#if $currentUser}
  <p>Welcome, {$currentUser.name}</p>
{/if}
```

## Derived Stores

### Computed Values
```typescript
// src/lib/stores/todo.ts
import { writable, derived } from 'svelte/store';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export const todos = writable<Todo[]>([]);

export const completedTodos = derived(todos, ($todos) =>
  $todos.filter((t) => t.completed)
);

export const activeTodos = derived(todos, ($todos) =>
  $todos.filter((t) => !t.completed)
);

export const completionPercentage = derived(
  todos,
  ($todos) => {
    if ($todos.length === 0) return 0;
    const completed = $todos.filter((t) => t.completed).length;
    return Math.round((completed / $todos.length) * 100);
  }
);

export const todoStats = derived(
  [todos, completedTodos, activeTodos],
  ([$todos, $completed, $active]) => ({
    total: $todos.length,
    completed: $completed.length,
    active: $active.length,
    percentage: $todos.length > 0
      ? Math.round(($completed.length / $todos.length) * 100)
      : 0,
  })
);
```

### Derived with Multiple Sources
```typescript
// src/lib/stores/filter.ts
import { writable, derived } from 'svelte/store';

export const searchQuery = writable('');
export const selectedCategory = writable<string | null>(null);
export const sortOrder = writable<'asc' | 'desc'>('asc');

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

export const products = writable<Product[]>([]);

export const filteredProducts = derived(
  [products, searchQuery, selectedCategory, sortOrder],
  ([$products, $query, $category, $sort]) => {
    return $products
      .filter((p) => {
        if ($query && !p.name.toLowerCase().includes($query.toLowerCase())) {
          return false;
        }
        if ($category && p.category !== $category) {
          return false;
        }
        return true;
      })
      .sort((a, b) =>
        $sort === 'asc'
          ? a.price - b.price
          : b.price - a.price
      );
  }
);
```

## Custom Stores

### Store with Methods
```typescript
// src/lib/stores/notification.ts
import { writable } from 'svelte/store';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

function createNotificationStore() {
  const { subscribe, update } = writable<Notification[]>([]);

  function add(notification: Omit<Notification, 'id'>) {
    const id = crypto.randomUUID();
    update((n) => [...n, { ...notification, id }]);

    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }

    return id;
  }

  function remove(id: string) {
    update((n) => n.filter((item) => item.id !== id));
  }

  function success(message: string) {
    return add({ message, type: 'success' });
  }

  function error(message: string) {
    return add({ message, type: 'error', duration: 10000 });
  }

  function info(message: string) {
    return add({ message, type: 'info' });
  }

  function warning(message: string) {
    return add({ message, type: 'warning', duration: 8000 });
  }

  return {
    subscribe,
    add,
    remove,
    success,
    error,
    info,
    warning,
  };
}

export const notifications = createNotificationStore();
```

### Local Storage Store
```typescript
// src/lib/stores/local.ts
import { writable } from 'svelte/store';

function persistedStore<T>(key: string, initialValue: T) {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem(key)
    : null;

  const data = stored ? JSON.parse(stored) : initialValue;
  const store = writable<T>(data);

  store.subscribe(($data) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify($data));
    }
  });

  return store;
}

export const theme = persistedStore<'light' | 'dark'>('theme', 'light');
export const settings = persistedStore('settings', {
  notifications: true,
  sidebarOpen: false,
  fontSize: 14,
});
```

## Context API

### Setting Context
```typescript
// src/routes/+layout.svelte
<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  const theme = writable<'light' | 'dark'>('light');

  setContext('theme', {
    current: theme,
    toggle: () => theme.update((t) => (t === 'light' ? 'dark' : 'light')),
  });

  setContext('user', {
    id: '123',
    name: 'Alice',
    email: 'alice@example.com',
  });
</script>

<slot />
```

### Getting Context
```svelte
<!-- src/lib/components/ThemeToggle.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';

  const { current, toggle } = getContext<{
    current: import('svelte/store').Writable<'light' | 'dark'>;
    toggle: () => void;
  }>('theme');
</script>

<button on:click={toggle}>
  Current theme: {$current}
</button>
```

### Typed Context
```typescript
// src/lib/context/auth.ts
import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

interface AuthContext {
  user: Writable<User | null>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: import('svelte/store').Readable<boolean>;
}

const AUTH_KEY = Symbol('auth');

export function setAuthContext(auth: AuthContext) {
  setContext(AUTH_KEY, auth);
}

export function getAuthContext(): AuthContext {
  return getContext(AUTH_KEY);
}
```

## Store Subscription

### Manual Subscription
```typescript
import { count } from '$lib/stores/counter';
import { onDestroy } from 'svelte';

const unsubscribe = count.subscribe((value) => {
  console.log('Count changed:', value);
});

onDestroy(unsubscribe);
```

## Key Points
- writable stores provide get, set, and update operations
- derived stores compute values from one or more source stores
- Custom stores encapsulate state logic with a public API
- Use the $ prefix for auto-subscription in components
- Context API provides dependency injection without prop drilling
- Stores are reactive outside of Svelte components too
- Derived stores update only when dependencies change
- Local storage stores persist data across sessions
- Symbols or unique keys prevent context name collisions
- unsubscribe prevents memory leaks in manual subscriptions
- Store values are read-only outside the store creator
- Batch updates reduce re-renders in reactive statements
- Readable stores provide subscribe-only values
- Context is not reactive - use stores for reactive values in context
- Store contracts define testable boundaries
- Server-side rendering requires careful store initialization
- Multiple stores can be combined for complex state
- Store testing is straightforward with set/update/subscribe
