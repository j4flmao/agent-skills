# KPI Tracking Tools

## Dashboard Configuration

```typescript
interface KPIDashboard {
  id: string
  name: string
  owner: string
  team: string
  refreshInterval: number
  widgets: Widget[]
  layout: DashboardLayout
}

interface Widget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'progress'
  metric: string
  title: string
  dataSource: DataSource
  visualization: VisualizationConfig
  thresholds: Threshold[]
}

interface DataSource {
  type: 'api' | 'database' | 'csv' | 'realtime'
  endpoint?: string
  query?: string
  refreshRate: number
}
```

## Metric Calculation Engine

```typescript
interface MetricDefinition {
  name: string
  formula: string
  unit: string
  decimals: number
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'rate'
  dimensions: string[]
  filters: Filter[]
}

interface Filter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between'
  value: unknown
}

class MetricCalculator {
  private definitions: Map<string, MetricDefinition> = new Map()

  register(metric: MetricDefinition): void {
    this.definitions.set(metric.name, metric)
  }

  async calculate(metricName: string, timeRange: TimeRange): Promise<MetricResult> {
    const definition = this.definitions.get(metricName)
    if (!definition) throw new Error(`Unknown metric: ${metricName}`)

    const rawData = await this.fetchData(definition, timeRange)
    const value = this.aggregate(rawData, definition.aggregation)
    const previousValue = await this.calculatePrevious(metricName, timeRange)

    return {
      metric: metricName,
      value: this.round(value, definition.decimals),
      previousValue: this.round(previousValue, definition.decimals),
      change: this.round(((value - previousValue) / previousValue) * 100, 1),
      unit: definition.unit,
      timestamp: new Date().toISOString(),
    }
  }

  private aggregate(data: number[], method: string): number {
    switch (method) {
      case 'sum': return data.reduce((a, b) => a + b, 0)
      case 'avg': return data.reduce((a, b) => a + b, 0) / data.length
      case 'count': return data.length
      case 'min': return Math.min(...data)
      case 'max': return Math.max(...data)
      case 'rate': {
        if (data.length < 2) return 0
        const first = data[0]
        const last = data[data.length - 1]
        return ((last - first) / first) * 100
      }
      default: return data[0] ?? 0
    }
  }

  private round(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }
}
```

## Alerting System

```typescript
interface AlertRule {
  id: string
  metric: string
  condition: 'above' | 'below' | 'change_percent'
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  channels: AlertChannel[]
  cooldown: number
  enabled: boolean
}

interface AlertChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook'
  config: Record<string, string>
}

class KPIAlertManager {
  private rules: Map<string, AlertRule> = new Map()
  private lastAlerted: Map<string, number> = new Map()

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule)
  }

  evaluate(metrics: MetricResult[]): Alert[] {
    const alerts: Alert[] = []

    for (const metric of metrics) {
      for (const rule of this.rules.values()) {
        if (rule.metric !== metric.metric) continue

        const isTriggered = this.checkCondition(metric, rule)
        if (isTriggered && !this.isOnCooldown(rule)) {
          alerts.push({
            ruleId: rule.id,
            metric: metric.metric,
            value: metric.value,
            threshold: rule.threshold,
            severity: rule.severity,
            timestamp: new Date().toISOString(),
            message: this.formatAlertMessage(metric, rule),
          })
          this.lastAlerted.set(rule.id, Date.now())
        }
      }
    }

    return alerts
  }

  private checkCondition(metric: MetricResult, rule: AlertRule): boolean {
    switch (rule.condition) {
      case 'above': return metric.value > rule.threshold
      case 'below': return metric.value < rule.threshold
      case 'change_percent': return Math.abs(metric.change) > rule.threshold
    }
  }

  private isOnCooldown(rule: AlertRule): boolean {
    const last = this.lastAlerted.get(rule.id)
    if (!last) return false
    return Date.now() - last < rule.cooldown * 1000
  }
}
```

## Trend Analysis

```typescript
interface TrendResult {
  direction: 'up' | 'down' | 'stable'
  magnitude: number
  seasonality: boolean
  forecast: number[]
  confidence: number
}

function analyzeTrend(values: number[], windowSize = 7): TrendResult {
  const recentValues = values.slice(-windowSize)
  const olderValues = values.slice(-windowSize * 2, -windowSize)

  const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length
  const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length

  const change = ((recentAvg - olderAvg) / olderAvg) * 100

  const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'stable'
  const variance = calculateVariance(recentValues)

  return {
    direction,
    magnitude: Math.abs(change),
    seasonality: detectSeasonality(values),
    forecast: simpleForecast(recentValues, 7),
    confidence: Math.max(0, 100 - variance * 10),
  }
}

function simpleForecast(values: number[], periods: number): number[] {
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return Array(periods).fill(avg)
}
```

## KPI Scorecard

```typescript
interface ScorecardEntry {
  metric: string
  target: number
  actual: number
  weight: number
  score: number
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved'
}

function generateScorecard(metrics: MetricResult[], targets: Target[]): ScorecardEntry[] {
  return metrics.map(metric => {
    const target = targets.find(t => t.metric === metric.metric)
    if (!target) return null

    const progress = metric.value / target.value
    const score = Math.min(progress, 1) * 100

    let status: ScorecardEntry['status']
    if (score >= 100) status = 'achieved'
    else if (score >= 80) status = 'on_track'
    else if (score >= 50) status = 'at_risk'
    else status = 'behind'

    return {
      metric: metric.metric,
      target: target.value,
      actual: metric.value,
      weight: target.weight,
      score,
      status,
    }
  }).filter(Boolean) as ScorecardEntry[]
}
```

## Key Points

- Define metric calculations with explicit formulas and aggregation methods
- Set up real-time dashboards with configurable refresh intervals
- Implement alert rules with severity levels and cooldown periods
- Track trends with moving averages and seasonality detection
- Generate scorecards comparing actuals against targets
- Use weighted scoring for composite KPI evaluation
- Send alerts through multiple channels (Slack, email, PagerDuty)
- Analyze variance and forecast future values
- Compare period-over-period changes for context
- Archive historical data for trend analysis
- Set up automated reports on regular cadences
- Review and adjust thresholds based on historical patterns
