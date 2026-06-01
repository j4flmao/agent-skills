---
name: frontend-feature-flags
description: >
  Use this skill when the user says 'feature flags', 'LaunchDarkly', 'split testing', 'A/B testing', 'gradual rollout', 'canary release', 'feature toggle', 'flag provider', 'targeting rule', or when implementing frontend feature flags. This skill enforces: typed flag definitions, provider-agnostic abstraction layer, gradual rollout with percentage targeting, and A/B test assignment tracking. Works with LaunchDarkly, Split.io, Flagsmith, or custom flag backends. Do NOT use for: backend-only flag evaluation, server-side config management, infrastructure provisioning.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, feature-flags, experimentation, universal]
---

# Feature Flags

## Purpose
Deliver features gradually. Run A/B tests. Toggle features without redeploys. Roll back instantly.

## Agent Protocol

### Trigger
Exact user phrases: "feature flags", "LaunchDarkly", "split testing", "A/B testing", "gradual rollout", "canary release", "feature toggle", "flag provider", "targeting rule".

### Input Context
Before activating, verify:
- The flag provider (LaunchDarkly, Split.io, custom, etc.).
- Whether the use case is release toggle, A/B test, or operational flag.

### Output Artifact
No file output. Produces flag configuration, provider integration, or rollout strategy code as text.

### Response Format
```
Flag: {name}
Type: {boolean/string/number/json}
Strategy: {targeting rule}
Integration: {code block}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Flags defined with types — not raw strings throughout codebase.
- [ ] Provider client initialized once at app root with user context.
- [ ] Gradual rollout with percentage targeting configured.
- [ ] A/B test flags include exposure tracking event.
- [ ] Fallback/default value provided for every flag evaluation.
- [ ] Dead flags cleaned up (no flag code older than 2 releases).

### Max Response Length
4096 tokens.

## Feature Flag Architecture / Decision Trees

### Flag Provider Decision Tree
```
Need real-time flag updates without page reload?
  |-- YES --> LaunchDarkly (SSE-based, best in class) or Flagsmith
  |-- NO --> Do we have existing LaunchDarkly infra?
  |     |-- YES --> Use LaunchDarkly
  |     |-- NO --> Budget/scale constraints?
  |           |-- SMALL --> Custom flag backend (API + localStorage cache)
  |           |-- MEDIUM --> Flagsmith (open-source option available)
  |           |-- LARGE --> LaunchDarkly or Split.io
```

### Flag Type Decision Tree
```
What does this flag control?
  |-- Show/hide a UI element --> boolean flag
  |     Example: newCheckoutFlow: boolean
  |
  |-- Numerical configuration --> number flag
  |     Example: maxCartItems: number
  |
  |-- Which layout/copy to show --> string flag
  |     Example: homepageLayout: "legacy" | "redesign-v1" | "redesign-v2"
  |
  |-- Complex configuration object --> json flag
        Example: promoBanner: { enabled: boolean, text: string, ctaUrl: string }
```

### Rollout Strategy Decision Tree
```
What is the audience for this flag?
  |-- Internal testing only -->
  |     Strategy: Target by email domain (@company.com) or SSO group
  |     Proceed when: Internal team validates feature
  |
  |-- Beta testers -->
  |     Strategy: Target by user IDs in beta list
  |     Proceed when: Beta feedback collected, blockers resolved
  |
  |-- Staged public rollout -->
  |     Strategy: Percentage rollout
  |     Phases: 5% -> 10% -> 25% -> 50% -> 100%
  |     Proceed when: Error rate < 0.1% at each phase
  |
  |-- A/B experiment -->
        Strategy: 50/50 split with randomization consistent per user
        Duration: Minimum 1 week, determined by sample size calculator
        Decision: Analyze after reaching statistical significance (p < 0.05)
```

## Workflow

### Step 1: Typed Flag Definitions
```typescript
// Single source of truth for all flags
export const flags = {
  newCheckoutFlow: { key: 'new-checkout-flow', type: 'boolean', default: false },
  maxItems:        { key: 'max-cart-items', type: 'number', default: 10 },
  homepageLayout:  { key: 'homepage-layout', type: 'string', default: 'legacy' },
  promoBanner:     { key: 'promo-banner', type: 'json', default: { enabled: false, text: '' } },
} as const

type FlagKey = keyof typeof flags
```

### Step 2: Provider-Agnostic Client Abstraction
```typescript
interface FlagClient {
  getBoolean(key: string, defaultVal: boolean): boolean
  getNumber(key: string, defaultVal: number): number
  getString(key: string, defaultVal: string): string
  getJson(key: string, defaultVal: unknown): unknown
  track(event: string, data?: Record<string, unknown>): void
}

// LaunchDarkly implementation
class LaunchDarklyClient implements FlagClient {
  private client: LDClient

  constructor(env: { clientSideId: string; user: LDUser }) {
    this.client = initialize(env.clientSideId, env.user)
  }

  getBoolean(key: string, defaultVal: boolean): boolean {
    return this.client.variation(key, defaultVal)
  }

  getNumber(key: string, defaultVal: number): number {
    return this.client.variation(key, defaultVal)
  }

  getString(key: string, defaultVal: string): string {
    return this.client.variation(key, defaultVal)
  }

  getJson(key: string, defaultVal: unknown): unknown {
    return this.client.variation(key, defaultVal)
  }

  track(event: string, data?: Record<string, unknown>) {
    this.client.track(event, data)
  }
}
```

### Step 3: React Integration
```tsx
const FlagContext = createContext<FlagClient | null>(null)

function FlagProvider({ client, children }: { client: FlagClient; children: React.ReactNode }) {
  return <FlagContext.Provider value={client}>{children}</FlagContext.Provider>
}

function useFlag(key: FlagKey): boolean {
  const client = useContext(FlagContext)!
  const def = flags[key]
  return client.getBoolean(def.key, def.default as boolean)
}

function useFlagValue<T>(key: FlagKey): T {
  const client = useContext(FlagContext)!
  const def = flags[key]
  return client.getJson(def.key, def.default) as T
}

// Usage
function CheckoutPage() {
  const useNewFlow = useFlag('newCheckoutFlow')
  return useNewFlow ? <NewCheckout /> : <LegacyCheckout />
}
```

### Step 4: Gradual Rollout
```typescript
// LaunchDarkly targeting rule (JSON in dashboard, or via config)
{
  "rules": [
    {
      "clauses": [
        {
          "attribute": "email",
          "op": "endsWith",
          "values": ["@internal.com"]
        }
      ],
      "variation": 1  // target internal users first
    },
    {
      "clauses": [
        {
          "attribute": "country",
          "op": "in",
          "values": ["US", "CA"]
        }
      ],
      "variation": 0  // roll out to US/CA at 10%
    }
  ],
  "variations": [false, true],
  "salt": "new-checkout-rollout-v1"
}
```

### Step 5: A/B Test Tracking
```tsx
function useABTest(flagKey: FlagKey, exposureName: string): boolean {
  const client = useContext(FlagContext)!
  const def = flags[flagKey]
  const value = client.getBoolean(def.key, def.default as boolean)

  useEffect(() => {
    client.track(exposureName, {
      flagKey: def.key,
      variation: value ? 'treatment' : 'control',
    })
  }, []) // fire once on mount

  return value
}

// Usage with experiment tracking
function PricingPage() {
  const showNewPricing = useABTest('newPricingModel', 'pricing-page-exposure')
  return showNewPricing ? <NewPricing /> : <CurrentPricing />
}
```

### Step 6: Flag Cleanup Checklist
- [ ] Remove flag evaluation code after feature is 100% rolled out.
- [ ] Delete dead flag keys from provider dashboard.
- [ ] Keep flag definition file as source of truth — delete the entry.
- [ ] Run codemod to remove conditional branches: `git grep 'useFlag\|useABTest'`.

### Step 7: Custom Flag Backend (No Provider)
```typescript
// Minimal in-memory + localStorage backend
class LocalFlagClient implements FlagClient {
  private flags: Map<string, unknown> = new Map()
  private listeners: Set<() => void> = new Set()

  constructor(private configUrl: string) {}

  async initialize() {
    const response = await fetch(this.configUrl)
    const data = await response.json()
    Object.entries(data).forEach(([key, value]) => {
      this.flags.set(key, value)
    })
    // Persist to localStorage for offline tolerance
    localStorage.setItem('feature-flags-cache', JSON.stringify(data))
  }

  getBoolean(key: string, defaultVal: boolean): boolean {
    return (this.flags.get(key) ?? defaultVal) as boolean
  }

  getNumber(key: string, defaultVal: number): number {
    return (this.flags.get(key) ?? defaultVal) as number
  }

  getString(key: string, defaultVal: string): string {
    return (this.flags.get(key) ?? defaultVal) as string
  }

  getJson(key: string, defaultVal: unknown): unknown {
    return this.flags.get(key) ?? defaultVal
  }

  track(event: string, data?: Record<string, unknown>) {
    console.log('[FlagTrack]', event, data)
    // Send to analytics
  }
}
```

### Step 8: Testing with Feature Flags
```typescript
// Mock flag client for tests
class MockFlagClient implements FlagClient {
  private overrides: Map<string, unknown> = new Map()

  setFlag(key: string, value: unknown) {
    this.overrides.set(key, value)
  }

  getBoolean(key: string, defaultVal: boolean): boolean {
    return (this.overrides.get(key) ?? defaultVal) as boolean
  }
  // ... other methods
}

// Test
it('shows new checkout when flag is enabled', () => {
  const mockClient = new MockFlagClient()
  mockClient.setFlag('new-checkout-flow', true)

  render(
    <FlagProvider client={mockClient}>
      <CheckoutPage />
    </FlagProvider>
  )

  expect(screen.getByTestId('new-checkout')).toBeInTheDocument()
})
```

### Step 9: SSR / Next.js Integration
```typescript
// Server-side flag evaluation (Next.js App Router)
import { cookies } from 'next/headers'

async function getServerFlags() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  // Evaluate flags server-side
  const flags = await evaluateFlags(userId, [
    { key: 'new-checkout-flow', default: false },
  ])

  return flags
}

// Pass flags to client via RSC or inline script
export default async function Page() {
  const flags = await getServerFlags()
  return <ClientShell serverFlags={flags} />
}
```

## Common Pitfalls

### 1. Raw String Keys Throughout Codebase
```typescript
// BAD -- scattered string keys
if (ldClient.variation('new-checkout-flow', false)) { }

// GOOD -- typed flag definitions
if (useFlag('newCheckoutFlow')) { }
```

### 2. No Fallback Value
```typescript
// BAD -- no default, crashes if provider unavailable
ldClient.variation('my-flag')

// GOOD -- always provide default
ldClient.variation('my-flag', false)
```

### 3. Provider Imported Directly in Components
Direct SDK imports couple components to a specific provider. Always wrap in an abstraction layer so you can swap providers without touching component code.

### 4. Forgetting to Clean Up Dead Flags
Old flag conditions accumulate as technical debt. Dead flag code hides bugs and confuses developers. Set a 2-release maximum lifespan.

### 5. No Exposure Tracking for A/B Tests
Without exposure tracking, you cannot analyze experiment results. Every A/B test flag must fire an exposure event when the user is assigned.

## Compared With

| Feature | LaunchDarkly | Split.io | Flagsmith | Custom Backend |
|---------|-------------|----------|-----------|---------------|
| Real-time updates | SSE | SSE | Polling | Polling |
| Percentage rollout | Yes | Yes | Yes | Yes |
| User targeting | Yes | Yes | Yes | Manual |
| A/B test analysis | Built-in | Built-in | External | External |
| Open source | No | No | Yes | N/A |
| Free tier | 5 seats, 3 flags | 50 MAU | 1,000 MAU | Unlimited |
| SDK languages | 15+ | 15+ | 10+ | Any |

## Performance Considerations

### SDK Bundle Size
LaunchDarkly client-side SDK is ~35KB gzipped. Split.io is ~25KB gzipped. If bundle size is a concern, consider a custom backend with a tiny client (~2KB).

### Flag Evaluation Latency
LaunchDarkly evaluates flags client-side in ~1-5ms once initialized. Initialization requires a network call (100-500ms). Always set `timeout` to avoid blocking rendering.

### Polling vs SSE
- SSE (LaunchDarkly): Instant updates, persistent connection. Good for real-time flags.
- Polling (custom/Flagsmith): Configurable interval (30s-300s). Lower server cost but staleness.
- Hybrid: Evaluate once on page load, then subscribe to SSE for updates.

## Accessibility Considerations

- Flag-controlled UI changes should be announced to screen readers (use `aria-live` regions)
- Don't hide critical functionality behind a flag without fallback for users who miss the feature
- A/B test variants should maintain the same accessibility level as control

## Security Considerations

- Never expose flag evaluation context (user attributes, targeting rules) to unauthorized users
- Flag admin dashboards require authentication and audit logging
- Flag values received from the provider must be validated before use (especially JSON flags)
- Don't use feature flags to hide security vulnerabilities

## Rules
- All flags defined in one typed file — no raw string keys in components.
- Every flag evaluation must have a fallback default value.
- Wrap provider client in an abstraction — never import SDK directly in components.
- A/B tests must fire an exposure event when the user is assigned.
- Gradual rollout: internal users → staged rollout (10%, 25%, 50%, 100%) → full release.
- Clean up flags within 2 releases — dead flag code is technical debt.

## References
  - references/feature-flag-systems.md — Feature Flag Systems
  - references/feature-flag-testing.md — Feature Flag Testing
  - references/flag-lifecycle-management.md — Flag Lifecycle Management
  - references/flag-providers.md — Feature Flag Providers
  - references/flag-sdk-customization.md — Flag SDK Customization
  - references/flag-strategies.md — Feature Flag Strategies
## Handoff
No artifact produced.
Next skill: `testing` — mock flag client for component tests.
Carry forward: flag definition file pattern, provider abstraction, targeting strategy.
