# Log Aggregation and Analysis

## Centralized Logging

### Log Aggregation Pipeline
```typescript
class LogAggregator {
  private transports: LogTransport[];
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor() {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    for (const transport of this.transports) {
      try {
        await transport.writeBatch(batch);
      } catch (error) {
        console.error('Log transport failed:', error);
      }
    }
  }
}
```

## Log Analysis Patterns

### Error Aggregation
```typescript
class ErrorAnalyzer {
  async analyzeErrors(windowMs: number): Promise<ErrorReport> {
    const errors = await this.searchLogs({
      level: 'ERROR',
      range: { gte: `now-${windowMs}ms` },
    });

    const grouped = this.groupByType(errors);
    const report: ErrorReport = {
      totalErrors: errors.length,
      uniqueTypes: Object.keys(grouped).length,
      errorRate: errors.length / (windowMs / 1000),
      topErrors: Object.entries(grouped)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 10)
        .map(([type, occurrences]) => ({
          type,
          count: occurrences.length,
          firstSeen: new Date(Math.min(...occurrences.map(e => e.timestamp))),
          lastSeen: new Date(Math.max(...occurrences.map(e => e.timestamp))),
          services: [...new Set(occurrences.map(e => e.service))],
        })),
    };

    return report;
  }

  private groupByType(errors: LogEntry[]): Record<string, LogEntry[]> {
    return errors.reduce((groups, error) => {
      const type = error.error?.type || 'Unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(error);
      return groups;
    }, {});
  }
}
```

## Key Points
- Aggregate logs from all services to a centralized platform (ELK, Loki, Datadog)
- Buffer log writes and flush in batches for performance
- Implement structured error analysis for identifying patterns
- Use log levels to filter and route logs to different storage tiers
- Set alerts for error rate spikes and specific error patterns
- Implement log retention policies (hot/warm/cold storage tiers)
- Use full-text search on logs for debugging and incident response
- Correlate logs across services using trace IDs
- Monitor log volume for anomaly detection
- Implement log redaction for sensitive data before storage
