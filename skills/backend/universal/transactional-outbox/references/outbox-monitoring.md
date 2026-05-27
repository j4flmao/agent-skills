# Outbox Monitoring and Recovery

## Monitoring

### Outbox Metrics
```typescript
class OutboxMonitor {
  async getMetrics(): Promise<OutboxMetrics> {
    const result = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'processed') AS processed_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
        MIN(created_at) FILTER (WHERE status = 'pending') AS oldest_pending,
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) FILTER (WHERE status = 'processed') AS avg_processing_time_ms
      FROM outbox_messages
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const row = result.rows[0];

    return {
      pendingCount: parseInt(row.pending_count),
      processedCount: parseInt(row.processed_count),
      failedCount: parseInt(row.failed_count),
      oldestPendingAge: row.oldest_pending
        ? Date.now() - new Date(row.oldest_pending).getTime()
        : 0,
      avgProcessingTimeMs: parseFloat(row.avg_processing_time_ms) || 0,
    };
  }

  async alertOnBacklog(threshold: number): Promise<void> {
    const metrics = await this.getMetrics();

    if (metrics.oldestPendingAge > threshold) {
      await this.alertService.sendAlert({
        severity: 'warning',
        title: 'Outbox backlog detected',
        description: `Oldest pending message is ${metrics.oldestPendingAge}ms old`,
        metadata: metrics,
      });
    }
  }
}
```

## Recovery

### Dead Letter Processing
```typescript
class OutboxRecovery {
  async retryFailedMessages(): Promise<void> {
    const failedMessages = await this.db.query(
      `SELECT * FROM outbox_messages
       WHERE status = 'failed'
       AND retry_count <= $1
       AND created_at > NOW() - INTERVAL '7 days'`,
      [MAX_RETRIES]
    );

    for (const message of failedMessages.rows) {
      await this.retrySingleMessage(message);
    }
  }

  async handleDeadLetter(message: OutboxMessage): Promise<void> {
    await this.db.query(
      `UPDATE outbox_messages SET status = 'dead_letter' WHERE id = $1`,
      [message.id]
    );

    await this.alertService.sendAlert({
      severity: 'critical',
      title: 'Message moved to dead letter queue',
      description: `Message ${message.id} (${message.event_type}) exceeded max retries`,
      metadata: message,
    });
  }
}
```

## Key Points
- Monitor outbox queue depth and oldest pending message age
- Alert on growing backlog that could indicate publisher issues
- Implement dead letter processing for permanently failed messages
- Provide manual retry mechanism for failed messages
- Track processing latency and retry counts per message
- Implement circuit breaker to stop publishing if downstream is unavailable
- Log every publish attempt with result and latency
- Support outbox message replay for recovery scenarios
- Purge processed messages after retention period
- Test outbox recovery procedures in disaster recovery drills
