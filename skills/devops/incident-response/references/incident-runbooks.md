# Incident Runbooks

## Runbook Template

```markdown
# Runbook: {Service Name}

## Overview
- **Service**: {name}
- **Owner**: {team}
- **Severity**: {SEV1 | SEV2 | SEV3}
- **SLO**: {p99 latency, error rate, uptime}

## Symptoms
- Alert: {alert name}
- User impact: {what users experience}
- Monitoring: {Grafana URL, Datadog URL}

## Triage

### Check 1: {First thing to check}
```bash
{command to run}
```
Expected: {expected output}
If not: {escalation path}

### Check 2: {Second thing to check}
```bash
{command}
```

### Check 3: {Third thing}
```bash
{command}
```

## Remediation

### Immediate Mitigation
```bash
# Step 1
{command}

# Step 2
{command}
```

### Permanent Fix
```bash
{command / manifest change}
```

## Escalation
- **Primary on-call**: {name}
- **Secondary**: {name}
- **Engineering Manager**: {name}
- **SME**: {name} ({area})

## Post-Recovery
- Verify: {check to confirm recovery}
- Monitor: {metrics to watch for 1h post-recovery}
- Runbook update: {what to update}
```

## Diagnostic Flowcharts

### High Error Rate
```
Start: Error rate > threshold
├── Is it a deployment? → Rollback to previous version
├── Is it a dependency? → Check upstream service health
├── Is it a data issue? → Check DB query performance
├── Is it a config? → Check recent config changes
└── Is it a traffic spike? → Check autoscaler / rate limiter
```

### Service Down
```
Start: Service not responding
├── Check pod status → Restart if CrashLoopBackOff
├── Check resource usage → Scale up or investigate leak
├── Check network → Verify ingress/service endpoints
├── Check dependencies → Verify upstream services healthy
└── Check DNS → Verify service discovery
```

### Slow Responses
```
Start: p99 latency > threshold
├── Check CPU → Scale up, investigate hot loop
├── Check memory → GC tuning, memory leak investigation
├── Check DB → Slow query, connection pool exhaustion
├── Check external API → Timeout, degraded upstream
└── Check cache → Cache miss ratio, expiry policy
```

## Incident Communication Templates

### Detection
```
:warning: SEV{1/2} | {Service} | {Brief description}
IC: {name} | Scribe: {name}
Impact: {users/services affected}
Investigation in progress. Next update: {T+15min}
```

### Mitigation
```
:large_green_circle: SEV{1/2} | {Service} | Mitigation in progress
Action taken: {rollback / scaled up / traffic drained}
Metrics improving: {latency/errors trending down}
Next update: {T+30min}
```

### Resolution
```
:checkered_flag: SEV{1/2} | {Service} | Resolved
Duration: {Xmin}
Root cause: {summary}
Postmortem scheduled: {date/time}
Full timeline to follow.
```
