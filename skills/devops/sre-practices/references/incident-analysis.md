# Incident Analysis Framework

## Postmortem Template

**Incident Summary**
- Date: YYYY-MM-DD | Duration: HH:MM | Severity: SEV1/SEV2/SEV3

**Timeline**
- HH:MM — Event detected / alert fired
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Mitigation applied
- HH:MM — Service restored

**Impact**
- Users affected: X
- Revenue impact: 
- Data loss: Yes/No

**Root Cause**
- Primary cause
- Contributing factors

**Action Items**
| Action | Owner | Deadline |
|--------|-------|----------|
| Fix the bug | Name | Date |
| Add monitoring | Name | Date |
| Update runbook | Name | Date |

**What Went Well**
- Fast detection
- Good communication

**What Went Wrong**
- Missing runbook
- Incomplete monitoring

## Severity Definition
| Severity | Description | Response Time | Postmortem |
|----------|-------------|---------------|------------|
| SEV1 | Service down, revenue impact | 15 min | Required within 48h |
| SEV2 | Partial outage, degraded experience | 60 min | Required within 1w |
| SEV3 | Minor issue, no user impact | Next business day | Optional |

## Incident Command System
| Role | Responsibility |
|------|---------------|
| Incident Commander | Coordinates response, delegates tasks |
| Communication Lead | Internal/external status updates |
| Operations Lead | Technical mitigation |
| Scribe | Timeline recording |

## Blameless Culture Principles
- Assume good intent from everyone
- Focus on systems, not people
- Every incident is an opportunity to improve
- Share learnings broadly across the organization
- Fix the root cause, not the symptom
