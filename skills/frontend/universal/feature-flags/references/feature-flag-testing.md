# Feature Flag Testing

## Mocking Flag Client

```typescript
// Test flag client implementation
class MockFlagClient implements FlagClient {
  private flags: Map<string, boolean | number | string> = new Map()

  constructor(overrides: Record<string, boolean | number | string> = {}) {
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

  track(event: string, data?: Record<string, unknown>): void {
    // no-op in tests
  }
}
```

## Component Testing with Flags

```typescript
import { render, screen } from '@testing-library/react'
import { FlagProvider } from './FlagProvider'
import { MockFlagClient } from './test-utils'

function renderWithFlags(ui: React.ReactElement, flags: Record<string, boolean | number | string> = {}) {
  const client = new MockFlagClient(flags)
  return render(<FlagProvider client={client}>{ui}</FlagProvider>)
}

describe('CheckoutPage', () => {
  it('renders new checkout when flag is enabled', () => {
    renderWithFlags(<CheckoutPage />, { 'new-checkout-flow': true })
    expect(screen.getByTestId('new-checkout')).toBeInTheDocument()
  })

  it('renders legacy checkout when flag is disabled', () => {
    renderWithFlags(<CheckoutPage />, { 'new-checkout-flow': false })
    expect(screen.getByTestId('legacy-checkout')).toBeInTheDocument()
  })

  it('renders legacy checkout when flag is not present (default)', () => {
    renderWithFlags(<CheckoutPage />)
    expect(screen.getByTestId('legacy-checkout')).toBeInTheDocument()
  })
})
```

## Integration Testing with Flags

```typescript
describe('useABTest tracking', () => {
  it('fires exposure event when component mounts', () => {
    const track = vi.fn()
    const client = new MockFlagClient({ 'new-pricing': true })
    client.track = track

    renderWithFlags(<PricingPage />, { 'new-pricing': true }, client)

    expect(track).toHaveBeenCalledWith('pricing-page-exposure', {
      flagKey: 'new-pricing',
      variation: 'treatment',
    })
  })
})
```

## E2E Testing with Flags

```typescript
// Cypress: override flags via provider API
cy.intercept('GET', '**/flags*', {
  body: { 'new-checkout': { enabled: true } },
})

// Playwright: set flag via cookie or localStorage
await page.evaluate(() => {
  localStorage.setItem('flag_overrides', JSON.stringify({ 'new-checkout': true }))
})
await page.reload()

// Or use provider-specific API
// LaunchDarkly: cy.visit('/', { onBeforeLoad(win) { /* mock LD client */ } })
```

## Testing Flag Combinations

```typescript
describe('feature combinations', () => {
  const flagCombinations = [
    { newCheckout: true, showPromo: true },
    { newCheckout: true, showPromo: false },
    { newCheckout: false, showPromo: true },
    { newCheckout: false, showPromo: false },
  ]

  it.each(flagCombinations)('renders with flags %j', (flags) => {
    renderWithFlags(<CheckoutPage />, {
      'new-checkout-flow': flags.newCheckout,
      'show-promo-banner': flags.showPromo,
    })

    // Assert both flags affect rendering correctly
    if (flags.newCheckout) {
      expect(screen.getByTestId('new-checkout')).toBeInTheDocument()
    }
    if (flags.showPromo) {
      expect(screen.getByTestId('promo-banner')).toBeInTheDocument()
    }
  })
})
```

## Testing Rollout Logic

```typescript
describe('percentage rollout', () => {
  it('distributes users consistently', () => {
    const results = { enabled: 0, disabled: 0 }

    // Simulate 1000 users
    for (let i = 0; i < 1000; i++) {
      const user = { key: `user-${i}`, custom: { signupDate: '2024-01-01' } }
      const client = new MockFlagClient()
      const hash = hashUser(user.key, 'checkout-rollout')
      const pct = (hash % 10000) / 100

      if (pct < 50) { // 50% rollout
        results.enabled++
      } else {
        results.disabled++
      }
    }

    // ~50% should be enabled
    expect(results.enabled).toBeGreaterThan(400)
    expect(results.enabled).toBeLessThan(600)
  })
})
```

## A/B Test Validation

```typescript
describe('A/B test assignment', () => {
  it('assigns users consistently across sessions', () => {
    const user = { key: 'fixed-user-id' }
    const client1 = new MockFlagClient({ 'experiment': true })
    const client2 = new MockFlagClient({ 'experiment': true })

    // Same user always gets same assignment
    const assignment1 = client1.getString('experiment', 'control')
    const assignment2 = client2.getString('experiment', 'control')

    expect(assignment1).toBe(assignment2)
  })

  it('logs exposure event once per session', () => {
    const track = vi.fn()
    const client = new MockFlagClient({ 'experiment': true })
    client.track = track

    // Component mounts
    renderWithFlags(<ExperimentComponent />, { 'experiment': true }, client)
    expect(track).toHaveBeenCalledTimes(1)

    // Re-render does not fire again
    renderWithFlags(<ExperimentComponent />, { 'experiment': true }, client)
    expect(track).toHaveBeenCalledTimes(1)
  })
})
```

## Testing Checklist for Flags

- [ ] Every flagged code path tested in both enabled and disabled states
- [ ] Component tests cover flags that affect rendering
- [ ] Flag combinations tested (2+ flags interacting)
- [ ] Exposure events verified in A/B test components
- [ ] Fallback/default value used when flag is missing
- [ ] Provider abstraction mocked in all tests
- [ ] Percentage rollout tested statistically
- [ ] Flag cleanup verified (no stale flags in tests)
