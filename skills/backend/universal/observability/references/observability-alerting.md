# Observability Alerting

## Overview
Design effective alerting for observability: alert rules, severity levels, notification routing, escalation policies, and on-call integration.

## Alert Rule Design

```typescript
interface AlertRule {
  name: string;
  description: string;
  severity: 'page' | 'ticket' | 'notification';
  condition: string; // PromQL or similar
  duration: string;  // Must breach for this long
  labels: Record<string, string>;
  annotations: {
    summary: string;
    description: string;
    runbookUrl?: string;
  };
}

const ALERT_RULES: AlertRule[] = [
  {
    name: 'HighErrorRate',
    description: 'Service error rate exceeds 5% for 5 minutes',
    severity: 'page',
    condition: 'rate(service_errors_total[5m]) / rate(service_requests_total[5m]) > 0.05',
    duration: '5m',
    labels: { team: 'backend' },
    annotations: {
      summary: 'High error rate on {{ $labels.service }}',
      description: 'Error rate {{ $value | humanizePercentage }} on {{ $labels.service }} (threshold: 5%)',
    },
  },
  {
    name: 'HighLatency',
    description: 'p99 latency exceeds 2s for 5 minutes',
    severity: 'page',
    condition: 'histogram_quantile(0.99, rate(service_request_duration_ms_bucket[5m])) > 2000',
    duration: '5m',
    labels: { team: 'backend' },
    annotations: {
      summary: 'High p99 latency on {{ $labels.service }}',
      description: 'p99 latency {{ $value }}ms on {{ $labels.service }} (threshold: 2000ms)',
    },
  },
  {
    name: 'HighConsumerLag',
    description: 'Kafka consumer lag > 10000 messages',
    severity: 'page',
    condition: 'max(kafka_consumer_lag) > 10000',
    duration: '5m',
    labels: { team: 'backend' },
    annotations: {
      summary: 'High consumer lag on {{ $labels.consumer_group }}',
      description: 'Consumer lag {{ $value }} messages (threshold: 10000)',
    },
  },
  {
    name: 'MemoryUsageHigh',
    description: 'Memory usage > 90% for 10 minutes',
    severity: 'notification',
    condition: 'process_resident_memory_bytes / process_virtual_memory_bytes > 0.9',
    duration: '10m',
    labels: { team: 'backend' },
    annotations: {
      summary: 'High memory usage on {{ $labels.instance }}',
      description: 'Memory usage {{ $value | humanizePercentage }} (threshold: 90%)',
    },
  },
];
```

## Notification Routing

```typescript
class AlertRouter {
  private routes: Map<string, AlertRoute> = new Map();

  constructor() {
    this.registerRoute('page', {
      type: 'pagerduty',
      config: {
        routingKey: process.env.PAGERDUTY_ROUTING_KEY!,
        severity: 'critical',
        dedupKey: '{{ .GroupLabels.alertname }}',
      },
    });

    this.registerRoute('ticket', {
      type: 'jira',
      config: {
        project: 'OPS',
        issueType: 'Task',
        priority: 'P2',
      },
    });

    this.registerRoute('notification', {
      type: 'slack',
      config: {
        channel: '#alerts',
        username: 'Observability Bot',
      },
    });
  }

  async routeAlert(alert: Alert): Promise<void> {
    const route = this.routes.get(alert.severity);
    if (!route) {
      console.warn(`No route for severity: ${alert.severity}`);
      return;
    }

    switch (route.type) {
      case 'pagerduty':
        await this.triggerPagerDuty(alert, route.config);
        break;
      case 'jira':
        await this.createJiraTicket(alert, route.config);
        break;
      case 'slack':
        await this.sendSlackNotification(alert, route.config);
        break;
    }
  }
}
```

## Escalation Policies

```typescript
interface EscalationStep {
  name: string;
  notify: string[];     // Users or groups
  timeout: number;      // Minutes to acknowledge
  target: 'any' | 'all';
}

class EscalationPolicy {
  private steps: EscalationStep[] = [
    { name: 'Primary on-call', notify: ['oncall-primary'], timeout: 15, target: 'any' },
    { name: 'Secondary on-call', notify: ['oncall-secondary'], timeout: 10, target: 'any' },
    { name: 'Team lead', notify: ['team-lead'], timeout: 5, target: 'any' },
    { name: 'Engineering manager', notify: ['eng-manager'], timeout: 5, target: 'any' },
  ];

  async execute(alert: Alert): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const notified = await this.notifyStep(step, alert);

      if (notified && step.target === 'any') {
        // Wait for acknowledgment
        const acknowledged = await this.waitForAck(alert, step.timeout);
        if (acknowledged) return; // Resolved at this level
      }
    }

    // All steps exhausted — critical incident
    await this.escalateToIncidentResponse(alert);
  }
}
```

## On-Call Integration

```typescript
class OnCallIntegration {
  async getCurrentOnCall(): Promise<OnCallInfo> {
    const schedule = await pagerDuty.getSchedule('PRIMARY');
    const current = schedule.now();

    return {
      primary: current.users.map(u => ({
        name: u.name,
        email: u.email,
        phone: u.contactMethods.phone,
      })),
      secondary: [], // Next on-call
    };
  }

  async createIncident(alert: Alert): Promise<void> {
    const onCall = await this.getCurrentOnCall();

    await pagerDuty.triggerIncident({
      title: alert.summary,
      description: alert.description,
      urgency: alert.severity === 'page' ? 'high' : 'low',
      assignees: onCall.primary.map(u => ({ id: u.email })),
      escalationPolicy: alert.severity === 'page' ? 'CRITICAL' : 'STANDARD',
    });
  }
}
```

## Alert Fatigue Prevention

```typescript
class AlertDeduplicator {
  private recentAlerts: Map<string, number> = new Map();
  private readonly SILENCE_WINDOW = 3600000; // 1 hour

  isDuplicate(alert: Alert): boolean {
    const key = `${alert.labels.alertname}:${alert.labels.service}`;
    const lastFired = this.recentAlerts.get(key);
    const now = Date.now();

    if (lastFired && (now - lastFired) < this.SILENCE_WINDOW) {
      return true; // Already fired within silence window
    }

    this.recentAlerts.set(key, now);
    return false;
  }

  // Group correlated alerts into incidents
  groupAlerts(alerts: Alert[]): Incident[] {
    const groups = new Map<string, Alert[]>();

    for (const alert of alerts) {
      const key = this.getGroupKey(alert);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(alert);
    }

    return Array.from(groups.entries()).map(([key, group]) => ({
      id: key,
      title: group[0].labels.alertname,
      severity: this.getHighestSeverity(group),
      alerts: group,
      firstFired: new Date(Math.min(...group.map(a => a.firedAt))),
      count: group.length,
    }));
  }
}
```

## Key Points
- Define alert rules with clear severity tiers: page (critical), ticket (warning), notification (info)
- Route alerts: PagerDuty for pages, Jira for tickets, Slack for notifications
- Implement escalation policies: primary on-call (15min) → secondary (10min) → team lead (5min) → EM (5min)
- Integrate with on-call schedules from PagerDuty/OpsGenie
- Deduplicate alerts within 1-hour silence window
- Group correlated alerts into incidents
- Set alert duration conditions to avoid flapping (e.g., 5m of sustained breach)
- Test alert rules with synthetic metric injection
