# Structured Logging Patterns

## Log Format

### Standardized Log Entry
```typescript
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
  service: string;
  environment: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  duration?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
```

### Logger Implementation
```typescript
class StructuredLogger {
  private baseFields: Partial<LogEntry>;

  constructor(
    private transport: LogTransport,
    serviceName: string,
    environment: string
  ) {
    this.baseFields = {
      service: serviceName,
      environment,
      logger: 'structured-logger',
    };
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('ERROR', message, {
      ...metadata,
      error: error ? {
        type: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
    });
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      ...this.baseFields,
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: this.getCurrentTraceId(),
      spanId: this.getCurrentSpanId(),
      ...metadata,
    };

    this.transport.write(entry);
  }

  private getCurrentTraceId(): string | undefined {
    // Get from async context
    return asyncLocalStorage.getStore()?.traceId;
  }

  private getCurrentSpanId(): string | undefined {
    return asyncLocalStorage.getStore()?.spanId;
  }
}
```

## Log Transport

### Multiple Transports
```typescript
interface LogTransport {
  write(entry: LogEntry): void;
}

class ConsoleTransport implements LogTransport {
  write(entry: LogEntry): void {
    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      console.log(this.formatForConsole(entry));
    }
  }

  private formatForConsole(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.service}]`;
    const suffix = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    return `${prefix} ${entry.message}${suffix}`;
  }
}

class FileTransport implements LogTransport {
  private stream: fs.WriteStream;

  constructor(filePath: string) {
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
  }

  write(entry: LogEntry): void {
    this.stream.write(JSON.stringify(entry) + '\n');
  }
}

class ElasticsearchTransport implements LogTransport {
  constructor(private client: Client, private index: string) {}

  async write(entry: LogEntry): Promise<void> {
    try {
      await this.client.index({
        index: `${this.index}-${new Date().toISOString().slice(0, 7)}`,
        body: entry,
      });
    } catch (error) {
      console.error('Failed to write log to Elasticsearch:', error);
    }
  }
}
```

## Context Propagation

### Async Context
```typescript
import { AsyncLocalStorage } from 'async_hooks';

const logContext = new AsyncLocalStorage<LogContext>();

function withLogContext<T>(context: LogContext, fn: () => T): T {
  return logContext.run(context, fn);
}

function getLogContext(): LogContext | undefined {
  return logContext.getStore();
}

// Express middleware
function logContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const context: LogContext = {
    traceId: req.headers['x-trace-id'] as string || generateId(),
    requestId: generateId(),
    userId: req.user?.id,
  };

  withLogContext(context, () => {
    res.setHeader('X-Trace-Id', context.traceId);
    res.setHeader('X-Request-Id', context.requestId);
    next();
  });
}
```

## Sampling

### Dynamic Sampling
```typescript
class LogSampler {
  private sampleRates: Map<LogLevel, number> = new Map([
    ['TRACE', 0.01],   // 1% of trace logs
    ['DEBUG', 0.1],    // 10% of debug logs
    ['INFO', 1.0],     // 100% of info logs
    ['WARN', 1.0],     // 100% of warnings
    ['ERROR', 1.0],    // 100% of errors
    ['FATAL', 1.0],    // 100% of fatal
  ]);

  shouldSample(level: LogLevel, metadata?: Record<string, any>): boolean {
    const rate = this.sampleRates.get(level) || 1.0;

    // Always sample errors regardless of rate
    if (level === 'ERROR' || level === 'FATAL') return true;

    // Sample based on rate
    if (rate >= 1.0) return true;

    return Math.random() < rate;
  }
}
```

## Key Points
- Use structured JSON logging for machine-parseable output
- Include traceId, spanId, userId for request correlation
- Implement multiple log transports (console, file, Elasticsearch)
- Use async local storage for context propagation
- Log at appropriate levels: TRACE for debug, INFO for normal, ERROR for failures
- Never log sensitive data (passwords, tokens, PII)
- Use sampling for high-volume debug logs in production
- Set log retention policies based on level and storage
- Implement centralized log aggregation for distributed systems
- Monitor log volume and adjust sampling rates as needed
