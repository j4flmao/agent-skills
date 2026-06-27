# React Architecture Patterns: Comprehensive Guide

This reference document provides an in-depth exploration of advanced architectural patterns in the React ecosystem. It is designed to guide developers in building scalable, maintainable, and highly performant applications.

## Table of Contents
1. [React Server Components (RSC)](#react-server-components-rsc)
2. [SSR, SSG, and ISR with Next.js](#ssr-ssg-and-isr-with-nextjs)
3. [State Architecture: Flux/Redux vs Atomic vs Signals](#state-architecture)
4. [Component Patterns](#component-patterns)
   - Compound Components
   - Render Props vs Hooks
5. [Micro-Frontends with Module Federation](#micro-frontends-with-module-federation)
6. [Best Practices and Anti-Patterns](#best-practices-and-anti-patterns)

---

## 1. React Server Components (RSC)

React Server Components represent a paradigm shift in how React applications are built. They allow developers to write components that render exclusively on the server, significantly reducing the JavaScript bundle size sent to the client.

### Core Concepts
- **Server Components:** Rendered only on the server. They have access to server infrastructure (databases, file systems) but cannot use client-side hooks (`useState`, `useEffect`) or browser APIs.
- **Client Components:** Standard React components that render on both the server (SSR) and the client. They are marked with the `"use client"` directive.

### Code Example: RSC with Database Access

```tsx
// app/users/page.tsx (Server Component)
import { db } from '@/lib/db';
import UserList from '@/components/UserList'; // Client Component

// This component runs exclusively on the server
export default async function UsersPage() {
  // Direct database query within the component
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="users-page">
      <h1>User Directory</h1>
      {/* Passing data to a Client Component */}
      <UserList initialUsers={users} />
    </div>
  );
}
```

```tsx
// components/UserList.tsx (Client Component)
"use client";

import { useState } from 'react';
import type { User } from '@/types';

interface UserListProps {
  initialUsers: User[];
}

export default function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input 
        type="text" 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
        placeholder="Search users..."
      />
      <ul>
        {filteredUsers.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Architectural Implications
- **Reduced Bundle Size:** Server components dependencies are not bundled.
- **Improved Security:** Sensitive tokens or database queries remain on the server.
- **Streaming:** Server components can be streamed to the client progressively.

---

## 2. SSR, SSG, and ISR with Next.js

Understanding rendering strategies is crucial for performance and SEO.

### Server-Side Rendering (SSR)
Generates the HTML on every request. Ideal for highly dynamic content.

```tsx
// Next.js Pages Router Example (SSR)
export async function getServerSideProps(context) {
  const res = await fetch(`https://api.example.com/data`);
  const data = await res.json();

  return { props: { data } };
}
```

### Static Site Generation (SSG)
Generates the HTML at build time. Ideal for content that rarely changes.

```tsx
// Next.js App Router Example (SSG - default behavior)
export default async function Page() {
  // By default, fetch responses are cached (force-cache)
  const res = await fetch('https://api.example.com/data');
  const data = await res.json();
  
  return <div>{data.title}</div>;
}
```

### Incremental Static Regeneration (ISR)
Allows updating static pages after build time without rebuilding the entire site.

```tsx
// Next.js App Router Example (ISR)
export default async function Page() {
  // Revalidate the cache every 60 seconds
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 }
  });
  const data = await res.json();
  
  return <div>{data.title}</div>;
}
```

---

## 3. State Architecture

### Flux/Redux (Centralized State)
Best for complex applications with highly interactive, deeply nested components requiring a single source of truth.

```typescript
// Redux Toolkit Example
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState { value: number; }
const initialState: CounterState = { value: 0 };

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => { state.value += 1; },
    decrement: (state) => { state.value -= 1; },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});
export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
```

### Atomic State (Jotai / Recoil)
Best for applications where state is highly fragmented and updates need to be fine-grained.

```tsx
// Jotai Example
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubleCountAtom = atom((get) => get(countAtom) * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [doubleCount] = useAtom(doubleCountAtom);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

### Signals (e.g., Preact Signals in React)
Signals provide fine-grained reactivity, often bypassing the virtual DOM diffing for direct DOM updates.

---

## 4. Component Patterns

### Compound Components
Compound components provide a flexible API for components that work together to form a cohesive UI.

```tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// 1. Create Context
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (id: string) => void;
} | null>(null);

// 2. Parent Component
export function Tabs({ children, defaultTab }: { children: ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// 3. Child Components
Tabs.List = function TabsList({ children }: { children: ReactNode }) {
  return <div className="tabs-list">{children}</div>;
};

Tabs.Tab = function Tab({ id, children }: { id: string; children: ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs.Tab must be used within Tabs');
  
  const isActive = context.activeTab === id;
  return (
    <button 
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={() => context.setActiveTab(id)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = function Panel({ id, children }: { id: string; children: ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs.Panel must be used within Tabs');
  
  return context.activeTab === id ? <div className="tab-panel">{children}</div> : null;
};
```

### Render Props vs Hooks
While hooks have largely replaced render props for logic sharing, render props are still useful for inversion of control in rendering.

```tsx
// Hook approach (Preferred for logic)
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  return position;
}

// Render Prop approach (Useful for customized rendering control)
function MouseTracker({ render }: { render: (pos: { x: number, y: number }) => ReactNode }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // ... event listener logic ...
  return <div style={{ height: '100vh' }}>{render(position)}</div>;
}
```

---

## 5. Micro-Frontends with Module Federation

Module Federation (Webpack 5 / Rspack) allows multiple separate builds to form a single application.

### Host Application Configuration
```javascript
// webpack.config.js (Host)
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        app1: 'app1@http://localhost:3001/remoteEntry.js',
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
    }),
  ],
};
```

### Remote Application Configuration
```javascript
// webpack.config.js (Remote)
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'app1',
      filename: 'remoteEntry.js',
      exposes: {
        './Header': './src/components/Header',
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
    }),
  ],
};
```

### Usage in Host
```tsx
import React, { Suspense } from 'react';

// Dynamically import the remote module
const RemoteHeader = React.lazy(() => import('app1/Header'));

const App = () => (
  <div>
    <Suspense fallback={<div>Loading Header...</div>}>
      <RemoteHeader />
    </Suspense>
    <main>Host Application Content</main>
  </div>
);
```

---

## 6. Best Practices and Anti-Patterns

### Best Practices
- **Colocate State:** Keep state as close to where it's used as possible.
- **Favor Composition:** Use `children` prop and composition over drilling complex configuration props.
- **Immutable Updates:** Always treat React state as immutable.

### Anti-Patterns
- **Prop Drilling:** Passing props through many layers of components that do not need them. (Solution: Context, State Management, or Component Composition).
- **Overusing Context:** Using Context for high-frequency state updates can cause performance issues since all consumers re-render.
- **Nested Components:** Defining components inside other components leads to unmounting and remounting on every render, destroying state and performance.

```tsx
// ANTI-PATTERN: Nested Component Definition
function Parent() {
  const [count, setCount] = useState(0);

  // BAD: Redefined on every render of Parent
  const Child = () => <div>{count}</div>;

  return (
    <div>
      <Child />
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

// GOOD: Extracted Component
const Child = ({ count }: { count: number }) => <div>{count}</div>;

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Child count={count} />
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

*End of Document*
