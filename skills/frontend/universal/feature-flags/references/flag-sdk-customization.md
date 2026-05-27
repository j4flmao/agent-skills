# Flag SDK Customization

## Provider Abstraction Layer

```typescript
interface FlagClient {
  getValue<T>(key: string, defaultValue: T, context?: FlagContext): Promise<T>
  getValueSync<T>(key: string, defaultValue: T, context?: FlagContext): T
  getAllFlags(context?: FlagContext): Promise<Record<string, FlagValue>>
  on(event: string, handler: FlagEventHandler): void
  off(event: string, handler: FlagEventHandler): void
}

interface FlagContext {
  user?: {
    id: string
    email?: string
    name?: string
    attributes?: Record<string, string | number | boolean>
  }
  device?: {
    type: string
    os: string
    version?: string
  }
  environment?: string
  custom?: Record<string, string | number | boolean>
}

type FlagValue = string | number | boolean | object
type FlagEventHandler = (data: { key: string; value: FlagValue }) => void
```

## LaunchDarkly Adapter

```typescript
import { LDClient, LDEvaluationDetail } from 'launchdarkly-js-client-sdk'

class LaunchDarklyAdapter implements FlagClient {
  private client: LDClient
  private ready: Promise<void>

  constructor(envKey: string, options?: Record<string, unknown>) {
    this.client = new LDClient(envKey, options)
    this.ready = new Promise((resolve) => {
      this.client.on('ready', resolve)
    })
  }

  async getValue<T>(key: string, defaultValue: T, context?: FlagContext): Promise<T> {
    await this.ready
    const ldContext = this.mapContext(context)
    return this.client.variation(key, defaultValue, ldContext) as T
  }

  getValueSync<T>(key: string, defaultValue: T, context?: FlagContext): T {
    const ldContext = this.mapContext(context)
    return this.client.variation(key, defaultValue, ldContext) as T
  }

  async getAllFlags(context?: FlagContext): Promise<Record<string, FlagValue>> {
    await this.ready
    const ldContext = this.mapContext(context)
    return this.client.allFlags(ldContext)
  }

  on(event: string, handler: FlagEventHandler): void {
    this.client.on(event, handler)
  }

  off(event: string, handler: FlagEventHandler): void {
    this.client.off(event, handler)
  }

  private mapContext(context?: FlagContext): Record<string, unknown> {
    if (!context) return { kind: 'user', key: 'anonymous' }
    return {
      kind: 'user',
      key: context.user?.id ?? 'anonymous',
      email: context.user?.email,
      name: context.user?.name,
      custom: {
        ...context.custom,
        deviceType: context.device?.type,
        deviceOs: context.device?.os,
        environment: context.environment,
        ...context.user?.attributes,
      },
    }
  }
}
```

## Custom Backend Provider

```typescript
interface BackendFlagConfig {
  baseUrl: string
  apiKey: string
  refreshIntervalMs?: number
  cacheSize?: number
}

interface CachedFlag {
  value: FlagValue
  ttl: number
  timestamp: number
}

class CustomBackendProvider implements FlagClient {
  private config: BackendFlagConfig
  private cache: Map<string, CachedFlag> = new Map()
  private refreshTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Map<string, Set<FlagEventHandler>> = new Map()
  private allFlags: Record<string, FlagValue> = {}

  constructor(config: BackendFlagConfig) {
    this.config = config
    this.startRefresh()
  }

  private startRefresh(): void {
    const interval = this.config.refreshIntervalMs ?? 30000
    this.refreshTimer = setInterval(() => this.syncFlags(), interval)
    this.syncFlags()
  }

  private async syncFlags(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/flags`, {
        headers: { 'X-API-Key': this.config.apiKey },
      })
      const flags: Record<string, FlagValue> = await response.json()
      const previousFlags = { ...this.allFlags }
      this.allFlags = flags

      for (const [key, value] of Object.entries(flags)) {
        if (previousFlags[key] !== value) {
          this.emit(key, value)
        }
      }
    } catch (error) {
      console.error('Flag sync failed:', error)
    }
  }

  async getValue<T>(key: string, defaultValue: T, context?: FlagContext): Promise<T> {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.value as T
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/flags/${key}/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
          },
          body: JSON.stringify({ context }),
        }
      )
      const data = await response.json()
      this.cache.set(key, {
        value: data.value,
        ttl: data.ttl ?? 5000,
        timestamp: Date.now(),
      })
      return data.value as T
    } catch {
      return defaultValue
    }
  }

  getValueSync<T>(key: string, defaultValue: T, _context?: FlagContext): T {
    return this.allFlags[key] as T ?? defaultValue
  }

  async getAllFlags(_context?: FlagContext): Promise<Record<string, FlagValue>> {
    return { ...this.allFlags }
  }

  on(event: string, handler: FlagEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: string, handler: FlagEventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  private emit(key: string, value: FlagValue): void {
    const handlers = this.listeners.get(`change:${key}`)
    handlers?.forEach(h => h({ key, value }))

    const allHandlers = this.listeners.get('change')
    allHandlers?.forEach(h => h({ key, value }))
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    this.cache.clear()
    this.listeners.clear()
  }
}
```

## React Context Provider

```typescript
interface FlagProviderProps {
  client: FlagClient
  children: React.ReactNode
  defaultContext?: FlagContext
  loadingFallback?: React.ReactNode
}

interface FlagContextValue {
  client: FlagClient
  context: FlagContext
  isReady: boolean
}

const FlagCtx = createContext<FlagContextValue | null>(null)

function FlagProvider({
  client,
  children,
  defaultContext,
  loadingFallback,
}: FlagProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<FlagContext>(
    defaultContext ?? {}
  )

  useEffect(() => {
    let mounted = true
    client.getAllFlags(context).then(() => {
      if (mounted) setIsReady(true)
    })
    return () => { mounted = false }
  }, [])

  if (!isReady && loadingFallback) {
    return <>{loadingFallback}</>
  }

  return (
    <FlagCtx.Provider value={{ client, context, isReady }}>
      {children}
    </FlagCtx.Provider>
  )
}

function useFlagClient(): FlagContextValue {
  const ctx = useContext(FlagCtx)
  if (!ctx) {
    throw new Error('useFlagClient must be used within a FlagProvider')
  }
  return ctx
}
```

## Custom Hook with Type Safety

```typescript
function useFlag<T = boolean>(
  key: string,
  defaultValue: T
): { value: T; isLoading: boolean; trackExposure: () => void } {
  const { client, context, isReady } = useFlagClient()
  const [value, setValue] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const exposed = useRef(false)

  useEffect(() => {
    if (!isReady) return

    setIsLoading(true)
    client.getValue<T>(key, defaultValue, context).then((result) => {
      setValue(result)
      setIsLoading(false)
    })

    const handleChange = (data: { key: string; value: FlagValue }) => {
      if (data.key === key) {
        setValue(data.value as T)
      }
    }

    client.on(`change:${key}`, handleChange)
    return () => client.off(`change:${key}`, handleChange)
  }, [key, isReady])

  const trackExposure = useCallback(() => {
    if (exposed.current) return
    exposed.current = true
  }, [])

  return { value, isLoading, trackExposure }
}

function useFeatureFlag(flagKey: string): boolean {
  const { value } = useFlag(flagKey, false)
  return value
}

function useTypedFlag<T extends FlagValue>(
  key: string,
  defaultVal: T
): { value: T; isLoading: boolean } {
  const { value, isLoading } = useFlag(key, defaultVal)
  return { value: value as T, isLoading }
}
```

## Evaluation with Context Enrichment

```typescript
function useEnrichedContext(): FlagContext {
  const { user } = useAuth()
  const { platform, os } = usePlatform()
  const experimentGroup = useExperimentAssignment()

  return {
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      attributes: {
        plan: user.plan,
        region: user.region,
        accountAge: user.accountAge,
        experimentGroup,
      },
    } : undefined,
    device: {
      type: platform,
      os,
    },
    environment: process.env.NODE_ENV,
  }
}

function FlaggedFeature({
  flagKey,
  fallback = null,
  children,
}: {
  flagKey: string
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { value, trackExposure } = useFeatureFlag(flagKey)

  useEffect(() => {
    trackExposure()
  }, [value])

  return value ? <>{children}</> : <>{fallback}</>
}
```

## A/B Test Context Provider

```typescript
interface ABTestConfig {
  client: FlagClient
  experiments: Record<string, { variations: string[]; weights?: number[] }>
}

function ABTestProvider({ client, experiments, children }: ABTestConfig & { children: React.ReactNode }) {
  const assignments = useRef<Record<string, string>>({})

  for (const [key, config] of Object.entries(experiments)) {
    const assignment = client.getValueSync(key, config.variations[0], {
      custom: { experimentKey: key },
    }) as string
    assignments.current[key] = assignment
  }

  return (
    <ABTestCtx.Provider value={assignments.current}>
      {children}
    </ABTestCtx.Provider>
  )
}
```

## Key Points

- Wrap the flag provider SDK behind an abstraction interface for testability and vendor flexibility
- Implement a caching layer with TTL to reduce network calls
- Support both async (await-based) and sync evaluation patterns
- Use React context to provide the flag client throughout the component tree
- Expose custom hooks with proper type safety and exposure tracking
- Enrich evaluation context with user, device, and environment data
- Subscribe to real-time flag changes to update UI without page reload
- Provide a custom backend provider for scenarios where vendor SDKs are unavailable
- Implement A/B test assignment tracking for experiment analysis
- Always provide sensible default values for every flag evaluation
