# Flag Lifecycle Management

## Flag States

```typescript
type FlagStatus = 'draft' | 'dev' | 'staging' | 'production' | 'deprecated' | 'removed'

interface FlagDefinition {
  key: string
  name: string
  description: string
  owner: string
  status: FlagStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  jiraTicket?: string
  prUrl?: string
  removalDate?: string
  targetingRules?: TargetingRule[]
  variations: FlagVariation[]
}

interface FlagVariation {
  name: string
  value: boolean | string | number | object
  isControl?: boolean
}
```

## Lifecycle State Machine

```typescript
type FlagTransition =
  | { from: 'draft'; to: 'dev' }
  | { from: 'dev'; to: 'staging' }
  | { from: 'staging'; to: 'production' }
  | { from: 'production'; to: 'deprecated' }
  | { from: 'deprecated'; to: 'removed' }
  | { from: 'deprecated'; to: 'production' }
  | { from: 'production'; to: 'staging' }

const FLAG_TRANSITIONS: FlagTransition[] = [
  { from: 'draft', to: 'dev' },
  { from: 'dev', to: 'staging' },
  { from: 'staging', to: 'production' },
  { from: 'production', to: 'deprecated' },
  { from: 'deprecated', to: 'removed' },
  { from: 'deprecated', to: 'production' },
  { from: 'production', to: 'staging' },
]

function canTransition(flag: FlagDefinition, to: FlagStatus): boolean {
  return FLAG_TRANSITIONS.some(
    t => t.from === flag.status && t.to === to
  )
}

function transitionFlag(
  flag: FlagDefinition,
  to: FlagStatus,
  actor: string
): FlagDefinition {
  if (!canTransition(flag, to)) {
    throw new Error(`Cannot transition from ${flag.status} to ${to}`)
  }
  return {
    ...flag,
    status: to,
    updatedAt: new Date().toISOString(),
  }
}
```

## Flag Registration System

```typescript
class FlagRegistry {
  private flags: Map<string, FlagDefinition> = new Map()
  private listeners: Set<(flag: FlagDefinition, event: string) => void> = new Set()

  register(definition: FlagDefinition): void {
    if (this.flags.has(definition.key)) {
      throw new Error(`Flag "${definition.key}" already registered`)
    }
    this.flags.set(definition.key, definition)
    this.notify(definition, 'registered')
  }

  update(key: string, updates: Partial<FlagDefinition>): FlagDefinition {
    const existing = this.flags.get(key)
    if (!existing) throw new Error(`Flag "${key}" not found`)
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.flags.set(key, updated)
    this.notify(updated, 'updated')
    return updated
  }

  deprecate(key: string, removalDate: string): FlagDefinition {
    return this.update(key, {
      status: 'deprecated',
      removalDate,
    })
  }

  remove(key: string): void {
    const flag = this.flags.get(key)
    if (!flag) throw new Error(`Flag "${key}" not found`)
    if (flag.status !== 'deprecated') {
      throw new Error(`Cannot remove flag "${key}" that is not deprecated`)
    }
    this.flags.delete(key)
    this.notify(flag, 'removed')
  }

  getByStatus(status: FlagStatus): FlagDefinition[] {
    return Array.from(this.flags.values()).filter(f => f.status === status)
  }

  getOverdueForRemoval(): FlagDefinition[] {
    const now = new Date()
    return Array.from(this.flags.values()).filter(
      f => f.status === 'deprecated' && f.removalDate && new Date(f.removalDate) < now
    )
  }

  private notify(flag: FlagDefinition, event: string): void {
    this.listeners.forEach(fn => fn(flag, event))
  }

  subscribe(fn: (flag: FlagDefinition, event: string) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}
```

## Flag Definition File

```typescript
// flags.definition.ts
export const flags = {
  newCheckoutFlow: {
    key: 'new-checkout-flow',
    name: 'New Checkout Flow',
    description: 'Replaces the legacy checkout with the redesigned v2 flow',
    owner: 'checkout-team',
    status: 'production' as FlagStatus,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-03-01T14:30:00Z',
    createdBy: 'alice@company.com',
    prUrl: 'https://github.com/company/webapp/pull/1234',
    removalDate: '2025-06-01T00:00:00Z',
    variations: [
      { name: 'off', value: false, isControl: true },
      { name: 'on', value: true },
    ],
  },
  premiumPricingTiers: {
    key: 'premium-pricing-tiers',
    name: 'Premium Pricing Tiers',
    description: 'Enables new premium pricing tiers for enterprise customers',
    owner: 'pricing-team',
    status: 'staging' as FlagStatus,
    createdAt: '2025-02-20T09:00:00Z',
    updatedAt: '2025-03-10T11:00:00Z',
    createdBy: 'bob@company.com',
    jiraTicket: 'PRICING-456',
    variations: [
      { name: 'control', value: 'legacy', isControl: true },
      { name: 'tier-a', value: 'tier_a' },
      { name: 'tier-b', value: 'tier_b' },
    ],
  },
} as const satisfies Record<string, FlagDefinition>

export type FlagKey = keyof typeof flags
```

## Cleanup Automation

```typescript
interface FlagCleanupConfig {
  registry: FlagRegistry
  dryRun?: boolean
  onFlagRemoved?: (flag: FlagDefinition) => void
  onCodeFound?: (flag: FlagDefinition, files: string[]) => void
}

async function cleanupDeprecatedFlags(config: FlagCleanupConfig): Promise<void> {
  const { registry, dryRun = false } = config
  const overdue = registry.getOverdueForRemoval()

  for (const flag of overdue) {
    const files = await findFlagReferences(flag.key)

    if (files.length > 0) {
      config.onCodeFound?.(flag, files)
      console.warn(
        `Flag "${flag.key}" is overdue for removal but still referenced in ${files.length} files`
      )
      continue
    }

    if (!dryRun) {
      registry.remove(flag.key)
      config.onFlagRemoved?.(flag)
      console.log(`Removed flag "${flag.key}"`)
    }
  }
}

async function findFlagReferences(flagKey: string): Promise<string[]> {
  const pattern = `**/*.{ts,tsx,js,jsx}`
  const results = await glob(pattern)

  const references: string[] = []
  for (const file of results) {
    const content = await readFile(file, 'utf-8')
    if (
      content.includes(flagKey) ||
      content.includes(flagKey.replace(/-/g, '_')) ||
      content.includes(toCamelCase(flagKey))
    ) {
      references.push(file)
    }
  }
  return references
}

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}
```

## Flag Audit Trail

```typescript
interface AuditEvent {
  timestamp: string
  flagKey: string
  actor: string
  action: 'created' | 'updated' | 'activated' | 'deactivated' | 'deprecated' | 'removed'
  previousValue?: FlagDefinition
  newValue?: FlagDefinition
  reason?: string
}

class FlagAuditor {
  private events: AuditEvent[] = []

  record(event: Omit<AuditEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: new Date().toISOString(),
    })
  }

  query(filters: {
    flagKey?: string
    actor?: string
    action?: AuditEvent['action']
    from?: string
    to?: string
  }): AuditEvent[] {
    return this.events.filter(event => {
      if (filters.flagKey && event.flagKey !== filters.flagKey) return false
      if (filters.actor && event.actor !== filters.actor) return false
      if (filters.action && event.action !== filters.action) return false
      if (filters.from && event.timestamp < filters.from) return false
      if (filters.to && event.timestamp > filters.to) return false
      return true
    })
  }

  generateReport(): string {
    const byAction = this.events.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    const activeFlags = new Set(this.events.filter(e => e.action === 'created').map(e => e.flagKey))
    const removedFlags = new Set(this.events.filter(e => e.action === 'removed').map(e => e.flagKey))

    return [
      '# Flag Audit Report',
      '',
      `Total events: ${this.events.length}`,
      `Active flags: ${activeFlags.size - removedFlags.size}`,
      `Removed flags: ${removedFlags.size}`,
      '',
      '## Events by Action',
      ...Object.entries(byAction).map(([action, count]) => `- ${action}: ${count}`),
    ].join('\n')
  }
}
```

## Flag Validation

```typescript
interface FlagValidationRule {
  validate: (flag: FlagDefinition) => string | null
  severity: 'error' | 'warning'
}

const FLAG_VALIDATION_RULES: FlagValidationRule[] = [
  {
    validate: (flag) => {
      if (!flag.key.match(/^[a-z0-9-]+$/)) {
        return 'Flag key must be lowercase alphanumeric with hyphens'
      }
      return null
    },
    severity: 'error',
  },
  {
    validate: (flag) => {
      if (!flag.owner) return 'Flag must have an owner'
      return null
    },
    severity: 'error',
  },
  {
    validate: (flag) => {
      if (!flag.description || flag.description.length < 10) {
        return 'Flag description must be at least 10 characters'
      }
      return null
    },
    severity: 'warning',
  },
  {
    validate: (flag) => {
      if (!flag.createdBy) return 'Flag must have a creator'
      return null
    },
    severity: 'error',
  },
  {
    validate: (flag) => {
      if (flag.variations.length < 2) {
        return 'Flag must have at least 2 variations'
      }
      return null
    },
    severity: 'error',
  },
  {
    validate: (flag) => {
      if (flag.status === 'deprecated' && !flag.removalDate) {
        return 'Deprecated flags must have a removal date'
      }
      return null
    },
    severity: 'error',
  },
  {
    validate: (flag) => {
      if (flag.status === 'production' && !flag.prUrl) {
        return 'Production flags should have a PR URL reference'
      }
      return null
    },
    severity: 'warning',
  },
]

function validateFlag(flag: FlagDefinition): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  for (const rule of FLAG_VALIDATION_RULES) {
    const result = rule.validate(flag)
    if (result !== null) {
      if (rule.severity === 'error') errors.push(result)
      else warnings.push(result)
    }
  }

  return { errors, warnings }
}
```

## Key Points

- Define clear flag states: draft, dev, staging, production, deprecated, removed
- Enforce state transitions with a state machine pattern to prevent invalid changes
- Always assign an owner and creation metadata for accountability
- Set removal dates on deprecated flags and automate cleanup scanning
- Maintain an audit trail of all flag changes for compliance and debugging
- Run validation rules on flag creation and updates to catch issues early
- Search codebase for remaining references before removing flags
- Keep a centralized registry of all flag definitions with metadata
- Generate periodic reports on flag health and stale flags
- Link flags to tickets and PRs for full traceability
