# React Native App Architecture: Structure, Layers and State

How to organise a production React Native codebase: folder layout, layering, state ownership and module boundaries. The runtime architecture (JSI, Fabric, TurboModules) is covered in `architecture.md` and `fabric-renderer.md`; this file is about application code.

## Feature-First Layout

```
src/
  app/                    # Expo Router routes (or navigation/ for React Navigation)
    (auth)/sign-in.tsx
    (tabs)/_layout.tsx
    (tabs)/orders/index.tsx
    (tabs)/orders/[id].tsx
  features/
    orders/
      api/                # query/mutation hooks, DTO mapping
      components/         # feature UI
      model/              # domain types, pure functions
      store/              # feature-local client state (if any)
      index.ts            # public surface of the feature
    auth/
  shared/
    ui/                   # design-system primitives (Button, Text, Screen)
    lib/                  # http client, storage, analytics, logger
    config/               # env, feature flags
  test/                   # test utilities, MSW handlers
```

Rules:
- A feature imports other features only through their `index.ts`.
- `shared/` never imports from `features/`.
- Route files stay thin: read params, call a feature screen component.

Enforce boundaries with ESLint (`import/no-restricted-paths` or `eslint-plugin-boundaries`).

## Layers

| Layer | Contains | Depends on |
|-------|----------|------------|
| UI | Screens, components, styles | Hooks, view models |
| State/hooks | TanStack Query hooks, Zustand stores, form state | Services |
| Services | HTTP client, storage, native module wrappers | Platform APIs |
| Domain | Types, validation schemas, pure business rules | Nothing |

Keep native and platform calls behind service wrappers so components can be tested with fakes.

## State Ownership

| State kind | Owner | Example |
|------------|-------|---------|
| Server state | TanStack Query (or RTK Query/Apollo) | Orders list, profile |
| Global client state | Zustand / Redux Toolkit / Jotai | Theme, onboarding done, cart draft |
| Screen state | `useState` / `useReducer` | Expanded row, selected tab |
| Form state | React Hook Form + schema resolver | Checkout form |
| Navigation state | Router | Current screen, params |
| Persisted secure values | `expo-secure-store` / Keychain/Keystore | Refresh token |
| Persisted fast KV | `react-native-mmkv` | Settings, query cache |

Do not copy server data into a global store; derive it from the query cache.

```ts
// features/orders/api/useOrders.ts
export function useOrders(status: OrderStatus) {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: () => api.getOrders({ status }),
    staleTime: 30_000,
  });
}
```

```ts
// shared/lib/session.ts
import { create } from 'zustand';

type Session = { userId: string | null; setUser: (id: string | null) => void };
export const useSession = create<Session>((set) => ({
  userId: null,
  setUser: (userId) => set({ userId }),
}));
```

Select narrow slices (`useSession((s) => s.userId)`) to avoid re-rendering on unrelated changes.

## Navigation Architecture

- Expo Router: file-based routes, typed routes, deep links derived from the file tree, `Stack.Protected`/redirects for auth gating.
- React Navigation (v7): explicit navigators; use the static API for type inference and automatic linking config.
- Auth gating: render different navigators/groups based on session state rather than navigating imperatively after login.

## Configuration and Environments

- Expo: `app.config.ts` reads `process.env`; values prefixed `EXPO_PUBLIC_` are inlined into the JS bundle.
- Anything inlined into the bundle is public. Secrets (API keys with spend, signing keys) belong on a backend.
- One build per environment (dev/staging/prod) with distinct bundle IDs so they can be installed side by side.

## Monorepo Setup

- Workspaces with pnpm/Yarn/Bun; Metro supports monorepos (Expo SDK 52+ configures `watchFolders` automatically).
- Share `domain/` types and validation schemas with the web app and backend; do not share UI unless using React Native Web deliberately.

## Error Boundaries and Resilience

- Wrap each route tree in an error boundary that reports to crash tooling and shows a retry UI.
- TanStack Query `retry` for idempotent GETs only; mutations need idempotency keys if retried.
- Detect connectivity with `@react-native-community/netinfo`; wire it to TanStack Query `onlineManager`.

## Architecture Decision Table

| Question | Default | Alternative when |
|----------|---------|------------------|
| Framework | Expo (prebuild, config plugins) | Bare RN when a native SDK cannot be configured by plugins |
| Router | Expo Router | React Navigation when not using Expo or for complex custom navigators |
| Server state | TanStack Query | Apollo for GraphQL-heavy apps |
| Client state | Zustand | Redux Toolkit for large teams wanting strict conventions |
| Styling | StyleSheet + design tokens | NativeWind/Unistyles for utility or theme-heavy design |
| Offline data | MMKV + query persistence | SQLite/WatermelonDB for relational offline data (`ref2_schemas.md`) |

## Anti-Patterns

- Business logic inside screen components; extract to hooks/domain functions.
- A single global store holding API responses.
- Feature folders reaching into each other's internals.
- Calling native modules directly from many components instead of one service wrapper.
- Reading `process.env` at runtime in arbitrary files; centralise in `shared/config`.

## Checklist

- [ ] Feature-first folders with lint-enforced boundaries
- [ ] Server state in a query cache, client state in a small store
- [ ] Secrets never shipped in the bundle
- [ ] Separate app identifiers per environment
- [ ] Error boundaries per route tree, connected to crash reporting
- [ ] Native/platform access behind service wrappers
