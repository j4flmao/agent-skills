# Message Queue Monitoring

## Overview
Monitor message queue health: consumer lag, throughput, error rates, queue depth, DLQ monitoring, and alerting.

## Consumer Lag Monitoring

```typescript
class ConsumerLagMonitor {
  async checkLag(consumerGroup: string, topic: string, partitions: number): Promise<LagReport> {
    let totalLag = 0;
    const partitionLags: PartitionLag[] = [];

    for (let i = 0; i < partitions; i++) {
      const [endOffset, committedOffset] = await Promise.all([
        this.kafkaAdmin.fetchEndOffset(topic, i),
        this.kafkaAdmin.fetchCommittedOffset(consumerGroup, topic, i),
      ]);

      const lag = endOffset - committedOffset;
      totalLag += lag;

      partitionLags.push({
        partition: i,
        endOffset,
        committedOffset,
        lag,
      });
    }

    const status = this.determineStatus(totalLag, partitionLags);

    if (status === 'critical') {
      await AlertService.alert({
        severity: 'CRITICAL',
        title: `Consumer lag critical: ${consumerGroup}`,
        message: `Total lag: ${totalLag} messages across ${partitions} partitions`,
        tags: { consumerGroup, topic },
      });
    }

    return {
      consumerGroup,
      topic,
      totalLag,
      partitions: partitionLags,
      status,
      checkedAt: new Date(),
    };
  }

  private determineStatus(totalLag: number, partitions: PartitionLag[]): 'ok' | 'warning' | 'critical' {
    if (totalLag > 10000) return 'critical';
    if (totalLag > 1000) return 'warning';
    if (partitions.some(p => p.lag > 5000)) return 'warning';
    return 'ok';
  }
}
```

## Queue Depth Monitoring

```typescript
class QueueDepthMonitor {
  private readonly WARN_DEPTH = 1000;
  private readonly CRITICAL_DEPTH = 10000;

  async checkQueueDepth(queueName: string): Promise<QueueDepthReport> {
    // SQS
    if (this.isSQS) {
      const attributes = await sqs.getQueueAttributes({
        QueueUrl: queueUrl,
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesDelayed',
          'ApproximateNumberOfMessagesNotVisible',
        ],
      }).promise();

      const depth = parseInt(attributes.Attributes!.ApproximateNumberOfMessages) +
                    parseInt(attributes.Attributes!.ApproximateNumberOfMessagesNotVisible);

      return {
        queueName,
        depth,
        delayed: parseInt(attributes.Attributes!.ApproximateNumberOfMessagesDelayed),
        inFlight: parseInt(attributes.Attributes!.ApproximateNumberOfMessagesNotVisible),
        status: this.determineStatus(depth),
      };
    }

    // RabbitMQ
    if (this.isRabbitMQ) {
      const queue = await rabbitMQClient.getQueue(queueName);
      return {
        queueName,
        depth: queue.messages,
        ready: queue.messages_ready,
        unacknowledged: queue.messages_unacknowledged,
        status: this.determineStatus(queue.messages),
      };
    }

    throw new Error('Unsupported broker');
  }

  private determineStatus(depth: number): 'ok' | 'warning' | 'critical' {
    if (depth > this.CRITICAL_DEPTH) return 'critical';
    if (depth > this.WARN_DEPTH) return 'warning';
    return 'ok';
  }
}
```

## Throughput Metrics

```typescript
class ThroughputMonitor {
  async collectThroughput(topic: string, windowMs = 60000): Promise<ThroughputReport> {
    const end = Date.now();
    const start = end - windowMs;

    const messages = await this.getMessageTimestamps(topic, start, end);
    const byteSizes = messages.map(m => m.size);
    const totalBytes = byteSizes.reduce((a, b) => a + b, 0);

    return {
      topic,
      windowMs,
      messageCount: messages.length,
      messagesPerSecond: messages.length / (windowMs / 1000),
      bytesPerSecond: totalBytes / (windowMs / 1000),
      avgMessageSize: messages.length > 0 ? totalBytes / messages.length : 0,
      maxMessageSize: byteSizes.length > 0 ? Math.max(...byteSizes) : 0,
    };
  }

  async detectAnomalies(topic: string): Promise<AnomalyReport> {
    const baseline = await this.getBaseline(topic, 7 * 24 * 60 * 60 * 1000); // 7 days
    const current = await this.collectThroughput(topic);

    const anomalies: Anomaly[] = [];

    // Significant drop (potential producer failure)
    if (current.messagesPerSecond < baseline.mean - 3 * baseline.stddev) {
      anomalies.push({
        type: 'THROUGHPUT_DROP',
        severity: 'critical',
        current: current.messagesPerSecond,
        expected: baseline.mean,
      });
    }

    // Significant spike (potential DDOS or misconfiguration)
    if (current.messagesPerSecond > baseline.mean + 5 * baseline.stddev) {
      anomalies.push({
        type: 'THROUGHPUT_SPIKE',
        severity: 'warning',
        current: current.messagesPerSecond,
        expected: baseline.mean,
      });
    }

    return { topic, current, baseline, anomalies, hasAnomaly: anomalies.length > 0 };
  }
}
```

## DLQ Health Check

```typescript
class DLQHealthChecker {
  private readonly ALERT_THRESHOLD = 10;
  private readonly STALE_THRESHOLD_MS = 3600000; // 1 hour

  async checkDLQ(dlqName: string): Promise<DLQStatus> {
    const messageCount = await this.getMessageCount(dlqName);
    const oldestMessage = await this.getOldestMessageTimestamp(dlqName);
    const ageHours = oldestMessage ? (Date.now() - oldestMessage) / 3600000 : 0;

    const status: DLQStatus = {
      dlqName,
      messageCount,
      oldestMessageAgeHours: Math.round(ageHours * 10) / 10,
      isHealthy: messageCount < this.ALERT_THRESHOLD,
    };

    if (!status.isHealthy) {
      await AlertService.alert({
        severity: messageCount > 50 ? 'CRITICAL' : 'WARNING',
        title: `DLQ growing: ${dlqName}`,
        message: `${messageCount} messages, oldest ${status.oldestMessageAgeHours}h`,
      });
    }

    return status;
  }

  async autoReprocess(dlqName: string, originalQueue: string): Promise<ReprocessResult> {
    const messages = await this.getMessages(dlqName);
    let succeeded = 0;
    let failed = 0;

    for (const message of messages) {
      try {
        await this.republish(originalQueue, message);
        await this.deleteFromDLQ(dlqName, message.id);
        succeeded++;
      } catch {
        failed++;
      }
    }

    return { dlqName, total: messages.length, succeeded, failed, timestamp: new Date() };
  }
}
```

## Dashboard Configuration

```typescript
const MESSAGE_QUEUE_DASHBOARD = {
  panels: [
    {
      title: 'Consumer Lag (Total)',
      metric: 'mq.lag.total',
      aggregation: 'max',
      groupBy: ['consumerGroup'],
    },
    {
      title: 'Queue Depth',
      metric: 'mq.queue.depth',
      aggregation: 'avg',
      groupBy: ['queue'],
    },
    {
      title: 'Messages per Second',
      metric: 'mq.throughput.msg_sec',
      aggregation: 'rate',
      groupBy: ['topic'],
    },
    {
      title: 'Error Rate',
      metric: 'mq.error.count',
      aggregation: 'rate',
      groupBy: ['consumerGroup', 'errorType'],
    },
    {
      title: 'DLQ Message Count',
      metric: 'mq.dlq.count',
      aggregation: 'max',
      groupBy: ['dlq'],
    },
    {
      title: 'Avg Message Size',
      metric: 'mq.message.size',
      aggregation: 'avg',
      groupBy: ['topic'],
    },
  ],
  alerts: [
    { name: 'Critical consumer lag', condition: 'lag > 10000', severity: 'critical' },
    { name: 'Growing DLQ', condition: 'dlq_count > 10', severity: 'warning' },
    { name: 'Throughput drop', condition: 'msg_sec < baseline * 0.1', severity: 'critical' },
  ],
};
```

## Key Points
- Monitor consumer lag per partition, alert at 1000 (warning) and 10000 (critical)
- Track queue depth (ready + in-flight messages) with SQS/RabbitMQ APIs
- Measure throughput: messages/sec and bytes/sec per topic
- Anomaly detection: alert on throughput drop (producer failure) or spike (DDOS)
- Monitor DLQ: alert at 10+ messages, auto-reprocess if possible
- Track oldest DLQ message age to detect stale failures
- Calculate 7-day baseline for anomaly detection
- Build dashboard: lag, depth, throughput, error rate, DLQ count
