---
name: frontend-state-management
description: >
  Use this skill when the user says 'state management', 'global state', 'Redux', 'Zustand', 'Pinia', 'NgRx', 'React Context', 'state architecture', 'where to put state', 'server state vs client state', or when deciding how to manage application state. This skill enforces: server state goes in server state libraries (TanStack Query, SWR, Apollo), local state goes in useState/ref/signals, shared state goes in lightweight stores (Zustand, Pinia, Signal Store), and complex state goes in XState or Redux Toolkit. Works with React, Vue, Angular. Do NOT use for: database design, backend caching, or API design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, state, phase-3, universal]
---

# Frontend State Management

## Purpose
Choose and implement the correct state management pattern for each type of state. Server state, client state, local state, and URL state each have their own solution. Never put server state in a global store.

## Agent Protocol

### Trigger
Exact user phrases: "state management", "global state", "Redux", "Zustand", "Pinia", "NgRx", "React Context", "state architecture", "where to put state", "server state vs client state", "state library".

### Input Context
Before activating, verify:
- The framework is known (React, Vue, Angular).
- The type of state being discussed is identified (server data, UI state, form state, URL state).

### Output Artifact
No file output. Produces state architecture decision as text.

### Response Format
```
State: {description}
Type: {server/client/URL}
Storage: {local/global/shared}
Library: {specific library}
Location: {file path}
Rationale: {one sentence}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] State type correctly classified (server vs client).
- [ ] Decision follows the decision tree below.
- [ ] Server state uses a server state library, NOT a global store.
- [ ] Global stores are split by domain (one store per feature, not one store for everything).
- [ ] Context is used for dependency injection, not state management.
- [ ] URL state is not duplicated in component state.

### Max Response Length
Per state decision: 7 lines.

## Workflow

### Step 1: Classify State
```
Is the source of truth on the server?
  YES -> Server state -> useQuery / useFetch / Apollo
  NO  -> Is it shared across multiple components?
    NO  -> Component local -> useState / ref / signal
    YES -> Is it complex (multiple actions, transitions)?
      NO  -> Simple store -> Zustand / Pinia / Signal Store
      YES -> State machine -> XState / Redux Toolkit / NgRx
```

### Step 2: Server State Pattern
```typescript
function useUsers() {
  return useQuery({
    queryKey: ['users', { page }],
    queryFn: () => api.getUsers({ page }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}
```

Server state rules:
- staleTime prevents unnecessary refetches. Set based on data volatility.
- gcTime keeps data in cache for instant back-navigation.
- Mutations invalidate related queries on success. Never manually set query data.

### Step 3: Client State Patterns
```typescript
// Local state (one component)
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}

// Shared state (multiple components)
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (credentials) => {
    const user = await api.login(credentials)
    set({ user })
  },
  logout: () => set({ user: null }),
}))

// Complex state machine
const orderMachine = createMachine({
  id: 'order',
  initial: 'idle',
  states: {
    idle:      { on: { SUBMIT: 'loading' } },
    loading:   { on: { SUCCESS: 'success', ERROR: 'error' } },
    success:   { on: { RESET: 'idle' } },
    error:     { on: { RETRY: 'loading', RESET: 'idle' } },
  },
})
```

### Step 4: State Location Rules
| State Type | Storage | Example |
|-----------|---------|---------|
| Form input | Component local | useState in form component |
| Theme preference | Global store (small) | useThemeStore |
| Auth status | Global store (small) | useAuthStore |
| API response data | Server state library | useQuery |
| Modal open/close | Component local | useState |
| Real-time data | Server state subscription | useQuery with WebSocket |
| URL params | URL/search params | useSearchParams |
| Form validation | Component local or form library | react-hook-form |

## Rules
- Server state goes in TanStack Query / SWR / Apollo. Never put server state in Zustand, Redux, or Pinia.
- Split global stores by domain. One store per feature. A store with 20+ properties should be split.
- React Context is dependency injection, not a state management solution. Use it for theme providers, locale providers, not for app state.
- Never store derived data in state. Compute it with selectors, computed, or useMemo.
- URL parameters are state. Do not duplicate URL state in component state.
- If two pieces of state change together, they belong together. If they change independently, split them.

## References
- `references/state-patterns.md` — state decision tree, server state, global store, local state

## Handoff
No artifact produced.
Next skill: frontend-performance — optimize rendering and bundle size.
Carry forward: state architecture decisions, store structure, server state configuration.
