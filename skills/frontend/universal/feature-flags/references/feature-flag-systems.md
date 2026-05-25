# Feature Flag Systems

## Flag Types

| Type | Use Case | Duration | Evaluation |
|------|----------|----------|------------|
| Release toggle | Launch new feature gradually | Days-weeks | Boolean |
| Experiment flag | A/B test variants | Weeks-months | String (multi-variant) |
| Operational flag | Control system behavior | Permanent | Boolean |
| Permission flag | Restrict to user segments | Permanent | Boolean |
| Kill switch | Disable feature under load | Temporary | Boolean |

## LaunchDarkly Setup

```typescript
import { LDProvider, useLDClient, useFlags } from 'launchdarkly-react-client-sdk'

function App() {
  return (
    <LDProvider
      clientSideID={import.meta.env.VITE_LD_CLIENT_ID}
      user={{ key: userId, email: userEmail, custom: { plan: userPlan, region } }}
      options={{ sendEvents: true }}
    >
      <MainApp />
    </LDProvider>
  )
}

function CheckoutPage() {
  const { newCheckout } = useFlags()

  return newCheckout ? <NewCheckout /> : <LegacyCheckout />
}
```

## Split.io Setup

```typescript
import { SplitFactory } from '@splitsoftware/splitio'
import { SplitTreatments, useSplitClient } from '@splitsoftware/splitio-react'

const splitClient = SplitFactory({
  core: {
    authorizationKey: import.meta.env.VITE_SPLIT_API_KEY,
    key: userId,
  },
})

// Usage
function CheckoutPage() {
  const treatments = useSplitClient(['new-checkout'])
  const showNew = treatments?.['new-checkout']?.treatment === 'on'

  return showNew ? <NewCheckout /> : <LegacyCheckout />
}
```

## Flagsmith Setup

```typescript
import { FlagsmithProvider, useFlags } from 'flagsmith/react'

function App() {
  return (
    <FlagsmithProvider
      environmentId={import.meta.env.VITE_FLAGSMITH_ENV_ID}
      options={{ identity: userId }}
    >
      <MainApp />
    </FlagsmithProvider>
  )
}

function CheckoutPage() {
  const flags = useFlags(['new_checkout'])
  return flags.new_checkout.enabled ? <NewCheckout /> : <LegacyCheckout />
}
```

## Custom Flag Backend

```typescript
// Simple JSON-based flag service
interface FlagConfig {
  [flagKey: string]: {
    enabled: boolean
    targeting?: TargetingRule[]
    variants?: Record<string, unknown>
  }
}

interface TargetingRule {
  attribute: string
  op: 'equals' | 'in' | 'contains' | 'gte' | 'lte'
  values: string[]
  variation: string | boolean | number
}

function evaluateFlag(flag: FlagConfig[keyof FlagConfig], user: UserContext): boolean {
  if (!flag.enabled) return false
  if (!flag.targeting?.length) return flag.enabled

  for (const rule of flag.targeting) {
    const userValue = user[rule.attribute as keyof UserContext]
    if (!userValue) continue

    const matches = rule.op === 'equals' ? String(userValue) === rule.values[0]
      : rule.op === 'in' ? rule.values.includes(String(userValue))
      : false

    if (matches) return rule.variation as boolean
  }

  return flag.enabled
}
```

## Flag Evaluation Context

```typescript
interface FlagContext {
  key: string                       // user ID
  email?: string
  name?: string
  custom?: {
    plan?: 'free' | 'pro' | 'enterprise'
    region?: 'US' | 'EU' | 'APAC'
    beta?: boolean
    signupDate?: string
    tier?: number
    groups?: string[]               // A/B test cohorts
    device?: 'mobile' | 'desktop'
    browser?: string
  }
}
```

## Gradual Rollout Plan

```
Phase 0: Internal (engineering team) → flag = on for @company.com
Phase 1: Beta (5% of users) → flag = on for 5% random
Phase 2: Staged (25% → 50% → 75%) → flag = on for increasing percentage
Phase 3: Full (100%) → flag = on for everyone
Phase 4: Cleanup → remove flag code, delete from provider
```

## Flag Cleanup Process

```typescript
// 1. Remove all flag conditionals from code
// 2. Delete flag definition from typed flag file
// 3. Archive flag in provider dashboard
// 4. Remove provider SDK if no flags remain

// Use codemod for large-scale cleanup
// git grep -l 'useFlag\|useABTest\|useFeature' | xargs sed -i '/flag-related/d'
```

## Flag Naming Convention

```
Format: {domain}-{feature}-{variant}
Examples:
  checkout-new-flow
  pricing-v2-layout
  search-typeahead-v2
  dashboard-widget-redesign

File structure:
  flags/
    flags.ts         — typed definitions
    provider.ts      — provider abstraction
    useFlag.ts       — hook implementation
    index.ts         — public API
```
