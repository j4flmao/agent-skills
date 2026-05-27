# CQRS Monitoring

## Overview
Monitor CQRS systems: sync lag between read and write models, projection health, query performance, and consistency drift.

## Sync Lag Monitoring

```typescript
class CqrsLagMonitor {
  async getProjectionLag(): Promise<ProjectionLagReport> {
    const [writePosition, readPositions] = await Promise.all([
      this.getWritePosition(),
      this.getAllReadPositions(),
    ]);

    return {
      writePosition,
      readModels: readPositions.map(rp => ({
        name: rp.name,
        readPosition: rp.position,
        lagMs: new Date().getTime() - new Date(rp.lastUpdated).getTime(),
        lagEvents: writePosition - rp.position,
        status: this.classifyLag(rp),
      })),
    };
  }

  private classifyLag(position: ReadPosition): 'healthy' | 'delayed' | 'stale' {
    const lagMs = new Date().getTime() - new Date(position.lastUpdated).getTime();
    if (lagMs < 5000) return 'healthy';
    if (lagMs < 60000) return 'delayed';
    return 'stale';
  }

  async alertOnExcessiveLag(): Promise<void> {
    const report = await this.getProjectionLag();
    for (const model of report.readModels) {
      if (model.status === 'stale') {
        await alertService.send({
          type: 'CQRS_PROJECTION_LAG',
          severity: 'critical',
          projection: model.name,
          lagMs: model.lagMs,
          lagEvents: model.lagEvents,
          lastUpdated: new Date(Date.now() - model.lagMs).toISOString(),
        });
      }
    }
  }
}
```

## Projection Health

```typescript
class ProjectionHealthMonitor {
  async getProjectionHealth(): Promise<ProjectionHealth[]> {
    const projections = await ProjectionMetadata.find();

    const results: ProjectionHealth[] = [];
    for (const projection of projections) {
      const eventsProcessed = await this.getEventsProcessed(projection.name);
      const failedEvents = await this.getFailedEvents(projection.name);

      results.push({
        name: projection.name,
        status: projection.active ? 'active' : 'paused',
        eventsProcessed: eventsProcessed.count,
        lastEventProcessedAt: eventsProcessed.lastAt,
        failedEvents: failedEvents.count,
        lastFailedAt: failedEvents.lastAt,
        errorRate: eventsProcessed.count > 0
          ? (failedEvents.count / eventsProcessed.count) * 100
          : 0,
        rebuildRequired: projection.schemaVersion < projection.latestSchemaVersion,
        lastRebuildAt: projection.lastRebuildAt,
      });
    }
    return results;
  }

  async triggerProjectionRebuild(name: string): Promise<void> {
    this.logger.info(`Triggering rebuild of projection: ${name}`);

    const projection = this.getProjectionHandler(name);
    await projection.rebuild();

    await ProjectionMetadata.updateOne(
      { name },
      {
        lastRebuildAt: new Date(),
        schemaVersion: projection.currentSchemaVersion,
      }
    );

    this.logger.info(`Projection rebuild complete: ${name}`);
  }
}
```

## Query Performance Monitoring

```typescript
class CqrsQueryMonitor {
  private readonly slowQueryThreshold = 100; // ms

  async recordQueryExecution(
    queryName: string,
    durationMs: number,
    resultCount: number
  ): Promise<void> {
    await QueryMetrics.create({
      queryName,
      durationMs,
      resultCount,
      timestamp: new Date(),
    });

    if (durationMs > this.slowQueryThreshold) {
      await alertService.send({
        type: 'SLOW_QUERY',
        severity: 'warning',
        queryName,
        durationMs,
        threshold: this.slowQueryThreshold,
      });
    }
  }

  async getQueryPerformanceReport(hours: number): Promise<QueryPerformanceReport> {
    const since = new Date(Date.now() - hours * 3600000);

    const metrics = await QueryMetrics.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$queryName',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          p95Duration: { $percentile: { input: '$durationMs', p: [0.95] } },
          maxDuration: { $max: '$durationMs' },
          avgResultCount: { $avg: '$resultCount' },
        },
      },
      { $sort: { avgDuration: -1 } },
    ]);

    return {
      period: `${hours}h`,
      queries: metrics.map(m => ({
        name: m._id,
        executionCount: m.count,
        avgDurationMs: Math.round(m.avgDuration),
        p95DurationMs: Math.round(m.p95Duration[0]),
        maxDurationMs: m.maxDuration,
        avgResultCount: Math.round(m.avgResultCount),
      })),
      slowQueries: metrics.filter(m => m.avgDuration > this.slowQueryThreshold).length,
    };
  }
}
```

## Dashboard Metrics

```typescript
// CQRS dashboard data
class CqrsDashboard {
  async getDashboardData(): Promise<CqrsDashboardData> {
    const [lag, health, queries] = await Promise.all([
      this.lagMonitor.getProjectionLag(),
      this.healthMonitor.getProjectionHealth(),
      this.queryMonitor.getQueryPerformanceReport(1),
    ]);

    const totalProjections = health.length;
    const healthyProjections = health.filter(h => h.status === 'active' && h.errorRate < 5).length;
    const stalledProjections = health.filter(h => h.status === 'paused' || h.rebuildRequired).length;

    return {
      summary: {
        totalProjections,
        healthyProjections,
        stalledProjections,
        healthRate: totalProjections > 0 ? (healthyProjections / totalProjections) * 100 : 0,
        maxLagMs: Math.max(...lag.readModels.map(m => m.lagMs), 0),
        slowQueryCount: queries.slowQueries,
      },
      projections: health,
      lag: lag,
      queries: queries.queries.slice(0, 10),
      alerts: await this.getActiveAlerts(),
    };
  }
}
```

## Recovery Procedures

```typescript
class CqrsRecovery {
  async handleProjectionFailure(projectionName: string, error: Error): Promise<void> {
    this.logger.error(`Projection ${projectionName} failed`, { error: error.message });

    // 1. Pause the projection
    await this.pauseProjection(projectionName);

    // 2. Check if it's recoverable
    if (this.isRecoverable(error)) {
      // 3. Retry the failed event
      await this.retryFailedEvent(projectionName);
    } else {
      // 4. Schedule a full rebuild
      await this.scheduleRebuild(projectionName);
    }

    // 5. Notify operations team
    await alertService.send({
      type: 'PROJECTION_FAILURE',
      severity: 'critical',
      projection: projectionName,
      error: error.message,
      action: this.isRecoverable(error) ? 'single-event-retry' : 'full-rebuild-scheduled',
    });
  }

  private isRecoverable(error: Error): boolean {
    // Transient errors can be recovered by retry
    const transientErrors = [
      'Connection timeout',
      'Deadlock detected',
      'Serialization failure',
    ];
    return transientErrors.some(msg => error.message.includes(msg));
  }
}
```

## Key Points
- Monitor sync lag in milliseconds and events count between write and read models
- Track projection health: events processed, failure rate, schema version
- Record query execution metrics and alert on slow queries
- Build dashboards showing projection health, lag, and query performance
- Implement recovery procedures: retry transient errors, rebuild corrupted projections
