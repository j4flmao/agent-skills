# Holding Statement Templates

## Purpose
Holding statements are pre-approved communications issued during incidents to acknowledge the situation, set expectations for updates, and maintain stakeholder trust. They buy time for investigation without committing to unverified details.

## Template Structure

| Component | Purpose | Example |
|-----------|---------|---------|
| Acknowledgment | Confirm awareness | "We are aware of an issue affecting [service]" |
| Impact scope | Who/what is affected | "Some users may experience [symptom]" |
| Action taken | What team is doing | "Our engineering team is investigating" |
| Next update | When to expect more | "Next update within 30 minutes" |
| Contact link | Where to follow | "Status page: status.example.com" |

## Template: Service Outage

```
SUBJECT: [INCIDENT #[ID]] - [Service] Service Disruption

We are aware of an issue affecting [service] that may cause [symptom: 
slowdown/errors/unavailability] for some users.

Current status: [Investigating / Identified / Mitigating / Resolved]
Started at: [timestamp UTC]
Affected components: [list]

Our engineering team is actively investigating the root cause. 
We will provide the next update within [N] minutes.

For real-time updates: [status page URL]
For support: [support contact]
```

## Template: Security Incident

```
SUBJECT: [INCIDENT #[ID]] - Security Notification

We have identified unusual activity related to [system / account / data].
We are conducting an immediate investigation following our security protocols.

Current actions:
- Investigation initiated at [timestamp UTC]
- Relevant systems isolated / protected
- Security team engaged

We will provide updates as the investigation progresses.
If you suspect any impact to your account, contact [security team] immediately.
```

## Template: Planned Maintenance

```
SUBJECT: [MAINTENANCE #[ID]] - Scheduled Maintenance Notification

We will be performing scheduled maintenance on [service] on:
Date: [YYYY-MM-DD]
Time: [start] - [end] UTC
Expected impact: [service may be unavailable / degraded]

During this window, users may experience:
- [impact 1]
- [impact 2]

We recommend [action for users, if any].
Status page will be updated throughout the maintenance window.
```

## Channel-Specific Versions

| Channel | Length | Key Info | Tone |
|---------|--------|----------|------|
| Status page | 1-3 paragraphs | Full details, technical | Professional, transparent |
| Social media | 1-2 sentences | Acknowledgment + link | Concise, empathetic |
| Email (all users) | 2-3 paragraphs | Scope + action + timeline | Reassuring, clear |
| Email (affected) | 3-4 paragraphs | Personalized, detailed | Direct, apologetic |
| Internal (staff) | Full briefing | Technical details, talking points | Honest, actionable |
| Press/PR | 1 paragraph | Official statement | Controlled, legal-reviewed |

## Best Practices

- Prepare templates for each incident severity level (SEV1-SEV4) in advance
- Legal/PR must pre-approve templates before any incident occurs
- Never speculate about cause or impact — stick to confirmed facts
- Include timestamps in UTC and local timezone for the affected region
- Update holding statement with new information at each communication interval
- Maintain a changelog of what was communicated and when for post-incident review
- For regulatory incidents (data breach), coordinate with legal before any communication
- Train on-call engineers on when to escalate to PR/legal for communication approval
- Store templates in a version-controlled, easily accessible location
- Review and update templates quarterly based on lessons learned from incidents
