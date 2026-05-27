# TypeScript Generics Patterns

## Generic Component Props

```typescript
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
  emptyState?: React.ReactNode
  loading?: boolean
}

function GenericList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyState,
  loading,
}: ListProps<T>) {
  if (loading) return <div>Loading...</div>
  if (items.length === 0) return <>{emptyState ?? <div>No items</div>}</>

  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  )
}

// Usage with inferred types
interface User { id: number; name: string }
<UserList> = () => (
  <GenericList
    items={users}
    renderItem={(user) => <span>{user.name}</span>}
    keyExtractor={(user) => String(user.id)}
  />
)
```

## Generic Hook Patterns

```typescript
function useApi<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
): {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const validate = (rules: Partial<Record<keyof T, (val: T[keyof T]) => string | null>>) => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    for (const [key, rule] of Object.entries(rules)) {
      const error = rule!(values[key as keyof T])
      if (error) newErrors[key as keyof T] = error
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  return { values, errors, setField, validate, reset: () => setValues(initial) }
}
```

## Generic API Client

```typescript
interface ApiClientConfig {
  baseUrl: string
  headers?: Record<string, string>
}

class ApiClient {
  private config: ApiClientConfig

  constructor(config: ApiClientConfig) {
    this.config = config
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${path}`)
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const response = await fetch(url.toString(), {
      headers: this.config.headers,
    })
    return response.json()
  }

  async post<T, B = unknown>(path: string, body: B): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.config.headers },
      body: JSON.stringify(body),
    })
    return response.json()
  }

  createResource<T, C = Omit<T, 'id'>>(resource: string) {
    return {
      list: (params?: Record<string, string>) =>
        this.get<T[]>(`/${resource}`, params),
      get: (id: string) =>
        this.get<T>(`/${resource}/${id}`),
      create: (data: C) =>
        this.post<T, C>(`/${resource}`, data),
    }
  }
}

// Usage
interface Post { id: string; title: string; content: string }
const api = new ApiClient({ baseUrl: 'https://api.example.com' })
const posts = api.createResource<Post>('posts')
// posts.list(), posts.get('123'), posts.create({ title: 'New', content: '...' })
```

## Generic Repository Pattern

```typescript
interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

type CreateEntity<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

class Repository<T extends BaseEntity> {
  private items: Map<string, T> = new Map()

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) ?? null
  }

  async findAll(filter?: (item: T) => boolean): Promise<T[]> {
    const all = Array.from(this.items.values())
    return filter ? all.filter(filter) : all
  }

  async create(data: CreateEntity<T>): Promise<T> {
    const now = new Date().toISOString()
    const entity = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as unknown as T
    this.items.set(entity.id, entity)
    return entity
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    const existing = this.items.get(id)
    if (!existing) return null
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    }
    this.items.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id)
  }
}

// Usage
interface UserEntity extends BaseEntity {
  name: string
  email: string
  role: 'admin' | 'user'
}

const userRepo = new Repository<UserEntity>()
```

## Generic Builder Pattern

```typescript
class QueryBuilder<T> {
  private conditions: string[] = []
  private orderByField: keyof T | null = null
  private orderDirection: 'ASC' | 'DESC' = 'ASC'
  private limitCount: number | null = null
  private offsetCount: number | null = null

  where(field: keyof T, operator: string, value: unknown): this {
    this.conditions.push(`${String(field)} ${operator} ${value}`)
    return this
  }

  orderBy(field: keyof T, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByField = field
    this.orderDirection = direction
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  offset(count: number): this {
    this.offsetCount = count
    return this
  }

  build(): string {
    let query = `SELECT * FROM ${this.getTableName()}`
    if (this.conditions.length > 0) {
      query += ` WHERE ${this.conditions.join(' AND ')}`
    }
    if (this.orderByField) {
      query += ` ORDER BY ${String(this.orderByField)} ${this.orderDirection}`
    }
    if (this.limitCount !== null) {
      query += ` LIMIT ${this.limitCount}`
    }
    if (this.offsetCount !== null) {
      query += ` OFFSET ${this.offsetCount}`
    }
    return query
  }

  private getTableName(): string {
    return `${String(this.orderByField ?? '')}_table`
  }
}
```

## Generic State Machine

```typescript
type StateMachineConfig<T extends string, C extends Record<string, unknown>> = {
  states: T[]
  transitions: Record<T, Partial<Record<T, (context: C) => boolean | Promise<boolean>>>>
  initial: T
  context: C
}

class StateMachine<T extends string, C extends Record<string, unknown>> {
  private currentState: T
  private context: C
  private transitions: StateMachineConfig<T, C>['transitions']
  private listeners: Map<T, Set<() => void>> = new Map()

  constructor(config: StateMachineConfig<T, C>) {
    this.currentState = config.initial
    this.context = config.context
    this.transitions = config.transitions
  }

  get state(): T { return this.currentState }
  get ctx(): C { return { ...this.context } }

  async transition(to: T): Promise<boolean> {
    const allowed = this.transitions[this.currentState]?.[to]
    if (!allowed) return false

    const canTransition = await allowed(this.context)
    if (!canTransition) return false

    this.currentState = to
    this.notify(to)
    return true
  }

  on(state: T, listener: () => void): () => void {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, new Set())
    }
    this.listeners.get(state)!.add(listener)
    return () => this.listeners.get(state)?.delete(listener)
  }

  private notify(state: T): void {
    this.listeners.get(state)?.forEach(fn => fn())
  }
}
```

## Key Points

- Use generic props on components for type-safe rendering
- Create generic hooks for reusable data fetching and form logic
- Abstract API clients with typed resource methods
- Implement repositories with CRUD operations for entities
- Use builder patterns with generic constraints for query construction
- Build state machines with typed states and transitions
- Constrain generic types with extends for safer usage
- Provide meaningful type inference through generic parameters
- Avoid over-constraining: prefer minimal constraints needed
- Document generic type parameters with descriptive names
