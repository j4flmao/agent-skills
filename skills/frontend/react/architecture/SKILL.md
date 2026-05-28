---
name: react-architecture
description: >
  Use this skill when the user says 'React structure', 'React architecture', 'React folder', 'React component pattern', 'React hooks architecture', 'React clean arch', 'feature-based React', 'React project layout', or when structuring a React application. This skill enforces: feature-based folder structure, smart/dumb component separation, custom hooks for all stateful logic, barrel exports only at feature boundaries, and error boundaries at route level. Requires React (package.json with react). Do NOT use for: Next.js specific patterns, Vue/Angular, or React Native.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, react, phase-3]
---

# React Architecture

## Purpose
Organize React applications by feature, not by type. Each feature is a self-contained module with its own components, hooks, API calls, and types. No circular imports between features.

## Agent Protocol

### Trigger
Exact user phrases: "React structure", "React architecture", "React folder", "React component pattern", "React hooks architecture", "React clean arch", "feature-based React", "React project layout".

### Input Context
Before activating, verify:
- package.json has react dependency.
- Whether the project uses Vite, CRA, or custom setup.

### Output Artifact
No file output. Produces folder structure and code examples as text.

### Response Format
Folder structure:
```
src/
  app/
  features/{feature}/
    api/, components/, hooks/, stores/, types/
  shared/components/
```

Code: show component and hook definitions. No import statements.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Folder structure is feature-based (src/features/{feature}).
- [ ] Smart components fetch data and manage state. Dumb components receive props.
- [ ] Custom hooks encapsulate all stateful logic.
- [ ] Barrel exports (index.ts) exist only at feature boundaries, not in every folder.
- [ ] No data fetching in dumb/presentational components.
- [ ] Error boundaries wrap each feature route.
- [ ] Components are under 150 lines.

### Max Response Length
Folder structure: unlimited. Code: 15 lines per example.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Feature-based folders | Cohesion, scalability | All projects with multiple features |
| Type-based folders (components/, hooks/) | Simple for small apps | Small projects, prototypes |
| Smart/Dumb separation | Testable, reusable UI | Components with data dependencies |
| Compound components | Flexible, composable | Complex UI (Dropdown, Tabs, Select) |
| Render props | Max flexibility | Cross-cutting behavior (Mouse position, Scroll) |
| Custom hooks | Reusable stateful logic | Data fetching, form logic, subscriptions |

### Decision Tree: Component Type

```
Does the component fetch data or manage state?
  ├── Yes -> Smart component
  │    ├── Uses custom hooks for logic
  │    ├── Renders dumb components
  │    └── Exports from feature barrel
  └── No -> Dumb (presentational) component
       ├── Receives everything via props
       ├── No data fetching, no stores
       └── Resides in features/{feature}/components/
```

### Decision Tree: State Management

```
How complex is the state?
  ├── Local (component only) -> useState, useReducer
  ├── Shared across few components -> Props lifting, Context
  └── Shared across many components ->
       ├── Server state -> TanStack Query
       ├── Client state -> Zustand, Jotai, Context
       └── URL state -> useSearchParams, react-router
```

### Decision Tree: Custom Hook vs Component

```
Does the logic produce UI?
  ├── Yes -> Component (possibly compound)
  └── No -> Custom hook
       ├── Data fetching -> Query hook
       ├── Form logic -> Form hook
       ├── Browser API -> useMediaQuery, useOnlineStatus
       └── Animation -> Animation hook
```

## Common Pitfalls

### Pitfall 1: Deep Imports Across Features
```tsx
// Wrong — importing directly from another feature's internals
import { UserCard } from '../users/components/UserCard'

// Correct — import from feature barrel
import { UserCard } from '../users'
```
Features should only expose their public API through the barrel (index.ts). Deep imports create tight coupling.

### Pitfall 2: Barrel Files in Every Folder
```tsx
// Wrong — barrel in api/, components/, hooks/, stores/, types/
// Correct — ONE barrel at feature level (features/users/index.ts)
```
Barrel files at every subfolder level create circular import risks and slower builds. Only barrel at the feature boundary.

### Pitfall 3: Smart Components Over 150 Lines
Components over 150 lines are doing too much. Extract:
- Data fetching -> custom hook
- Business logic -> custom hook or utility
- JSX subsections -> dumb child components

### Pitfall 4: Data Fetching in Dumb Components
Dumb components receive props only. If a component calls `useQuery` or accesses a store, it is a smart component and should be in the feature's component folder.

### Pitfall 5: Prop Drilling Beyond 3 Levels
```tsx
// Wrong — prop drilling through 4 components
<Page user={user} />
  <Sidebar user={user} />
    <Nav user={user} />
      <Avatar user={user} />

// Correct — Context or composition
<Page>
  <Sidebar>
    <Nav user={user} /> {/* Only drill where needed */}
```
At 3+ levels of prop drilling, consider Context, composition, or state management.

## Compared With

### Feature-Based vs Type-Based Structure
| Aspect | Feature-Based | Type-Based |
|--------|---------------|------------|
| Cohesion | High (feature files colocated) | Low (feature files spread) |
| Scaling | Excellent | Poor after 20+ files |
| Navigation | By feature in IDE | By type in IDE |
| Refactoring | Isolated to feature | Cross-cutting changes |
| Reusability | Shared via shared/ folder | Natural cross-feature sharing |

### React Hooks vs Vue Composables
Both encapsulate reactive state. React hooks run on every render and depend on call order; Vue composables run once and use proxy-based reactivity. React hooks are more flexible but have stricter rules.

### React Compound Components vs Slots
Compound components (`<Select><Select.Trigger/><Select.Options/></Select>`) give explicit control over rendered structure. Slots (Svelte, Vue) are simpler but less flexible for advanced composition.

## Performance Considerations

### Re-render Optimization
React re-renders components when state changes. Strategies to minimize:
- `React.memo` for pure components receiving the same props
- `useMemo` for expensive computations
- `useCallback` for stable function references
- `React Compiler` (automated memoization in React 19+)

### Bundle Size
- React + react-dom: ~45KB gzipped
- Feature-based structure aids tree-shaking
- Code-split at route level with `React.lazy` + `Suspense`
- Lazy load heavy libraries (chart, markdown, date picker)

### Virtual DOM Cost
Large lists (1000+ items) benefit from:
- Windowed rendering (react-window, react-virtuoso)
- Stable keys (`item.id`, never index)
- Avoiding inline functions in list item renders

### State Management Size
| Library | Size (gzipped) |
|---------|----------------|
| useState/useReducer | 0KB (built-in) |
| Context | 0KB (built-in) |
| Zustand | ~1KB |
| Jotai | ~3KB |
| TanStack Query | ~13KB |
| Redux Toolkit | ~12KB |

## Ecosystem & Tooling

### State Management
| Library | Best For |
|---------|----------|
| TanStack Query | Server state (API data) |
| Zustand | Simple global client state |
| Jotai | Atomic state with React-like API |
| Redux Toolkit | Large apps with complex state logic |
| Context | Low-frequency global state (theme, auth) |
| useReducer | Local complex state (forms, wizards) |

### UI Libraries
| Library | Style |
|---------|-------|
| Radix UI | Headless primitives |
| shadcn/ui | Copy-paste components |
| MUI | Full Material Design |
| Chakra UI | Accessible by default |
| Tailwind CSS | Utility-first CSS |

### Testing Tools
| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests |
| React Testing Library | Component testing |
| Playwright | E2E testing |
| Storybook | Visual component development |

### Build Tools
| Tool | Purpose |
|------|---------|
| Vite | Fast dev server and build |
| Next.js | Full-stack React framework |
| Remix | SSR-focused framework |
| React Router | Client-side routing |

### Community
- Docs: react.dev
- GitHub: github.com/facebook/react
- Discord: reactiflux.com
- Trends: reacttrends.io

## Workflow

### Step 1: Feature-Based Structure
```
src/
  app/
    App.tsx                         -- App shell, routing, global providers
    router.tsx                      -- Route definitions
    providers.tsx                   -- Theme, QueryClient, Auth providers
  features/
    users/
      api/
        useUsersQuery.ts            -- Server state hooks
        useCreateUserMutation.ts
      components/
        UserList.tsx                -- Smart (connects to data)
        UserCard.tsx                -- Dumb (receives props)
      hooks/
        useUserFilter.ts            -- Client state logic
      stores/
        userStore.ts                -- Zustand store slice
      types/
        index.ts
      index.ts                      -- Public API
    orders/
      api/
      components/
      hooks/
      types/
      index.ts
  shared/
    components/
      Button/
      Modal/
      DataTable/
    hooks/
      useDebounce.ts
      useMediaQuery.ts
    utils/
      formatDate.ts
    types/
      common.ts
  lib/
    api.ts                          -- HTTP client wrapper
    query.ts                        -- TanStack Query config
  assets/
```

### Step 2: Smart vs Dumb Components
```typescript
// Dumb (presentational) — no data fetching, no business logic
interface ButtonProps {
  variant: 'primary' | 'secondary'
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

function Button({ variant, children, onClick, disabled }: ButtonProps) {
  return (
    <button className={buttonVariants({ variant })} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// Smart (container) — orchestrates data and logic
function UserListFeature() {
  const { data: users, isLoading } = useUsersQuery()
  const deleteUser = useDeleteUserMutation()

  if (isLoading) return <Skeleton />
  return (
    <div>
      {users?.map(user => (
        <UserCard key={user.id} user={user} onDelete={() => deleteUser.mutate(user.id)} />
      ))}
    </div>
  )
}
```

### Step 3: Custom Hook Patterns
```typescript
function useUserFilter(users: User[], search: string) {
  return useMemo(() => {
    if (!search) return users
    return users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [users, search])
}

function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
    staleTime: 30_000,
  })
}
```

### Step 4: Feature Public API
```typescript
// features/users/index.ts
export { UserListFeature } from './components/UserListFeature'
export { useUsersQuery } from './api/useUsersQuery'
export type { User, CreateUserDTO } from './types'
```
Features import from other features ONLY through their public API (index.ts).

### Step 5: Error Boundaries
```typescript
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() { return { hasError: true } }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error caught:', error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
```

### Step 6: Code Splitting
```typescript
const UsersPage = lazy(() => import('./features/users/pages/UsersPage'))
const OrdersPage = lazy(() => import('./features/orders/pages/OrdersPage'))

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </Suspense>
  )
}
```

### Step 7: React Compiler (React 19+)
```typescript
// Install: npm install -D vite-plugin-react-compiler
import reactCompiler from 'vite-plugin-react-compiler'

export default defineConfig({
  plugins: [
    reactCompiler({ target: '19' }),
    react(),
  ],
})
```
The React Compiler automatically memoizes components and hooks, eliminating manual useMemo, useCallback, and React.memo.

## Rules
- Smart components connect to data/stores. Dumb components receive everything via props.
- Custom hooks start with use and return objects (not arrays) when returning more than 2 values.
- Barrel files (index.ts) are at feature boundaries only, not in every subfolder.
- Components stay under 150 lines. Split them.
- Dumb components never fetch data, never access stores, never call mutations.
- Features import from other features only via their public API (index.ts). No deep imports.
- Use TanStack Query for server state; Zustand or Context for client state.
- Code-split at route level with React.lazy + Suspense.
- Use React Compiler in React 19 projects to automate memoization.
- Test smart components via hooks; test dumb components via props.

## References
- references/component-patterns.md — React Component Patterns
- references/folder-structure.md — React Folder Structure
- references/hooks-guide.md — React Hooks Guide
- references/react-19-patterns.md — React 19 Patterns
- references/react-compiler.md — React Compiler
- references/rendering-patterns.md — React Rendering Patterns
- references/react-server-components.md — React Server Components
- references/react-compiler-optimizations.md — React Compiler Optimizations

## Handoff
No artifact produced.
Next skill: react-nextjs (if using Next.js) or frontend-testing.
Carry forward: feature organization, component patterns, custom hook conventions.
