# React Rendering Patterns

## Component Composition

```typescript
interface PageLayoutProps {
  header: React.ReactNode
  sidebar: React.ReactNode
  main: React.ReactNode
  footer?: React.ReactNode
}

function PageLayout({ header, sidebar, main, footer }: PageLayoutProps) {
  return (
    <div className="page-layout">
      <header className="page-header">{header}</header>
      <div className="page-body">
        <aside className="page-sidebar">{sidebar}</aside>
        <main className="page-main">{main}</main>
      </div>
      {footer && <footer className="page-footer">{footer}</footer>}
    </div>
  )
}

function DashboardPage() {
  return (
    <PageLayout
      header={<DashboardHeader />}
      sidebar={<NavigationSidebar />}
      main={<DashboardContent />}
      footer={<DashboardFooter />}
    />
  )
}
```

## Render Props Pattern

```typescript
interface DataFetcherProps<T> {
  url: string
  children: (data: {
    data: T | null
    loading: boolean
    error: Error | null
    refetch: () => void
  }) => React.ReactNode
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Fetch failed')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { fetchData() }, [fetchData])

  return <>{children({ data, loading, error, refetch: fetchData })}</>
}

function UsersPage() {
  return (
    <DataFetcher url="/api/users">
      {({ data, loading, error }) => {
        if (loading) return <Spinner />
        if (error) return <ErrorDisplay error={error} />
        return <UserList users={data} />
      }}
    </DataFetcher>
  )
}
```

## Higher-Order Components

```typescript
interface WithAuthProps {
  user: User | null
}

function withAuth<P extends object>(
  Component: React.ComponentType<P & WithAuthProps>,
): React.FC<P> {
  return function WrappedComponent(props: P) {
    const { user, loading } = useAuth()

    if (loading) return <Spinner />
    if (!user) return <Navigate to="/login" />

    return <Component {...props} user={user} />
  }
}

interface DashboardProps {
  user: User
  data: DashboardData
}

const ProtectedDashboard = withAuth(DashboardComponent)
```

## Custom Hooks Pattern

```typescript
interface UseMediaRecorderOptions {
  onDataAvailable?: (blob: Blob) => void
  onError?: (error: Error) => void
}

interface UseMediaRecorderReturn {
  start: () => void
  stop: () => Promise<Blob>
  state: 'inactive' | 'recording' | 'paused'
  duration: number
}

function useMediaRecorder(options?: UseMediaRecorderOptions): UseMediaRecorderReturn {
  const [state, setState] = useState<'inactive' | 'recording' | 'paused'>('inactive')
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data)
        options?.onDataAvailable?.(event.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setState('recording')
    } catch (err) {
      options?.onError?.(err as Error)
    }
  }, [options])

  const stop = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob())
        return
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        setState('inactive')
        resolve(blob)
      }

      mediaRecorderRef.current.stop()
    })
  }, [])

  return { start, stop, state, duration }
}
```

## Key Points

- Use composition with ReactNode props for flexible layouts
- Implement render props for reusable data fetching
- Use HOCs for cross-cutting concerns like authentication
- Build custom hooks for reusable stateful logic
- Keep components focused and single-responsibility
- Lift state up only when necessary for sharing
- Use useMemo and useCallback for performance optimization
- Implement proper cleanup in useEffect
- Use React.memo for expensive render optimization
- Prefer composition over inheritance patterns
- Use TypeScript generics for type-safe patterns
- Test hooks with renderHook from testing library
