---
name: frontend-feature-flags
description: >
  Use this skill when the user says 'feature flags', 'LaunchDarkly', 'split testing', 'A/B testing', 'gradual rollout', 'canary release', 'feature toggle', 'flag provider', 'targeting rule', or when implementing frontend feature flags. This skill enforces: typed flag definitions, provider-agnostic abstraction layer, gradual rollout with percentage targeting, and A/B test assignment tracking. Works with LaunchDarkly, Split.io, Flagsmith, or custom flag backends. Do NOT use for: backend-only flag evaluation, server-side config management, infrastructure provisioning.
version: "1.0.0"
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

## Rules
- All flags defined in one typed file — no raw string keys in components.
- Every flag evaluation must have a fallback default value.
- Wrap provider client in an abstraction — never import SDK directly in components.
- A/B tests must fire an exposure event when the user is assigned.
- Gradual rollout: internal users → staged rollout (10%, 25%, 50%, 100%) → full release.
- Clean up flags within 2 releases — dead flag code is technical debt.

## References
- `references/flag-providers.md` — LaunchDarkly, Split.io, Flagsmith integration patterns
- `references/flag-strategies.md` — targeting rules, percentage rollouts, A/B test design

## Handoff
No artifact produced.
Next skill: `testing` — mock flag client for component tests.
Carry forward: flag definition file pattern, provider abstraction, targeting strategy.
