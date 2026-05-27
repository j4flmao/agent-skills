# Event-Driven Monitoring

## Overview
Monitor event-driven systems: event flow tracking, consumer lag, throughput metrics, dead letter queue monitoring, distributed tracing, and dashboards.

## Event Flow Tracking

```typescript
interface EventFlowMetric {
  eventName: string;
  version: number;
  producedCount: number;
  consumedCount: number;
  failedCount: number;
  p50LatencyMs: number;
  p99LatencyMs: number;
  periodStart: Date;
  periodEnd: Date;
}

class EventFlowMonitor {
  async trackEventFlow(event: IntegrationEvent): Promise<void> {
    const now = Date.now();
    const processingTime = now - new Date(event.metadata.occurredAt).getTime();

    await metrics.record('event.flow', 1, {
      eventType: event.eventType,
      producer: event.metadata.producer,
      version: event.metadata.eventVersion,
    });

    await metrics.timing('event.latency', processingTime, {
      eventType: event.eventType,
    });

    if (processingTime > 5000) {
      await AlertService.send({
        severity: 'WARNING',
        title: `Slow event processing: ${event.eventType}`,
        message: `Processing time: ${processingTime}ms`,
        metadata: event.metadata,
      });
    }
  }
}
```

## Consumer Lag Dashboard

```typescript
class ConsumerLagMonitor {
  private readonly LAG_WARN_THRESHOLD = 1000;
  private readonly LAG_CRITICAL_THRESHOLD = 10000;
  private readonly LAG_TIME_WARN_MS = 300000; // 5 minutes
  private readonly LAG_TIME_CRITICAL_MS = 600000; // 10 minutes

  async checkConsumerLag(consumerGroup: string, topic: string): Promise<LagStatus> {
    const lag = await this.getLag(consumerGroup, topic);
    const lagMs = await this.getLagInMilliseconds(consumerGroup, topic);

    if (lag > this.LAG_CRITICAL_THRESHOLD || lagMs > this.LAG_TIME_CRITICAL_MS) {
      await AlertService.alert({
        severity: 'CRITICAL',
        title: `Critical consumer lag: ${consumerGroup}`,
        message: `Lag: ${lag} messages (${(lagMs / 1000).toFixed(0)}s) on topic ${topic}`,
        tags: { consumerGroup, topic },
      });
      return { status: 'critical', lag, lagMs };
    }

    if (lag > this.LAG_WARN_THRESHOLD || lagMs > this.LAG_TIME_WARN_MS) {
      await AlertService.alert({
        severity: 'WARNING',
        title: `Elevated consumer lag: ${consumerGroup}`,
        message: `Lag: ${lag} messages (${(lagMs / 1000).toFixed(0)}s) on topic ${topic}`,
        tags: { consumerGroup, topic },
      });
      return { status: 'warning', lag, lagMs };
    }

    return { status: 'ok', lag, lagMs };
  }
}
```

## Throughput and Capacity Monitoring

```typescript
class ThroughputAnalyzer {
  async analyzeThroughput(topic: string, windowMs = 300000): Promise<ThroughputReport> {
    const end = Date.now();
    const start = end - windowMs;

    const messages = await this.getMessagesInWindow(topic, start, end);
    const totalBytes = messages.reduce((sum, m) => sum + m.size, 0);
    const durationSec = windowMs / 1000;

    return {
      topic,
      windowMs,
      messageCount: messages.length,
      throughputMsgSec: messages.length / durationSec,
      throughputBytesSec: totalBytes / durationSec,
      avgMessageSize: messages.length > 0 ? totalBytes / messages.length : 0,
      peakThroughput: this.calculatePeak(messages, 60000), // Peak per minute
    };
  }

  async detectAnomalies(topic: string): Promise<AnomalyReport> {
    const historical = await this.getHistoricalThroughput(topic, 7 * 24 * 60 * 60000); // 7 days

    const current = await this.analyzeThroughput(topic, 60000);
    const baseline = this.calculateBaseline(historical);

    const deviations: Anomaly[] = [];

    if (current.throughputMsgSec > baseline.mean + 3 * baseline.stddev) {
      deviations.push({
        type: 'SPIKE',
        severity: 'medium',
        metric: 'throughput',
        current: current.throughputMsgSec,
        expected: baseline.mean,
        deviation: ((current.throughputMsgSec - baseline.mean) / baseline.mean) * 100,
      });
    }

    if (current.throughputMsgSec < baseline.mean - 3 * baseline.stddev && current.throughputMsgSec > 0) {
      deviations.push({
        type: 'DROP',
        severity: 'high',
        metric: 'throughput',
        current: current.throughputMsgSec,
        expected: baseline.mean,
        deviation: ((current.throughputMsgSec - baseline.mean) / baseline.mean) * 100,
      });
    }

    return { topic, current, baseline, anomalies: deviations };
  }
}
```

## DLQ Monitoring

```typescript
class DLQMonitor {
  private readonly ALERT_THRESHOLD = 10;
  private readonly REPROCESS_SCHEDULE = '0 */6 * * *'; // Every 6 hours

  async checkDLQ(dlqName: string): Promise<DLQStatus> {
    const count = await this.getMessageCount(dlqName);
    const oldest = await this.getOldestMessage(dlqName);

    if (count > this.ALERT_THRESHOLD) {
      await AlertService.alert({
        severity: count > 50 ? 'CRITICAL' : 'WARNING',
        title: `DLQ growing: ${dlqName}`,
        message: `${count} messages in DLQ, oldest: ${oldest?.ageMinutes?.toFixed(0)} minutes`,
        tags: { dlq: dlqName, messageCount: count },
      });
    }

    return {
      dlqName,
      messageCount: count,
      oldestMessageAge: oldest?.ageMinutes ?? 0,
      status: count > this.ALERT_THRESHOLD ? 'alerting' : 'ok',
    };
  }

  async reprocessMessages(dlqName: string): Promise<ReprocessResult> {
    const messages = await this.getMessages(dlqName);
    let succeeded = 0;
    let failed = 0;

    for (const message of messages) {
      try {
        await this.republishToOriginalQueue(message);
        await this.deleteFromDLQ(message.id);
        succeeded++;
      } catch (error) {
        failed++;
        await this.incrementRetryCount(message.id);
      }
    }

    return { dlqName, succeeded, failed, timestamp: new Date() };
  }
}
```

## Distributed Tracing

```typescript
class EventTraceContext {
  constructor(
    public readonly traceId: string,
    public readonly parentSpanId: string | null,
    public readonly spanId: string
  ) {}

  static fromEvent(event: IntegrationEvent): EventTraceContext {
    return new EventTraceContext(
      event.metadata.traceId,
      event.metadata.spanId,
      generateSpanId()
    );
  }

  toHeaders(): Record<string, string> {
    return {
      'x-trace-id': this.traceId,
      'x-parent-span-id': this.spanId,
    };
  }
}

class EventTracer {
  async traceEventFlow(event: IntegrationEvent): Promise<void> {
    const traceContext = EventTraceContext.fromEvent(event);
    const span = tracer.startSpan(`event.${event.eventType}`, {
      childOf: traceContext.parentSpanId ? {
        traceId: traceContext.traceId,
        spanId: traceContext.parentSpanId,
      } : undefined,
    });

    span.setAttributes({
      'event.type': event.eventType,
      'event.version': event.metadata.eventVersion,
      'event.producer': event.metadata.producer,
      'event.id': event.metadata.eventId,
    });

    try {
      await processEvent(event);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

## Dashboard Metrics

```typescript
interface DashboardConfig {
  panels: DashboardPanel[];
}

interface DashboardPanel {
  title: string;
  metric: string;
  aggregation: string;
  window: string;
  groupBy: string[];
}

const EVENT_FLOW_DASHBOARD: DashboardConfig = {
  panels: [
    {
      title: 'Events Produced per Second',
      metric: 'event.produced',
      aggregation: 'rate',
      window: '1m',
      groupBy: ['eventType'],
    },
    {
      title: 'Event Processing Latency (p50/p99)',
      metric: 'event.latency',
      aggregation: 'percentile',
      window: '5m',
      groupBy: ['eventType', 'consumerGroup'],
    },
    {
      title: 'Consumer Lag',
      metric: 'consumer.lag',
      aggregation: 'max',
      window: '1m',
      groupBy: ['consumerGroup', 'topic'],
    },
    {
      title: 'DLQ Message Count',
      metric: 'dlq.messages',
      aggregation: 'count',
      window: '1h',
      groupBy: ['dlq'],
    },
    {
      title: 'Event Failure Rate',
      metric: 'event.failed',
      aggregation: 'rate',
      window: '5m',
      groupBy: ['eventType', 'errorType'],
    },
    {
      title: 'Throughput Anomalies',
      metric: 'event.throughput',
      aggregation: 'anomaly',
      window: '1h',
      groupBy: ['topic'],
    },
  ],
};
```

## Key Points
- Track event flow metrics: produced, consumed, failed, latency per event type
- Monitor consumer lag with warning (1000) and critical (10000) thresholds
- Analyze throughput anomalies against 7-day baseline
- Alert on DLQ accumulation (10+ messages), auto-reprocess every 6 hours
- Use distributed tracing with traceId propagation across event boundaries
- Build dashboards for events/sec, latency, lag, DLQ, and failure rate
