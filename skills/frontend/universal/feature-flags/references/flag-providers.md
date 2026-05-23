# Feature Flag Providers

## Provider Comparison

| Provider | Client SDK | Free Tier | Targeting | A/B Analysis |
|----------|-----------|-----------|-----------|--------------|
| LaunchDarkly | JS, React, Node | 5 seats, 3 flags | Users, segments, % | Built-in |
| Split.io | JS, React, Node | 50 MAU, 10 flags | Users, % | Built-in |
| Flagsmith | JS, React, Node | 50,000 requests/mo | Users, segments, % | Webhooks |
| PostHog | JS, React, Node | 1M events/mo | Users, cohorts, % | Built-in + Funnel |
| Custom (Firebase) | Remote Config | Pay-as-you-go | User properties, % | Manual |

## LaunchDarkly React SDK

```tsx
import { LDProvider, useFlags, useLDClient } from 'launchdarkly-react-client-sdk'

function App() {
  return (
    <LDProvider
      clientSideID={import.meta.env.VITE_LD_CLIENT_ID}
      user={{ key: user.id, email: user.email, custom: { plan: user.plan } }}
      options={{ bootstrap: 'localStorage' }}
    >
      <Main />
    </LDProvider>
  )
}

function Checkout() {
  const { 'new-checkout': enabled } = useFlags()
  const ldClient = useLDClient()

  useEffect(() => {
    ldClient?.track('checkout-exposure', { variation: enabled ? 'new' : 'old' })
  }, [enabled])

  return enabled ? <NewCheckout /> : <OldCheckout />
}
```

## Split.io React SDK

```tsx
import { SplitFactory } from '@splitsoftware/splitio-react'

const factory = SplitFactory({
  core: {
    authorizationKey: import.meta.env.VITE_SPLIT_API_KEY,
    key: user.id,
  },
})

function App() {
  return (
    <SplitFactory factory={factory}>
      <Main />
    </SplitFactory>
  )
}

// Usage
import { useSplitTreatments } from '@splitsoftware/splitio-react'

function Pricing() {
  const { treatments } = useSplitTreatments({ names: ['new-pricing'] })
  const showNew = treatments['new-pricing']?.treatment === 'on'

  return showNew ? <NewPricing /> : <CurrentPricing />
}
```

## Flagsmith React SDK

```tsx
import { FlagsmithProvider, useFlags } from 'flagsmith/react'

function App() {
  return (
    <FlagsmithProvider
      environmentId={import.meta.env.VITE_FLAGSMITH_ENV}
      identity={user.id}
      traits={{ plan: user.plan }}
    >
      <Main />
    </FlagsmithProvider>
  )
}

function Dashboard() {
  const flags = useFlags(['dark-mode', 'beta-features'])
  return (
    <div className={flags['dark-mode']?.enabled ? 'dark' : 'light'}>
      {flags['beta-features']?.enabled && <BetaPanel />}
    </div>
  )
}
```

## Custom Provider (Firebase Remote Config)

```tsx
import { getRemoteConfig, getValue, fetchAndActivate } from 'firebase/remote-config'

async function initFlags(userId: string) {
  const rc = getRemoteConfig()
  rc.settings.minimumFetchIntervalMillis = 3600000 // 1 hour
  rc.defaults = {
    new_checkout: false,
    max_items: 10,
  }
  await fetchAndActivate(rc)
  return rc
}

function useRemoteFlag(key: string, defaultVal: boolean): boolean {
  const [val, setVal] = useState(defaultVal)

  useEffect(() => {
    initFlags('user-123').then((rc) => {
      const v = getValue(rc, key).asBoolean()
      setVal(v)
    })
  }, [key])

  return val
}
```

## Mock Flag Client for Tests

```tsx
class MockFlagClient implements FlagClient {
  private flags = new Map<string, unknown>()

  constructor(overrides: Record<string, unknown> = {}) {
    Object.entries(overrides).forEach(([k, v]) => this.flags.set(k, v))
  }

  getBoolean(key: string, defaultVal: boolean): boolean {
    return (this.flags.get(key) as boolean) ?? defaultVal
  }

  getNumber(key: string, defaultVal: number): number {
    return (this.flags.get(key) as number) ?? defaultVal
  }

  getString(key: string, defaultVal: string): string {
    return (this.flags.get(key) as string) ?? defaultVal
  }

  getJson(key: string, defaultVal: unknown): unknown {
    return this.flags.get(key) ?? defaultVal
  }

  track(_event: string, _data?: Record<string, unknown>) { /* noop */ }
}
```
