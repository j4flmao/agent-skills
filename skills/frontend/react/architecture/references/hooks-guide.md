# React Hooks Guide

## Custom Hook Naming
- Prefix with `use`
- Name describes what it does/returns: `useOrders`, `useDebounce`, `useLocalStorage`

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
```

## Rules of Hooks
- Call hooks only at the top level (not in conditions, loops, or nested functions)
- Call hooks only from React function components or custom hooks
- Dependency arrays must include all reactive values

```typescript
// ✅ Correct
useEffect(() => { fetchData(userId) }, [userId])

// ❌ Missing dependency
useEffect(() => { fetchData(userId) }, [])
```

## Data Fetching Hook
```typescript
function useOrders(userId: string) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetch(`/api/orders/${userId}`).then(r => r.json()),
    staleTime: 30_000,
  })
}
```

## Form Hook
```typescript
function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  const handleChange = (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const validate = (schema: ZodSchema<T>): boolean => {
    const result = schema.safeParse(values)
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as any)
      return false
    }
    return true
  }

  return { values, errors, handleChange, validate, setValues }
}
```
