# Product Analytics Tools and Implementation

## Platform Selection Guide

### Analytics Platform Comparison

| Feature | Amplitude | Mixpanel | PostHog | Heap | Pendo | Google Analytics 4 |
|---------|-----------|----------|---------|------|-------|-------------------|
| Event tracking | Yes | Yes | Yes | Auto-capture | Yes | Yes |
| Funnel analysis | Yes | Yes | Yes | Yes | Yes | Basic |
| Retention cohorts | Yes | Yes | Yes | Yes | Yes | Basic |
| Segmentation | Advanced | Advanced | Advanced | Basic | Moderate | Basic |
| User profiles | Yes | Yes | Yes | Yes | Yes | Limited |
| Session recording | No | No | Yes | No | No | No |
| Feature flags | No | No | Yes | No | Yes (limited) | No |
| A/B testing | Yes | No | Yes | No | Yes (limited) | Yes |
| Data warehouse | Limited | Limited | Full export | Limited | Limited | BigQuery |
| Self-hosted | No | No | Yes | No | No | No |
| Free tier | Yes (limited) | Yes (limited) | Yes (self-hosted) | Limited | No | Yes |
| Starting price (paid) | $995/mo | $1,000/mo | $0 (self) / $1K+ (cloud) | Custom | Custom | Free |
| Best for | Product-led growth | Product analytics | Startups, privacy | Auto-tracking | Product + guides | Web analytics |

### Selection Criteria Matrix

| Factor | Weight | Considerations |
|--------|--------|----------------|
| Data privacy requirements | High | Self-hosted (PostHog) vs cloud; data residency |
| Engineering resources | Medium | Auto-capture (Heap) vs manual (Amplitude) |
| Feature needs | High | Session recording, A/B testing, feature flags |
| Budget | High | Free tier capabilities, scaling costs |
| Team size | Medium | Self-serve vs need CS-led onboarding |
| Data volume | High | Per-event pricing can scale unexpectedly |
| Integration requirements | Medium | Data warehouse, CRM, support tool integrations |
| Analytics maturity | Medium | Advanced vs basic feature needs |
| Migration complexity | High | Ease of switching from current tool |

### Platform Migration Considerations

When migrating between analytics platforms:

1. Audit current events and properties
2. Map to new platform's event model
3. Set up parallel tracking (send to both old and new)
4. Validate data parity between platforms
5. Train team on new platform
6. Migrate dashboards and reports
7. Deprecate old platform after validation period (2-4 weeks)

Common migration challenges:
- Different naming conventions require event mapping
- User identity systems differ (device ID vs user ID vs anonymous ID)
- Historical data is rarely portable
- Team needs retraining on new tool
- Dashboard recreation is time-consuming

## Event Tracking Implementation

### Event Specification Document

Every tracked event must be specified in a shared document:

```yaml
Event: billing.subscription.created
Description: Fires when a user successfully creates a new subscription
Trigger: User completes subscription checkout flow
Category: user_action

Properties:
  - name: plan_tier
    type: string
    description: The pricing plan selected
    enum: [free, starter, pro, enterprise]
    required: true

  - name: billing_cycle
    type: string
    description: Monthly or annual billing
    enum: [monthly, annual]
    required: true

  - name: price
    type: number
    description: The price charged in cents
    required: true

  - name: currency
    type: string
    description: ISO 4217 currency code
    default: USD
    required: true

  - name: coupon_code
    type: string
    description: Discount code applied (if any)
    required: false

  - name: source_page
    type: string
    description: The page from which the subscription was created
    required: false

Platform: web, ios, android
Version: 1.0
Owner: payments-team
```

### Naming Convention Best Practices

| Convention | Example | Notes |
|------------|---------|-------|
| snake_case | billing.subscription.created | Common in analytics tools |
| dot notation | billing.subscription.created | Indicates hierarchy; enables wildcard queries |
| Past tense verb | created, upgraded, cancelled | Event is past-tense; it happened |
| Entity-action | subscription.created | Object then action |
| Domain prefix | billing.subscription.created | Avoids collisions across teams |

### Event Categories

| Category | Description | Examples |
|----------|-------------|----------|
| user_action | Direct user interaction | button.clicked, form.submitted, page.viewed |
| system_event | Automatic system behavior | notification.sent, sync.completed, error.thrown |
| session_event | Session lifecycle | session.started, session.ended |
| business_event | Business process events | invoice.generated, subscription.renewed |
| experiment_event | A/B test events | experiment.enrolled, variant.viewed |
| lifecycle_event | User lifecycle events | user.registered, user.activated, user.churned |

### Common Tracking Events by Product Stage

| Stage | Events to Track |
|-------|----------------|
| Acquisition | page.viewed, signup.started, signup.completed, signup.failed, signup.source |
| Onboarding | onboarding.started, onboarding.step_completed, onboarding.skipped, onboarding.dropped_off |
| Activation | activation.milestone_reached, first_core_action.completed |
| Engagement | session.started, core_action.completed, feature.used, content.viewed |
| Retention | session.started, user.returned, notification.opened |
| Revenue | subscription.created, payment.completed, payment.failed, plan.upgraded, plan.downgraded |
| Referral | referral.invite_sent, referral.invite_opened, referral.invite_accepted |
| Churn | cancellation.started, cancellation.reason, subscription.ended |

### Property Types

```yaml
# User properties (set once, persist)
user:
  - plan_tier: string
  - account_age_days: number
  - region: string
  - user_role: string
  - signup_source: string
  - total_sessions: number

# Event properties (specific to each event)
event:
  - name: string
  - value: number
  - currency: string
  - source_screen: string
  - error_type: string
  - duration_ms: number

# Session properties (set per session)
session:
  - utm_source: string
  - utm_campaign: string
  - utm_medium: string
  - device_type: string
  - browser: string
  - os: string
  - referrer: string
  - session_id: string

# Object properties (dynamically associated)
object:
  - project_id: string
  - document_id: string
  - team_id: string
  - item_id: string
```

### Global Properties (Sent With Every Event)

```yaml
global:
  - user_id: string
    description: Unique identifier for the user
    required: true

  - anonymous_id: string
    description: Device or browser-generated ID before identification
    required: true

  - session_id: string
    description: Unique session identifier
    required: true

  - timestamp: datetime
    description: ISO 8601 timestamp of the event
    required: true

  - app_version: string
    description: Current app version
    required: true

  - platform: string
    description: web, ios, android
    required: true

  - event_id: string
    description: Unique event identifier for deduplication
    required: false

  - user_agent: string
    description: Browser user agent string
    required: false

  - locale: string
    description: User's locale setting
    required: false
```

## SDK Implementation

### Web SDK Implementation (Amplitude Example)

```javascript
import * as amplitude from '@amplitude/analytics-browser';

// Initialize
amplitude.init('API_KEY', {
  defaultTracking: {
    pageViews: true,
    sessions: true,
    formInteractions: false,
    fileDownloads: false,
  },
  identityStorage: 'localStorage',
});

// Identify user
amplitude.setUserId('user_12345');
amplitude.setUserProperties({
  plan_tier: 'pro',
  account_age_days: 45,
});

// Track event
amplitude.track('billing.subscription.created', {
  plan_tier: 'pro',
  billing_cycle: 'monthly',
  price: 2900,
  currency: 'USD',
  source_page: '/pricing',
});

// Track with groups (for B2B)
amplitude.setGroup('company', 'company_abc');
amplitude.track('team.invite.sent', {
  role: 'admin',
  invite_count: 3,
});
```

### Mobile SDK Implementation (iOS Example)

```swift
import AmplitudeSwift

let amplitude = Amplitude(configuration: Configuration(
    apiKey: "API_KEY",
    flushInterval: 30
))

amplitude.track(event: BaseEvent(
    eventType: "billing.subscription.created",
    eventProperties: [
        "plan_tier": "pro",
        "billing_cycle": "monthly",
        "price": 2900
    ]
))

amplitude.identify(userId: "user_12345")
amplitude.track(event: BaseEvent(
    eventType: "onboarding.step_completed",
    eventProperties: ["step_name": "profile_setup"]
))
```

### Segment SDK Middleware Approach

Using a CDP like Segment decouples tracking from analytics tools:

```javascript
// Track once, send to multiple destinations
analytics.track('Subscription Created', {
  planTier: 'pro',
  billingCycle: 'monthly',
  price: 2900,
  currency: 'USD',
});

// Destinations configured in Segment UI:
// - Amplitude
// - Mixpanel
// - Google Analytics
// - Data warehouse (Snowflake, Redshift)
// - Customer.io (for triggered emails)
```

### Custom Event Wrapper

```javascript
class AnalyticsService {
  constructor(provider) {
    this.provider = provider;
  }

  track(eventName, properties = {}) {
    const enhancedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
    };

    this.provider.track(eventName, enhancedProperties);
    this.validateEvent(eventName, enhancedProperties);
  }

  identify(userId, traits = {}) {
    this.provider.identify(userId, traits);
  }

  validateEvent(eventName, properties) {
    const spec = this.eventSpecs[eventName];
    if (!spec) {
      console.warn(`Event ${eventName} is not in spec`);
      return;
    }

    spec.required.forEach(prop => {
      if (!(prop in properties)) {
        console.error(`Missing required property: ${prop} for event: ${eventName}`);
      }
    });
  }
}
```

## Data Quality and Validation

### Data Quality Checks

| Check | Frequency | Method | Action on Failure |
|-------|-----------|--------|-------------------|
| Event volume anomaly | Daily | Compare to 7-day rolling average | Alert data team |
| Missing required properties | Real-time | Validate against spec | Log error, track in monitoring |
| Invalid enum values | Real-time | Validate against allowed values | Reject or transform event |
| Bot detection | Daily | Filter known bot patterns | Exclude from analytics |
| Identity resolution | Daily | Check user_id/anonymous_id consistency | Alert on mismatches |
| Duplicate events | Daily | Deduplicate by event_id | Remove duplicates from analysis |
| Platform breakdown | Daily | Check expected platform distribution | Investigate platform-specific issues |
| Property type mismatch | Real-time | Validate types against spec | Log error |
| Slow tracking responses | Real-time | Monitor API response times | Alert engineering |
| Data freshness | Hourly | Check latest event timestamp | Alert on data pipeline delay |

### Automated Validation Script

```javascript
async function validateEvent(event, spec) {
  const errors = [];

  // Check required properties
  for (const prop of spec.required) {
    if (!(prop in event.properties)) {
      errors.push(`Missing required property: ${prop}`);
    }
  }

  // Check property types
  for (const [prop, value] of Object.entries(event.properties)) {
    const propSpec = spec.properties[prop];
    if (!propSpec) continue;

    if (propSpec.type === 'string' && typeof value !== 'string') {
      errors.push(`Property ${prop} should be string, got ${typeof value}`);
    }

    if (propSpec.enum && !propSpec.enum.includes(value)) {
      errors.push(`Property ${prop} has invalid value: ${value}`);
    }
  }

  // Check naming convention
  const eventNameRegex = /^[a-z]+\.[a-z]+\.[a-z_]+$/;
  if (!eventNameRegex.test(event.event_type)) {
    errors.push(`Event name ${event.event_type} does not follow convention`);
  }

  if (errors.length > 0) {
    await logValidationError(event, errors);
    return false;
  }

  return true;
}
```

### Logging and Alerting

```javascript
class AnalyticsMonitor {
  constructor() {
    this.metrics = {
      eventsTracked: 0,
      errors: 0,
      volumeByEvent: {},
    };
  }

  logEvent(eventName) {
    this.metrics.eventsTracked++;
    this.metrics.volumeByEvent[eventName] =
      (this.metrics.volumeByEvent[eventName] || 0) + 1;
  }

  checkAnomalies() {
    for (const [event, count] of Object.entries(this.metrics.volumeByEvent)) {
      const baseline = this.baselines[event];
      if (baseline && Math.abs(count - baseline) / baseline > 0.5) {
        this.alert({
          type: 'volume_anomaly',
          event,
          current: count,
          baseline,
        });
      }
    }
  }
}
```

## Dashboard Implementation

### Dashboard Tool Comparison

| Tool | Best For | Data Sources | Sharing | Interactivity | Pricing |
|------|----------|-------------|---------|---------------|---------|
| Amplitude | Product analytics | Amplitude events | Public links | Drill-down, segmentation | Included |
| Mixpanel | Product analytics | Mixpanel events | Public links | Segmentation, funnels | Included |
| Metabase | SQL-based | Any SQL database | Email, public | Simple filters | Free |
| Looker | Enterprise BI | Data warehouse | Embedded, scheduled | Advanced drill-down | Paid ($$$) |
| Tableau | Visual analytics | Multiple sources | Server, public | Advanced exploration | Paid ($$$) |
| Power BI | Microsoft ecosystem | Multiple sources | Microsoft 365 | Power Query | Paid ($) |
| Redash | SQL-based | Multiple sources | Public, scheduled | Parameterized queries | Open source |
| Superset | Open source BI | SQL databases | Embedded | Advanced charts | Open source |
| Grafana | Real-time monitoring | Time-series DB | Public, alerts | Real-time dashboards | Open source / paid |

### Dashboard Implementation Process

1. Identify audience and their decisions
2. Select metrics that inform those decisions
3. Design layout with most important metrics top-left
4. Connect data sources
5. Build visualizations
6. Add context: comparisons, targets, annotations
7. Test with audience
8. Iterate based on feedback
9. Schedule automated delivery (email, Slack)
10. Maintain: update as metrics or data sources change

### Dashboard Best Practices

| Practice | Implementation |
|----------|----------------|
| Mobile-first design | Ensure dashboards are readable on mobile devices |
| Consistent date ranges | Use same time periods across all charts |
| Color meaning | Green = good, Red = bad, Gray = neutral |
| Annotation of events | Mark releases, campaigns, incidents on charts |
| Target lines | Show goal targets on charts |
| Sparklines | Mini trends next to numbers for direction context |
| Hierarchical navigation | Summary → Detail → Raw data drill-down |
| Export capability | Allow export to CSV, PDF, or scheduled email |
| Refreshed data | Show last updated timestamp |
| Minimal colors | Limit to 5-6 colors in any dashboard |

## Identity Resolution

### Identity Resolution Strategies

| Strategy | Description | Best For | Complexity |
|----------|-------------|----------|------------|
| User ID only | Requires login before tracking | Enterprise/B2B | Low |
| Anonymous ID + User ID | Track before login, merge after | Consumer/B2C | Medium |
| Device graph | Cross-device matching via algorithm | Multi-device products | High |
| Email-based | Use hashed email as identifier | Email-centric products | Medium |
| Cookie-based | Browser cookie for anonymous ID | Web-only products | Low |
| Account-level | Group users by account/company | B2B with team accounts | Medium |

### Identity Resolution Implementation

```javascript
// Identify anonymous user on page load
const anonymousId = getCookie('analytics_anonymous_id') || generateUUID();
setCookie('analytics_anonymous_id', anonymousId);

analytics.identify(anonymousId, {
  is_anonymous: true,
});

// When user logs in, merge anonymous session with identified user
function onUserLogin(userId, userTraits) {
  analytics.identify(userId, {
    ...userTraits,
    previous_anonymous_id: anonymousId,
  });

  analytics.track('user.logged_in', {
    user_id: userId,
  });
}
```

This merge enables:
- Tracking pre-login behavior (onboarding, signup flow)
- Connecting pre and post-login sessions
- Accurate attribution of first touch
- Complete user journey analysis

## Data Warehouse Integration

### Export Strategies

| Strategy | Method | Latency | Complexity |
|----------|--------|---------|------------|
| Direct export | Tool-native export (Amplitude Data, Mixpanel Warehousing) | 1-24 hours | Low |
| Streaming export | Real-time pipeline (Kafka, Kinesis) | Near real-time | High |
| CDP pipeline | Segment, mParticle → warehouse | 1-4 hours | Medium |
| Batch ETL | Scheduled extract (Airflow, dbt) | 6-24 hours | Medium |
| Reverse ETL | Warehouse → analytics tool (Census, Hightouch) | Real-time to daily | Medium |

### Schema Design for Analytics Data Warehouse

```sql
-- Events table (fact table)
CREATE TABLE analytics.events (
  event_id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  anonymous_id VARCHAR(255),
  session_id VARCHAR(255),
  event_name VARCHAR(255),
  event_properties JSONB,
  user_properties JSONB,
  event_timestamp TIMESTAMP,
  platform VARCHAR(50),
  app_version VARCHAR(50),
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (dimension table)
CREATE TABLE analytics.users (
  user_id VARCHAR(255) PRIMARY KEY,
  first_seen_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  signup_source VARCHAR(255),
  plan_tier VARCHAR(50),
  user_role VARCHAR(50),
  region VARCHAR(50),
  total_sessions INTEGER,
  total_events INTEGER,
  first_utm_source VARCHAR(255),
  updated_at TIMESTAMP
);

-- Sessions table
CREATE TABLE analytics.sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  event_count INTEGER,
  utm_source VARCHAR(255),
  utm_campaign VARCHAR(255),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100)
);
```

## Tool-Specific Implementation Guides

### Amplitude Implementation

Key concepts:
- Events: Actions users take (with properties)
- User properties: Attributes of users
- Groups: B2B account-level grouping
- Identifiy: Set user identity
- Revenue: Track revenue events

Setup checklist:
- Create project in Amplitude
- Install SDK (web, iOS, Android)
- Configure default tracking (page views, sessions)
- Implement custom event tracking
- Set up user identify
- Configure group tracking (for B2B)
- Test in debug mode
- Validate data in Amplitude
- Create initial dashboards

### Mixpanel Implementation

Key concepts:
- Events: Actions users take
- People: User profiles with properties
- Groups: Account-level grouping
- Identify: User identity
- Alias: Merge anonymous and identified users

Setup checklist:
- Create project in Mixpanel
- Install SDK
- Implement tracking
- Set up identity management
- Create initial reports
- Set up data export (if needed)

### PostHog Implementation

Key concepts:
- Events: Actions users take
- Persons: User profiles
- Groups: Organization-level grouping
- Feature flags: Toggle features for user segments
- Session recording: Record user sessions
- Experiments: A/B testing

Setup checklist:
- Deploy PostHog (cloud or self-hosted)
- Install SDK
- Implement tracking
- Configure session recording
- Set up feature flags
- Enable experiments
- Configure data export

### Heap Implementation

Key concepts:
- Auto-capture: Events captured automatically
- Events: Defined retroactively from auto-captured data
- Users: Identified or anonymous
- Virtual events: Events defined by rules on captured data

Setup checklist:
- Create Heap project
- Install snippet (auto-capture starts immediately)
- Define virtual events for specific tracking needs
- Set up user identity
- Create dashboards
- Review auto-captured data quality

## A/B Testing Integration

### Analytics Tool as Experimentation Platform

When using analytics tool for A/B testing:

```javascript
// Amplitude Experiment
const experiment = await amplitude.experiment.fetch();

if (experiment['new-pricing-page'] === 'treatment') {
  showNewPricingPage();
  amplitude.track('experiment.enrolled', {
    experiment_name: 'new-pricing-page',
    variant: 'treatment',
  });
} else {
  showControlPricingPage();
}

// Track conversion
function onSignup() {
  amplitude.track('experiment.conversion', {
    experiment_name: 'new-pricing-page',
    variant: experiment['new-pricing-page'],
  });
}
```

### Statistical Significance Requirements

| Parameter | Recommendation |
|-----------|---------------|
| Significance level (alpha) | 0.05 |
| Statistical power (1 - beta) | 0.80 |
| Minimum detectable effect | 5-10% relative change |
| Minimum sample size | Calculator based on MDE |
| Minimum runtime | 2 weeks (to capture weekly cycles) |
| Multiple comparisons correction | Bonferroni or Holm-Bonferroni |

## Privacy and Compliance

### Data Privacy Requirements

| Requirement | Implementation |
|-------------|----------------|
| PII exclusion | Never track name, email, phone, address in event properties |
| IP anonymization | Truncate or anonymize IP addresses |
| Cookie consent | Respect user opt-out preferences |
| Data retention | Set retention periods (e.g., 24 months) |
| User deletion | Implement user data deletion on request |
| Data processing agreement | Sign DPA with analytics provider |
| Data residency | Choose server location (EU, US, etc.) |
| Consent management | Integrate with CMP (Cookiebot, OneTrust) |
| Do Not Track | Respect DNT browser headers |
| GDPR compliance | Anonymize data, provide opt-out, right to deletion |

### Privacy-Compliant Tracking Code

```javascript
class PrivacyCompliantAnalytics {
  constructor(provider) {
    this.provider = provider;
    this.userConsent = {
      analytics: false,
      marketing: false,
    };
  }

  setConsent(categories) {
    this.userConsent = { ...this.userConsent, ...categories };
    if (this.userConsent.analytics) {
      this.provider.optIn();
    } else {
      this.provider.optOut();
    }
  }

  track(eventName, properties = {}) {
    if (!this.userConsent.analytics) return;

    // Strip PII
    const safeProperties = this.stripPII(properties);
    this.provider.track(eventName, safeProperties);
  }

  stripPII(properties) {
    const piiFields = ['email', 'phone', 'name', 'address', 'ssn'];
    return Object.fromEntries(
      Object.entries(properties).filter(
        ([key]) => !piiFields.includes(key)
      )
    );
  }

  async deleteUserData(userId) {
    // Initiate deletion from analytics provider
    await this.provider.deleteUserData(userId);
    this.track('user.data_deletion_requested');
  }
}
```

## Implementation Checklist

### Pre-Implementation
- [ ] Analytics platform selected and account created
- [ ] Event taxonomy defined and documented
- [ ] Event naming convention established
- [ ] Required global properties defined
- [ ] User identity resolution strategy defined
- [ ] Privacy and consent requirements documented

### SDK Implementation
- [ ] SDK installed for each target platform
- [ ] Global properties configured (user_id, session_id, version, etc.)
- [ ] User identification implemented (login/logout)
- [ ] Core user action events implemented
- [ ] System events implemented (errors, sync, etc.)
- [ ] Screen/page view tracking enabled
- [ ] Identity merge implemented (anonymous to identified)

### Testing and Validation
- [ ] Events verified in debug/live view
- [ ] Required properties validated for all events
- [ ] Property types and enums validated
- [ ] Event volume checked (no unexpected spikes or silences)
- [ ] Cross-platform events verified (same event on web + mobile)
- [ ] User identity merge tested
- [ ] Privacy controls verified (opt-in/opt-out)

### Dashboard and Reporting
- [ ] First dashboard created with key metrics
- [ ] Funnels defined for key user journeys
- [ ] Retention cohorts configured
- [ ] North Star metric dashboard created
- [ ] AARRR metrics mapped and tracked
- [ ] Dashboard shared with stakeholders
- [ ] Automated data quality alerts configured

### Ongoing
- [ ] Data quality checks running daily
- [ ] Event taxonomy reviewed quarterly
- [ ] Unused events pruned
- [ ] Dashboard usage reviewed monthly
- [ ] New features instrumented before launch
- [ ] Privacy compliance reviewed quarterly
- [ ] Team trained on new analytics capabilities
