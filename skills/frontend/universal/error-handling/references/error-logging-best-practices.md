# Error Logging Best Practices

## Structured Logging Format

```typescript
interface ErrorLogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  error: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  context: {
    userId?: string
    sessionId?: string
    url?: string
    component?: string
    action?: string
  }
  metadata: Record<string, unknown>
  environment: string
  version: string
}

function createErrorLog(
  error: Error,
  context?: Partial<ErrorLogEntry['context']>,
  metadata?: Record<string, unknown>
): ErrorLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    },
    context: {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...context,
    },
    metadata: metadata ?? {},
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.APP_VERSION ?? 'unknown',
  }
}
```

## Logging Levels and When to Use Them

```typescript
const logLevels = {
  debug: 0, // Development-only details
  info: 1,  // State transitions, significant events
  warn: 2,  // Recoverable issues, deprecation notices
  error: 3, // Handled errors, failed operations
  fatal: 4, // Unrecoverable, app crash imminent
} as const

type LogLevel = keyof typeof logLevels

function shouldLog(currentLevel: LogLevel, threshold: LogLevel): boolean {
  return logLevels[currentLevel] >= logLevels[threshold]
}
```

## Error Enrichment

```typescript
function enrichError(error: Error, enrichment: Record<string, unknown>): Error {
  const enriched = Object.assign(Object.create(Object.getPrototypeOf(error)), {
    ...error,
    enrichment,
  })
  return enriched
}

class AppError extends Error {
  public readonly code: string
  public readonly httpStatus: number
  public readonly isOperational: boolean
  public readonly context: Record<string, unknown>

  constructor(
    message: string,
    options: {
      code: string
      httpStatus?: number
      isOperational?: boolean
      context?: Record<string, unknown>
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.code = options.code
    this.httpStatus = options.httpStatus ?? 500
    this.isOperational = options.isOperational ?? true
    this.context = options.context ?? {}
    Error.captureStackTrace(this, AppError)
  }
}
```

## Batch Logging and Throttling

```typescript
class LogBatcher {
  private buffer: ErrorLogEntry[] = []
  private flushInterval: number
  private maxBatchSize: number
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(flushInterval = 5000, maxBatchSize = 50) {
    this.flushInterval = flushInterval
    this.maxBatchSize = maxBatchSize
    this.start()
  }

  add(entry: ErrorLogEntry): void {
    this.buffer.push(entry)
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush()
    }
  }

  private start(): void {
    this.timer = setInterval(() => this.flush(), this.flushInterval)
  }

  private flush(): void {
    if (this.buffer.length === 0) return
    const batch = this.buffer.splice(0, this.maxBatchSize)
    this.sendBatch(batch)
  }

  private async sendBatch(batch: ErrorLogEntry[]): Promise<void> {
    try {
      const payload = JSON.stringify({ entries: batch })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/logs', payload)
      } else {
        await fetch('/api/logs', {
          method: 'POST',
          body: payload,
          keepalive: true,
        })
      }
    } catch (e) {
      console.error('Failed to send log batch:', e)
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.buffer.length > 0) {
      this.flush()
    }
  }
}
```

## Deduplication Strategy

```typescript
class ErrorDeduplicator {
  private seen: Map<string, { count: number; lastSeen: number }> = new Map()
  private windowMs: number
  private maxOccurrences: number

  constructor(windowMs = 60000, maxOccurrences = 5) {
    this.windowMs = windowMs
    this.maxOccurrences = maxOccurrences
  }

  shouldReport(error: Error, context?: Record<string, unknown>): boolean {
    const key = this.createKey(error, context)
    const now = Date.now()
    const record = this.seen.get(key)

    this.cleanup()

    if (!record) {
      this.seen.set(key, { count: 1, lastSeen: now })
      return true
    }

    if (now - record.lastSeen > this.windowMs) {
      this.seen.set(key, { count: 1, lastSeen: now })
      return true
    }

    record.count++
    record.lastSeen = now
    return record.count <= this.maxOccurrences
  }

  private createKey(error: Error, context?: Record<string, unknown>): string {
    const contextStr = context ? JSON.stringify(context) : ''
    return `${error.name}:${error.message}:${contextStr}`
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.seen.entries()) {
      if (now - record.lastSeen > this.windowMs * 2) {
        this.seen.delete(key)
      }
    }
  }
}
```

## PII Redaction

```typescript
const PII_PATTERNS = [
  /\b[\w.-]+@[\w.-]+\.\w+\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b\d{16}\d?\b/g,
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/g,
  /\btoken[=:]\s*\S+/gi,
  /\bapi[_-]?key[=:]\s*\S+/gi,
  /\bpassword[=:]\s*\S+/gi,
  /\bsecret[=:]\s*\S+/gi,
  /\bauthorization[=:]\s*\S+/gi,
]

function redactPII(data: string): string {
  return PII_PATTERNS.reduce((acc, pattern) => {
    return acc.replace(pattern, '[REDACTED]')
  }, data)
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'apiKey', 'api_key',
    'authorization', 'cookie', 'ssn', 'creditCard',
  ]

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'string') {
      result[key] = redactPII(value)
    } else if (value !== null && typeof value === 'object') {
      result[key] = redactObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}
```

## Sampling for High-Volume Errors

```typescript
class ErrorSampler {
  private sampleRate: number
  private recentErrors: Map<string, number> = new Map()

  constructor(sampleRate = 0.1) {
    this.sampleRate = sampleRate
  }

  shouldSample(error: Error): boolean {
    const key = `${error.name}:${error.message}`
    const count = (this.recentErrors.get(key) ?? 0) + 1
    this.recentErrors.set(key, count)

    if (count <= 3) return true
    return Math.random() < this.sampleRate
  }

  reset(): void {
    this.recentErrors.clear()
  }
}
```

## Error Log Viewer Component

```typescript
interface LogViewerProps {
  logs: ErrorLogEntry[]
  filter?: LogLevel
  onClear?: () => void
}

function ErrorLogViewer({ logs, filter = 'error', onClear }: LogViewerProps) {
  const filtered = logs.filter(log => shouldLog(log.level, filter))
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="log-viewer font-mono text-sm">
      <div className="flex justify-between items-center p-2 bg-gray-800 text-white">
        <span>Error Log ({filtered.length})</span>
        {onClear && (
          <button onClick={onClear} className="text-red-400 hover:text-red-300">
            Clear
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {filtered.map((log) => (
          <div
            key={log.timestamp}
            className={`p-2 border-b border-gray-200 cursor-pointer
              ${log.level === 'fatal' ? 'bg-red-50' : ''}
              ${log.level === 'error' ? 'bg-orange-50' : ''}`}
            onClick={() => setExpanded(
              expanded === log.timestamp ? null : log.timestamp
            )}
          >
            <div className="flex gap-2">
              <span className="text-gray-400 w-20 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`w-12 uppercase text-xs font-bold
                ${log.level === 'fatal' ? 'text-red-600' : ''}
                ${log.level === 'error' ? 'text-orange-600' : ''}`}>
                {log.level}
              </span>
              <span className="truncate">{log.message}</span>
            </div>
            {expanded === log.timestamp && (
              <pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(log, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Logging Middleware (Express)

```typescript
import { Request, Response, NextFunction } from 'express'

function errorLoggingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: res.statusCode >= 500 ? 'error' : 'warn',
    message: error.message,
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    context: {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    metadata: {
      statusCode: res.statusCode,
      responseTime: res.get('X-Response-Time'),
    },
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.APP_VERSION ?? 'unknown',
  }

  console.error(JSON.stringify(logEntry))
  next(error)
}
```

## Client-Side Logging Hook

```typescript
function useErrorLogger() {
  const batcher = useRef(new LogBatcher()).current

  useEffect(() => {
    return () => batcher.stop()
  }, [])

  const logError = useCallback((
    error: Error,
    context?: Partial<ErrorLogEntry['context']>,
    metadata?: Record<string, unknown>
  ) => {
    const entry = createErrorLog(error, context, metadata)
    batcher.add(entry)
  }, [])

  const logEvent = useCallback((
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ) => {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      error: { name: 'LogEvent', message },
      context: { url: window.location.href },
      metadata: data ?? {},
      environment: process.env.NODE_ENV ?? 'development',
      version: process.env.APP_VERSION ?? 'unknown',
    }
    batcher.add(entry)
  }, [])

  return { logError, logEvent }
}
```

## Log Retention Policy

```typescript
interface RetentionPolicy {
  environment: string
  storage: 'local' | 'session' | 'remote'
  maxEntries: number
  maxAgeMs: number
  onEvict?: (entry: ErrorLogEntry) => void
}

const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    environment: 'development',
    storage: 'local',
    maxEntries: 1000,
    maxAgeMs: 24 * 60 * 60 * 1000,
  },
  {
    environment: 'staging',
    storage: 'remote',
    maxEntries: 500,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    environment: 'production',
    storage: 'remote',
    maxEntries: 200,
    maxAgeMs: 30 * 24 * 60 * 60 * 1000,
  },
]

function getRetentionPolicy(env: string): RetentionPolicy {
  return RETENTION_POLICIES.find(p => p.environment === env)
    ?? RETENTION_POLICIES[0]
}

class LogStore {
  private entries: ErrorLogEntry[] = []
  private policy: RetentionPolicy

  constructor(env: string) {
    this.policy = getRetentionPolicy(env)
    this.loadFromStorage()
  }

  add(entry: ErrorLogEntry): void {
    this.entries.push(entry)
    this.enforceRetention()
    this.saveToStorage()
  }

  private enforceRetention(): void {
    const now = Date.now()
    this.entries = this.entries.filter(e => {
      const age = now - new Date(e.timestamp).getTime()
      return age < this.policy.maxAgeMs
    })

    while (this.entries.length > this.policy.maxEntries) {
      const evicted = this.entries.shift()
      if (evicted && this.policy.onEvict) {
        this.policy.onEvict(evicted)
      }
    }
  }

  private saveToStorage(): void {
    if (this.policy.storage === 'local') {
      localStorage.setItem('error_logs', JSON.stringify(this.entries))
    }
  }

  private loadFromStorage(): void {
    if (this.policy.storage === 'local') {
      try {
        const stored = localStorage.getItem('error_logs')
        if (stored) this.entries = JSON.parse(stored)
      } catch {
        this.entries = []
      }
    }
  }

  getAll(): ErrorLogEntry[] {
    return [...this.entries]
  }
}
```

## Integration with APM Tools

```typescript
interface ApmIntegration {
  name: string
  init: (config: Record<string, unknown>) => void
  captureError: (error: Error, context?: Record<string, unknown>) => void
  captureMessage: (message: string, level?: LogLevel) => void
  setUser: (user: { id: string; email?: string }) => void
}

const sentryIntegration: ApmIntegration = {
  name: 'Sentry',
  init(config) {
    Sentry.init({
      dsn: config.dsn as string,
      environment: config.environment as string,
      release: config.version as string,
      sampleRate: config.sampleRate as number ?? 1.0,
    })
  },
  captureError(error, context) {
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context)
      Sentry.captureException(error)
    })
  },
  captureMessage(message, level) {
    Sentry.captureMessage(message, level as Sentry.SeverityLevel)
  },
  setUser(user) {
    Sentry.setUser(user)
  },
}

const datadogIntegration: ApmIntegration = {
  name: 'Datadog',
  init(config) {
    window.DD_RUM?.init({
      applicationId: config.appId as string,
      clientToken: config.clientToken as string,
      env: config.environment as string,
      version: config.version as string,
      sessionSampleRate: config.sampleRate as number ?? 100,
    })
  },
  captureError(error, context) {
    window.DD_RUM?.addError(error, context)
  },
  captureMessage(message, level) {
    window.DD_RUM?.addAction(message, { level })
  },
  setUser(user) {
    window.DD_RUM?.setUser(user)
  },
}
```

## Key Points

- Always use structured logging with consistent schema across services
- Implement PII redaction at the client level before sending to log aggregators
- Batch log entries to reduce network overhead and prevent flooding
- Deduplicate repeated errors within configurable time windows
- Apply sampling for high-volume errors to balance signal and cost
- Enforce retention policies per environment to manage storage costs
- Enrich errors with contextual data (user, session, URL, component)
- Integrate with APM tools for centralized error aggregation and alerting
- Never log sensitive information such as passwords, tokens, or PII
- Use appropriate log levels to distinguish severity and actionability
