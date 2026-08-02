# On-Call and Alerting

## Core Principles of On-Call
On-call rotations are essential for maintaining highly available services, but they must be managed carefully to avoid burning out engineers.
- **Compensation/Time Off:** Acknowledge the burden of being on-call with appropriate compensation or time in lieu.
- **Clear Escalation:** Have a well-defined escalation policy (Primary -> Secondary -> Manager).
- **Runbooks:** Every alert must have an actionable runbook linked to it.

## Alert Fatigue
Alert fatigue occurs when engineers are exposed to a high volume of frequent, non-actionable alarms. This leads to desensitization, where critical alerts might be ignored.
- **Symptom:** "Oh, that alert always fires, just ignore it."
- **Cure:** Delete noisy alerts. If an alert doesn't require a human to take immediate action, it should not page.

## Good Alerts
A good alert meets the following criteria:
1. **Actionable:** The responder knows what to do or where to start looking.
2. **Symptom-based:** Alert on user-facing symptoms (e.g., "High Latency", "5xx Errors"), not causes (e.g., "CPU at 90%"). High CPU doesn't matter if the service is still responding fine.
3. **Urgent:** It requires immediate attention. If it can wait until morning, create a ticket, don't page.

## Burnout Prevention
- Monitor the number of pages per shift (aim for < 2 actionable pages per 12 hours).
- Ensure a healthy rotation size (at least 4-6 people) to minimize frequency.
- Prioritize fixing the root causes of recurring pages.
