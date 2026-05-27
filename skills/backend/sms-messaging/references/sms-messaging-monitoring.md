# SMS Messaging Monitoring

## Overview
Monitor SMS delivery performance, costs, and compliance across multiple providers. Track delivery rates, latency, cost per message, and budget consumption. Set up alerts for anomalies.

## Delivery Metrics Collection

```typescript
// delivery.metrics.ts
interface DeliveryMetric {
  timestamp: Date;
  provider: string;
  messageType: 'transactional' | 'otp' | 'notification' | 'alert';
  count: number;
  sent: number;
  delivered: number;
  failed: number;
  undelivered: number;
  avgLatencyMs: number;
  totalCost: number;
}

class DeliveryMetricsCollector {
  private readonly metrics: DeliveryMetric[] = [];

  async recordDelivery(messageId: string, status: DeliveryStatus): Promise<void> {
    const window = this.getCurrentWindow();
    const metric = this.getOrCreateMetric(window);

    metric.count += 1;
    switch (status.state) {
      case 'sent': metric.sent += 1; break;
      case 'delivered': metric.delivered += 1; break;
      case 'failed': metric.failed += 1; break;
      case 'undelivered': metric.undelivered += 1; break;
    }
    metric.avgLatencyMs = (metric.avgLatencyMs * (metric.count - 1) + status.latencyMs) / metric.count;
    metric.totalCost += status.cost;

    await this.persistMetric(metric);
  }

  async getDeliveryRate(windowMinutes: number): Promise<number> {
    const metrics = await this.getMetricsInWindow(windowMinutes);
    const totalSent = metrics.reduce((sum, m) => sum + m.sent, 0);
    const totalDelivered = metrics.reduce((sum, m) => sum + m.delivered, 0);
    return totalSent > 0 ? totalDelivered / totalSent : 1;
  }
}
```

## Dashboard Query Examples

```sql
-- Delivery rate by provider (PostgreSQL)
SELECT
  provider,
  COUNT(*) AS total_messages,
  SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) AS delivery_rate,
  AVG(latency_ms)::integer AS avg_latency_ms
FROM message_logs
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY provider
ORDER BY delivery_rate DESC;

-- Cost per message type
SELECT
  type,
  COUNT(*) AS count,
  ROUND(SUM(cost)::numeric, 2) AS total_cost,
  ROUND(AVG(cost)::numeric, 4) AS avg_cost_per_message
FROM message_logs
WHERE sent_at >= DATE_TRUNC('month', NOW())
GROUP BY type
ORDER BY total_cost DESC;

-- Opt-out rate trend
SELECT
  DATE_TRUNC('day', opt_out_date) AS day,
  COUNT(*) AS opt_outs,
  ROUND(100.0 * COUNT(*) / NULLIF((
    SELECT COUNT(*) FROM message_logs
    WHERE DATE_TRUNC('day', sent_at) = DATE_TRUNC('day', opt_out_date)
  ), 0), 3) AS opt_out_rate
FROM consent_records
WHERE opt_out_date >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;
```

## Alerting Configuration

```typescript
// alerts.ts
interface AlertRule {
  name: string;
  metric: string;
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  duration: number; // minutes
  severity: 'info' | 'warning' | 'critical';
}

const alertRules: AlertRule[] = [
  {
    name: 'LowDeliveryRate',
    metric: 'delivery_rate',
    operator: '<',
    threshold: 95, // percent
    duration: 15,
    severity: 'critical',
  },
  {
    name: 'HighBounceRate',
    metric: 'bounce_rate',
    operator: '>',
    threshold: 5, // percent
    duration: 30,
    severity: 'warning',
  },
  {
    name: 'BudgetThreshold',
    metric: 'daily_cost',
    operator: '>',
    threshold: 100, // dollars
    duration: 0,
    severity: 'warning',
  },
  {
    name: 'ProviderFailover',
    metric: 'failover_count',
    operator: '>',
    threshold: 10, // per hour
    duration: 60,
    severity: 'critical',
  },
];

async function evaluateAlert(rule: AlertRule): Promise<void> {
  const value = await getCurrentMetricValue(rule.metric, rule.duration);
  const triggered = evaluateCondition(value, rule.operator, rule.threshold);
  if (triggered) {
    await sendAlert({
      rule: rule.name,
      severity: rule.severity,
      message: `${rule.name}: current ${value}, threshold ${rule.operator} ${rule.threshold}`,
      timestamp: new Date(),
    });
  }
}
```

## Provider Health Checks

```typescript
// provider.health.ts
class ProviderHealthChecker {
  private readonly healthCheckInterval = 60000; // 1 minute

  async checkProvider(provider: MessageProvider): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const balance = await provider.getBalance();
      const latency = Date.now() - start;

      return {
        name: provider.name,
        status: 'healthy',
        balance,
        latencyMs: latency,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name: provider.name,
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }

  startPeriodicCheck(providers: MessageProvider[]): void {
    setInterval(async () => {
      for (const provider of providers) {
        const health = await this.checkProvider(provider);
        await this.persistHealth(health);

        if (health.status === 'unhealthy') {
          await sendAlert({
            rule: 'ProviderDown',
            severity: 'critical',
            message: `Provider ${provider.name} is unhealthy`,
            timestamp: new Date(),
          });
        }
      }
    }, this.healthCheckInterval);
  }
}
```

## Cost Tracking & Budget Management

```typescript
// budget.manager.ts
interface Budget {
  provider: string;
  monthlyLimit: number;
  dailyLimit: number;
  currentMonthSpend: number;
  currentDaySpend: number;
  alertsEnabled: boolean;
}

class BudgetManager {
  async trackCost(provider: string, cost: number): Promise<void> {
    const budget = await this.getBudget(provider);
    budget.currentDaySpend += cost;
    budget.currentMonthSpend += cost;

    if (budget.alertsEnabled) {
      if (budget.currentDaySpend >= budget.dailyLimit) {
        await sendBudgetAlert(provider, 'daily', budget.currentDaySpend, budget.dailyLimit);
      }
      if (budget.currentMonthSpend >= budget.monthlyLimit) {
        await sendBudgetAlert(provider, 'monthly', budget.currentMonthSpend, budget.monthlyLimit);
        await this.pauseProvider(provider);
      }
    }

    await this.persistBudget(budget);
  }

  async getCostReport(period: 'daily' | 'weekly' | 'monthly'): Promise<CostReport> {
    const logs = await MessageLog.aggregate([
      { $match: { sentAt: { $gte: this.getPeriodStart(period) } } },
      { $group: {
        _id: { provider: '$provider', type: '$type' },
        count: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        avgCost: { $avg: '$cost' },
      }},
    ]);
    return { period, providers: logs };
  }
}
```

## Logging Best Practices

```typescript
// Structured logging for SMS events
interface SmsLogEntry {
  event: 'send' | 'delivery' | 'failover' | 'opt_out' | 'rate_limit_hit' | 'error';
  messageId: string;
  provider?: string;
  recipient?: string; // last 4 digits only for privacy
  status?: string;
  latencyMs?: number;
  cost?: number;
  error?: string;
  timestamp: Date;
}

function logSmsEvent(entry: SmsLogEntry): void {
  // Never log full phone numbers or message content
  const safeEntry = {
    ...entry,
    recipient: entry.recipient ? `****${entry.recipient.slice(-4)}` : undefined,
  };
  logger.info({ ...safeEntry, type: 'sms_event' });
}
```

## Key Points
- Track delivery rate, bounce rate, latency, opt-out rate per provider
- Set up budget alerts at daily and monthly thresholds
- Implement provider health checks with automatic failover alerts
- Use structured logging without sensitive data (partial phone numbers only)
- Build dashboards showing delivery rate trends, cost breakdowns, provider comparison
- Alert on anomalies: delivery drop below 95%, bounce spike above 5%, provider failure
