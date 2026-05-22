# Event Taxonomy

## Naming Convention

### Pattern
```
{domain}.{entity}.{action}_{context}
```

### Examples
```
billing.subscription.upgraded_from_trial
workspace.document.created
workspace.document.shared_via_link
team.member.invited_accepted
settings.profile.updated
notification.email.opened
search.query.submitted
onboarding.tutorial.completed
```

### Rules
- Use lowercase with dots as separators
- Use past tense for completed actions
- Underscore before context/modifier
- Max 4 segments per event name
- No special characters except dots and underscores

## Event Properties

### Global Properties (every event)
```
user_id: string (anonymous or identified)
session_id: string (UUID)
timestamp: ISO 8601
app_version: semver
platform: web | ios | android
os: string
browser: string
device_type: desktop | mobile | tablet
```

### Domain Properties (per domain)
```
Domain: billing
  plan: string (free, pro, enterprise)
  amount: number
  currency: string
  interval: monthly | annual
  previous_plan: string

Domain: workspace
  workspace_id: string
  document_id: string
  member_count: number
  feature_used: string

Domain: onboarding
  step_name: string
  step_number: int
  total_steps: int
  time_spent_seconds: number
  skipped: boolean
```

### Identity Properties (user profile)
```
email: string (hashed)
signup_date: date
plan: string
referral_source: string
cohort_date: date
```

## Event Types

### User Actions
```
click, view, submit, create, update, delete, share, invite,
accept, complete, skip, dismiss, download, upload, play, pause
```

### System Events
```
error, sync_started, sync_completed, notification_sent,
email_delivered, email_bounced, job_completed, import_finished
```

### Session Events
```
session_started, session_ended, page_viewed, navigation,
idle_timeout, session_expired
```

## Tracking Implementation

### Client-Side (Web)
```javascript
analytics.track('workspace.document.created', {
  document_id: 'doc_123',
  document_type: 'doc',
  workspace_id: 'ws_456',
  source: 'template'
});
```

### Server-Side (API)
```javascript
analytics.track({
  event: 'billing.subscription.upgraded',
  userId: 'user_789',
  properties: {
    previous_plan: 'free',
    new_plan: 'pro',
    amount: 29.99,
    interval: 'monthly'
  }
});
```

## Data Quality Checks

### Daily Monitoring
```
Event volume: ±10% day-over-day
Property completeness: >95%
Property data types: match schema
User ID consistency: <2% anonymous
Event timing: timestamps within 5min of ingestion
```

### Schema Enforcement
```
Required properties per event type validated at ingest
Unknown events flagged for review
Property type mismatches rejected with warning
Volume anomalies triggered alert to data team
```
