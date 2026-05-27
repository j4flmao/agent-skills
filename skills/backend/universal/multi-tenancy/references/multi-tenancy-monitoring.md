# Multi-Tenancy Monitoring

## Overview
Monitor multi-tenant systems: per-tenant metrics, noisy neighbor detection, tenant-level alerting, resource tracking, and cost attribution.

## Per-Tenant Metrics

```typescript
class TenantMetricsCollector {
  private metrics: Map<string, TenantMetric> = new Map();

  recordRequest(tenantId: string, duration: number, status: number, endpoint: string): void {
    const key = `${tenantId}:${endpoint}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        tenantId,
        endpoint,
        requestCount: 0,
        errorCount: 0,
        totalDuration: 0,
        maxDuration: 0,
        lastRequestAt: new Date(),
      });
    }

    const metric = this.metrics.get(key)!;
    metric.requestCount++;
    metric.totalDuration += duration;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.lastRequestAt = new Date();

    if (status >= 400) {
      metric.errorCount++;
    }
  }

  getTenantReport(tenantId: string, periodMs = 3600000): TenantReport {
    const tenantMetrics = Array.from(this.metrics.values())
      .filter(m => m.tenantId === tenantId && 
        m.lastRequestAt.getTime() > Date.now() - periodMs);

    return {
      tenantId,
      period: `${periodMs / 60000} minutes`,
      totalRequests: tenantMetrics.reduce((s, m) => s + m.requestCount, 0),
      totalErrors: tenantMetrics.reduce((s, m) => s + m.errorCount, 0),
      avgLatency: tenantMetrics.reduce((s, m) => s + m.totalDuration, 0) / 
                  Math.max(1, tenantMetrics.reduce((s, m) => s + m.requestCount, 0)),
      endpoints: tenantMetrics,
    };
  }
}
```

## Noisy Neighbor Detection

```typescript
class NoisyNeighborDetector {
  private tenantResourceUsage: Map<string, ResourceUsage> = new Map();

  async detectNoisyTenants(): Promise<NoisyNeighborReport> {
    const tenants = await this.getAllTenants();
    const totalCPU = await this.getTotalCPULoad();
    const totalMemory = await this.getTotalMemoryUsage();
    const totalIOPS = await this.getTotalIOPS();
    const tenantCount = tenants.length;

    const noisyTenants: NoisyTenant[] = [];

    for (const tenant of tenants) {
      const usage = await this.getTenantResourceUsage(tenant.id);
      const cpuShare = usage.cpu / totalCPU;
      const memoryShare = usage.memory / totalMemory;
      const iopsShare = usage.iops / totalIOPS;
      const expectedShare = 1 / tenantCount;

      // Tenant using > 3x their fair share
      const cpuRatio = cpuShare / expectedShare;
      const memoryRatio = memoryShare / expectedShare;
      const iopsRatio = iopsShare / expectedShare;

      if (cpuRatio > 3 || memoryRatio > 3 || iopsRatio > 3) {
        noisyTenants.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          cpuRatio,
          memoryRatio,
          iopsRatio,
          cpuUsage: usage.cpu,
          memoryUsage: usage.memory,
          iopsUsage: usage.iops,
        });

        await AlertService.alert({
          severity: 'WARNING',
          title: `Noisy neighbor detected: ${tenant.name}`,
          message: `CPU: ${cpuRatio.toFixed(1)}x, Memory: ${memoryRatio.toFixed(1)}x, IOPS: ${iopsRatio.toFixed(1)}x fair share`,
        });
      }
    }

    return {
      totalTenants: tenantCount,
      noisyTenants,
      detectedAt: new Date(),
    };
  }
}
```

## Tenant-Level Alerting

```typescript
class TenantAlertManager {
  private readonly thresholds = {
    errorRate: 0.05,      // 5% error rate
    p95Latency: 2000,     // 2 seconds
    rateLimitHits: 100,   // per hour
    resourceQuota: 0.9,  // 90% of quota
  };

  async evaluateTenant(tenantId: string): Promise<TenantAlert[]> {
    const alerts: TenantAlert[] = [];
    const metrics = await this.getTenantMetrics(tenantId);

    // Error rate threshold
    if (metrics.errorRate > this.thresholds.errorRate) {
      alerts.push({
        tenantId,
        type: 'HIGH_ERROR_RATE',
        severity: 'HIGH',
        message: `Error rate ${(metrics.errorRate * 100).toFixed(1)}% exceeds ${(this.thresholds.errorRate * 100).toFixed(0)}% threshold`,
        currentValue: metrics.errorRate,
        threshold: this.thresholds.errorRate,
      });
    }

    // Latency threshold
    if (metrics.p95Latency > this.thresholds.p95Latency) {
      alerts.push({
        tenantId,
        type: 'HIGH_LATENCY',
        severity: 'WARNING',
        message: `p95 latency ${metrics.p95Latency}ms exceeds ${this.thresholds.p95Latency}ms threshold`,
        currentValue: metrics.p95Latency,
        threshold: this.thresholds.p95Latency,
      });
    }

    // Rate limit hits
    if (metrics.rateLimitHits > this.thresholds.rateLimitHits) {
      alerts.push({
        tenantId,
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARNING',
        message: `${metrics.rateLimitHits} rate limit hits in the last hour`,
        currentValue: metrics.rateLimitHits,
        threshold: this.thresholds.rateLimitHits,
      });
    }

    return alerts;
  }
}
```

## Cost Attribution

```typescript
class TenantCostAttribution {
  async attributeCosts(): Promise<CostAttributionReport> {
    const tenants = await this.getAllTenants();
    const totalInfraCost = await this.getTotalInfrastructureCost();
    const attributions: TenantCost[] = [];

    for (const tenant of tenants) {
      const usage = await this.getTenantResourceUsage(tenant.id);
      const dbCost = this.calculateDBCost(usage);
      const computeCost = this.calculateComputeCost(usage);
      const storageCost = this.calculateStorageCost(usage);
      const networkCost = this.calculateNetworkCost(usage);
      const total = dbCost + computeCost + storageCost + networkCost;

      attributions.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        costs: {
          database: dbCost,
          compute: computeCost,
          storage: storageCost,
          network: networkCost,
          total,
        },
        percentage: (total / totalInfraCost) * 100,
      });
    }

    return {
      totalMonthlyCost: totalInfraCost,
      tenants: attributions,
      unallocatedCost: this.calculateUnallocated(attributions, totalInfraCost),
      reportDate: new Date(),
    };
  }

  calculateDBCost(usage: ResourceUsage): number {
    // Cost per GB of data, per query, per connection
    return usage.dbStorageGB * 0.115 + usage.dbQueries * 0.000001;
  }
}
```

## Key Points
- Track per-tenant metrics: request count, error rate, latency, endpoints
- Detect noisy neighbors using resource usage vs fair share (3x threshold)
- Alert on per-tenant thresholds: 5% error rate, 2s p95 latency, 100 rate limit hits/hour
- Attribute infrastructure costs per tenant (DB, compute, storage, network)
- Track resource quota utilization and alert at 90%
- Monitor per-tenant rate limiting events
- Report tenant-level SLAs: actual vs promised performance
