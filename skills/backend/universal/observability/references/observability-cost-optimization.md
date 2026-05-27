# Observability Cost Optimization

## Overview
Optimize observability costs: data retention tiering, metric cardinality control, trace sampling strategies, log volume management, and budget tracking.

## Data Retention Tiers

```typescript
class RetentionPolicyManager {
  private tiers: RetentionTier[] = [
    {
      name: 'hot',
      duration: '7d',
      storageType: 'ssd',
      costPerGB: 0.50,
      indexes: ['trace_id', 'service', 'status'],
    },
    {
      name: 'warm',
      duration: '30d',
      storageType: 'hdd',
      costPerGB: 0.10,
      indexes: ['service', 'status'],
    },
    {
      name: 'cold',
      duration: '365d',
      storageType: 's3',
      costPerGB: 0.02,
      indexes: ['service'],
    },
    {
      name: 'archive',
      duration: '7y',
      storageType: 'glacier',
      costPerGB: 0.001,
      indexes: [],
    },
  ];

  async calculateMonthlyCost(dailyDataGB: number): Promise<CostBreakdown> {
    const costs: Record<string, number> = {};
    let total = 0;

    for (const tier of this.tiers) {
      const days = this.parseDuration(tier.duration);
      const gbInTier = dailyDataGB * days;
      const cost = gbInTier * tier.costPerGB;
      costs[tier.name] = cost;
      total += cost;
    }

    return { total, byTier: costs };
  }
}
```

## Metric Cardinality Control

```typescript
class CardinalityManager {
  async analyzeCardinality(metricName: string): Promise<CardinalityReport> {
    const series = await this.queryMetricSeries(metricName);

    const labelCardinality: Record<string, number> = {};
    for (const serie of series) {
      for (const [label, value] of Object.entries(serie.labels)) {
        if (!labelCardinality[label]) labelCardinality[label] = 0;
        labelCardinality[label]++;
      }
    }

    const highCardinalityWarnings: string[] = [];
    for (const [label, count] of Object.entries(labelCardinality)) {
      if (count > 100) {
        highCardinalityWarnings.push(
          `Label "${label}" has ${count} unique values — consider removing or reducing`
        );
      }
    }

    return {
      metric: metricName,
      totalSeries: series.length,
      labelCardinality,
      warnings: highCardinalityWarnings,
    };
  }

  async suggestOptimization(metricName: string): Promise<CardinalitySuggestion[]> {
    const report = await this.analyzeCardinality(metricName);
    const suggestions: CardinalitySuggestion[] = [];

    for (const [label, count] of Object.entries(report.labelCardinality)) {
      if (count > 1000) {
        suggestions.push({
          metric: metricName,
          label,
          currentCardinality: count,
          suggestion: `Remove label "${label}" — excessive cardinality (${count} values)`,
          estimatedSavings: this.estimateCost(count),
          action: 'remove',
        });
      } else if (count > 100) {
        suggestions.push({
          metric: metricName,
          label,
          currentCardinality: count,
          suggestion: `Consider reducing label "${label}" cardinality (${count} values)`,
          estimatedSavings: this.estimateCost(count),
          action: 'reduce',
        });
      }
    }

    return suggestions;
  }
}
```

## Trace Sampling Strategies

```typescript
class TraceSamplingManager {
  // Head-based sampling
  headBasedSample(rate: number): Sampler {
    return {
      shouldSample(context: SpanContext): boolean {
        // Deterministic sampling based on trace ID
        return this.hashTraceId(context.traceId) < rate;
      },
    };
  }

  // Tail-based sampling — keep important traces
  async tailBasedSample(spans: Span[]): Promise<Span[]> {
    const important = spans.filter(span => {
      // Keep all error traces
      if (span.status.code === SpanStatusCode.ERROR) return true;

      // Keep all high-latency traces
      if (span.duration[0] > 2000000) return true; // > 2s

      // Keep traces from important endpoints
      if (span.attributes['http.target']?.match(/\/api\/(checkout|payment)/)) return true;

      // Sample remaining at 10%
      return Math.random() < 0.1;
    });

    return important;
  }

  // Adaptive sampling — adjust rate based on traffic
  adaptiveSample(currentRPS: number): number {
    const TARGET_TRACES_PER_SEC = 100;
    if (currentRPS <= TARGET_TRACES_PER_SEC) return 1.0; // Sample all at low traffic
    return TARGET_TRACES_PER_SEC / currentRPS;
  }
}
```

## Log Volume Management

```typescript
class LogVolumeManager {
  async analyzeLogVolume(days = 7): Promise<LogVolumeReport> {
    const totalBytes = await this.getTotalLogBytes(days);
    const byService = await this.getVolumeByService(days);
    const byLevel = await this.getVolumeByLevel(days);

    return {
      totalGB: totalBytes / 1073741824,
      dailyAverage: totalBytes / days / 1073741824,
      byService: byService.map(s => ({
        service: s.service,
        gb: s.bytes / 1073741824,
        percentage: (s.bytes / totalBytes) * 100,
      })),
      byLevel,
      suggestions: this.generateSuggestions(byService, totalBytes),
    };
  }

  private generateSuggestions(
    byService: ServiceLogVolume[],
    totalBytes: number
  ): string[] {
    const suggestions: string[] = [];

    for (const service of byService) {
      const percentage = (service.bytes / totalBytes) * 100;
      if (percentage > 20) {
        suggestions.push(
          `${service.service}: ${percentage.toFixed(0)}% of log volume — consider reducing debug logging`
        );
      }
    }

    return suggestions;
  }
}
```

## Budget Tracking

```typescript
class ObservabilityBudget {
  private readonly monthlyBudget = 5000; // $5000/month

  async trackMonthlyCost(): Promise<BudgetReport> {
    const costs = await this.getCurrentMonthCosts();
    const total = costs.traces + costs.metrics + costs.logs;
    const remaining = this.monthlyBudget - total;
    const daysInMonth = new Date(Date.now()).getDate();
    const projected = (total / daysInMonth) * 30;

    return {
      budget: this.monthlyBudget,
      spent: total,
      remaining,
      projected,
      breakdown: costs,
      alerts: projected > this.monthlyBudget
        ? [`Projected to exceed budget by $${(projected - this.monthlyBudget).toFixed(0)}`]
        : [],
    };
  }

  async optimize(): Promise<OptimizationPlan> {
    const report = await this.trackMonthlyCost();
    const actions: OptimizationAction[] = [];

    if (report.breakdown.traces > report.budget * 0.5) {
      actions.push({
        area: 'traces',
        action: 'Reduce sampling rate by 50%',
        estimatedSavings: report.breakdown.traces * 0.5,
      });
    }
    if (report.breakdown.logs > report.budget * 0.3) {
      actions.push({
        area: 'logs',
        action: 'Increase log retention tiers: reduce hot from 7d to 3d',
        estimatedSavings: report.breakdown.logs * 0.2,
      });
    }

    return { actions, totalEstimatedSavings: actions.reduce((s, a) => s + a.estimatedSavings, 0) };
  }
}
```

## Key Points
- Use retention tiers: hot (7d SSD), warm (30d HDD), cold (365d S3), archive (7y Glacier)
- Control metric cardinality: warn at >100 values, block at >1000
- Use adaptive trace sampling: 100 traces/sec target, sample all at low traffic
- Keep error and high-latency traces at full fidelity
- Analyze log volume per service, reduce excessive debug logging
- Set monthly observability budget and track projected spend
- Auto-optimize: reduce sampling rate if traces >50% of budget
- Archive old data to cheapest storage tier automatically
