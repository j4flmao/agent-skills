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
// Single responsibility hook
function useUserFilter(users: User[], search: string) {
  return useMemo(() => {
    if (!search) return users
    return users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [users, search])
}

// Data fetching hook (thin wrapper around query library)
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

Features import from other features ONLY through their public API (index.ts). Never import from features/users/components/ directly.

### Step 5: Error Boundaries
```typescript
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() { return { hasError: true } }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to error reporting service
    console.error('Error caught:', error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
```

## Rules
- Smart components connect to data/stores. Dumb components receive everything via props.
- Custom hooks start with use and return objects (not arrays) when returning more than 2 values.
- Barrel files (index.ts) are at feature boundaries only, not in every subfolder.
- Components stay under 150 lines. Split them.
- Dumb components never fetch data, never access stores, never call mutations.
- Features import from other features only via their public API (index.ts). No deep imports.

## References
  - references/component-patterns.md — React Component Patterns
  - references/folder-structure.md — React Folder Structure
  - references/hooks-guide.md — React Hooks Guide
  - references/react-19-patterns.md — React 19 Patterns
  - references/react-compiler.md — React Compiler
  - references/rendering-patterns.md — React Rendering Patterns
## Handoff
No artifact produced.
Next skill: react-nextjs (if using Next.js) or frontend-testing.
Carry forward: feature organization, component patterns, custom hook conventions.
