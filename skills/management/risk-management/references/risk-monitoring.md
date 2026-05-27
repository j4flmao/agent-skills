# Risk Monitoring

## Continuous Monitoring Setup

```typescript
interface MonitorConfig {
  name: string
  metric: string
  threshold: number
  interval: number
  action: string
  enabled: boolean
}

class RiskMonitor {
  private monitors: Map<string, MonitorConfig> = new Map()
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()

  addMonitor(config: MonitorConfig): void {
    this.monitors.set(config.name, config)
  }

  start(): void {
    for (const [name, config] of this.monitors) {
      if (config.enabled) {
        const interval = setInterval(() => {
          this.evaluate(name, config)
        }, config.interval)
        this.intervals.set(name, interval)
      }
    }
  }

  stop(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.intervals.clear()
  }

  private async evaluate(name: string, config: MonitorConfig): Promise<void> {
    try {
      const currentValue = await this.fetchMetric(config.metric)
      const isBreached = this.checkThreshold(currentValue, config.threshold)

      if (isBreached) {
        await this.triggerAction(config.action, {
          monitor: name,
          metric: config.metric,
          value: currentValue,
          threshold: config.threshold,
        })
      }
    } catch (error) {
      console.error(`Monitor ${name} evaluation failed:`, error)
    }
  }

  private async fetchMetric(metric: string): Promise<number> {
    const response = await fetch(`/api/metrics/${metric}`)
    const data = await response.json()
    return data.value
  }

  private checkThreshold(value: number, threshold: number): boolean {
    return value > threshold
  }

  private async triggerAction(
    action: string,
    context: Record<string, unknown>
  ): Promise<void> {
    switch (action) {
      case 'alert':
        await sendAlert(context)
        break
      case 'escalate':
        await escalateRisk(context)
        break
      case 'log':
        console.warn('Risk threshold breached:', context)
        break
    }
  }
}
```

## Real-time Risk Dashboard

```typescript
interface DashboardMetrics {
  activeRisks: number
  criticalRisks: number
  mitigationProgress: number
  openActions: number
  overdueItems: number
  riskScore: number
}

class RiskDashboard {
  private listeners: Set<(metrics: DashboardMetrics) => void> = new Set()
  private refreshInterval: number

  constructor(refreshInterval = 30000) {
    this.refreshInterval = refreshInterval
  }

  subscribe(callback: (metrics: DashboardMetrics) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  async refresh(risks: Risk[]): Promise<void> {
    const metrics = this.calculateMetrics(risks)
    this.listeners.forEach(fn => fn(metrics))
  }

  private calculateMetrics(risks: Risk[]): DashboardMetrics {
    return {
      activeRisks: risks.filter(r => r.status !== 'closed').length,
      criticalRisks: risks.filter(r => r.score >= 15).length,
      mitigationProgress: this.calculateMitigationProgress(risks),
      openActions: risks.filter(r => r.status === 'open').length,
      overdueItems: risks.filter(r => this.isOverdue(r)).length,
      riskScore: this.calculateAverageRiskScore(risks),
    }
  }
}
```

## Trigger-Based Actions

```typescript
interface TriggerRule {
  id: string
  name: string
  condition: {
    field: keyof Risk
    operator: 'equals' | 'greater_than' | 'less_than' | 'changed'
    value: unknown
  }
  actions: TriggerAction[]
  enabled: boolean
}

interface TriggerAction {
  type: 'notification' | 'status_change' | 'assign_owner' | 'create_task' | 'webhook'
  config: Record<string, unknown>
}

class RiskTriggerEngine {
  private rules: TriggerRule[] = []

  addRule(rule: TriggerRule): void {
    this.rules.push(rule)
  }

  evaluate(risk: Risk, previous?: Risk): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue

      const triggered = this.matchesCondition(risk, previous, rule.condition)
      if (triggered) {
        this.executeActions(rule.actions, risk)
      }
    }
  }

  private matchesCondition(
    risk: Risk,
    previous: Risk | undefined,
    condition: TriggerRule['condition']
  ): boolean {
    const currentValue = risk[condition.field]
    const previousValue = previous?.[condition.field]

    switch (condition.operator) {
      case 'equals':
        return currentValue === condition.value
      case 'greater_than':
        return (currentValue as number) > (condition.value as number)
      case 'less_than':
        return (currentValue as number) < (condition.value as number)
      case 'changed':
        return currentValue !== previousValue
      default:
        return false
    }
  }

  private async executeActions(actions: TriggerAction[], risk: Risk): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'notification':
          await sendNotification(action.config, risk)
          break
        case 'status_change':
          risk.status = action.config.status as string
          break
        case 'assign_owner':
          risk.owner = action.config.owner as string
          break
        case 'webhook':
          await callWebhook(action.config.url as string, risk)
          break
      }
    }
  }
}
```

## Escalation Policy

```typescript
interface EscalationLevel {
  level: number
  threshold: number
  notifyRoles: string[]
  maxResponseTime: number
  autoActions: string[]
}

const escalationPolicy: EscalationLevel[] = [
  {
    level: 1,
    threshold: 8,
    notifyRoles: ['risk-owner'],
    maxResponseTime: 48,
    autoActions: ['send_notification'],
  },
  {
    level: 2,
    threshold: 12,
    notifyRoles: ['risk-owner', 'team-lead'],
    maxResponseTime: 24,
    autoActions: ['send_notification', 'schedule_review'],
  },
  {
    level: 3,
    threshold: 16,
    notifyRoles: ['risk-owner', 'team-lead', 'department-head'],
    maxResponseTime: 8,
    autoActions: ['send_notification', 'schedule_review', 'flag_for_audit'],
  },
  {
    level: 4,
    threshold: 20,
    notifyRoles: ['all-stakeholders', 'executive'],
    maxResponseTime: 4,
    autoActions: ['send_notification', 'schedule_emergency_meeting', 'flag_for_audit'],
  },
]

function determineEscalation(risk: Risk): EscalationLevel | null {
  return escalationPolicy.find(level => risk.score >= level.threshold) ?? null
}

async function escalateIfNeeded(risk: Risk): Promise<void> {
  const escalation = determineEscalation(risk)
  if (!escalation) return

  await notifyRoles(escalation.notifyRoles, {
    subject: `Risk Escalation: ${risk.description}`,
    severity: escalation.level,
    risk,
    responseBy: new Date(Date.now() + escalation.maxResponseTime * 3600000),
  })
}
```

## Key Risk Indicators

```typescript
interface KRI {
  name: string
  description: string
  currentValue: number
  baseline: number
  threshold: number
  trend: 'up' | 'down' | 'stable'
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly'
}

function defineKRIs(): KRI[] {
  return [
    {
      name: 'Open Vulnerabilities',
      description: 'Number of unpatched critical vulnerabilities',
      currentValue: 3,
      baseline: 5,
      threshold: 10,
      trend: 'down',
      frequency: 'daily',
    },
    {
      name: 'System Downtime',
      description: 'Total hours of unplanned downtime this month',
      currentValue: 2.5,
      baseline: 1,
      threshold: 4,
      trend: 'up',
      frequency: 'weekly',
    },
    {
      name: 'Incident Response Time',
      description: 'Average time to respond to security incidents',
      currentValue: 45,
      baseline: 30,
      threshold: 60,
      trend: 'up',
      frequency: 'realtime',
    },
  ]
}
```

## Key Points

- Set up continuous monitoring with configurable intervals
- Define thresholds that trigger automatic actions when breached
- Implement escalation policies based on risk severity levels
- Track Key Risk Indicators (KRIs) with baseline and thresholds
- Maintain real-time dashboards with live risk metrics
- Use trigger-based actions for automated risk response
- Monitor mitigation progress and overdue items
- Send notifications through multiple channels on threshold breach
- Escalate risks that exceed response time windows
- Track risk score trends to identify emerging threats
- Review and adjust monitoring thresholds periodically
- Archive monitoring data for trend analysis and reporting
