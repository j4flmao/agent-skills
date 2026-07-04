# API Launch Playbook

## Overview
An API launch is a go-to-market event that drives developer adoption. Unlike product launches with UI, API launches require developer documentation, SDK readiness, sample code, and community engagement.

## Launch Types

| Type | Effort | Risk | Example |
|------|--------|------|---------|
| New API product | High | High | Launching Payments API |
| New major version | Medium | Medium | v3 API with pagination changes |
| New feature/endpoint | Low | Low | Adding sort to /users |
| Beta/Early Access | Medium | Medium | Preview new API to select partners |

## Launch Timeline

### T-8 Weeks: Internal Preparation
```yaml
tasks:
  - [ ] Define launch goals and success metrics
  - [ ] Identify beta partners (3-5 for controlled launch)
  - [ ] Draft product brief and positioning
  - [ ] Engage developer advocate for content planning
  - [ ] Begin SDK development (at least primary language)
```

### T-6 Weeks: Beta Program
```yaml
tasks:
  - [ ] Onboard beta partners with dedicated Slack channel
  - [ ] Collect feedback weekly — prioritize fixes
  - [ ] Measure beta metrics (TTFC, error rate, feature usage)
  - [ ] Iterate on documentation based on beta confusion points
  - [ ] Write migration guide (if version update)
  - [ ] Write blog post draft
```

### T-4 Weeks: Hardening
```yaml
tasks:
  - [ ] Freeze API surface (no breaking changes after this point)
  - [ ] Complete SDKs for top 3 languages (TS, Python, Go/Java)
  - [ ] Load test to validate performance SLAs
  - [ ] Security review and penetration testing
  - [ ] Finalize pricing and rate limits
  - [ ] Draft changelog entry
```

### T-2 Weeks: Launch Prep
```yaml
tasks:
  - [ ] Documentation review by developer advocate
  - [ ] Quickstart test: new developer follows docs in under 5 min
  - [ ] Status page updated with new API
  - [ ] Analytics dashboards configured
  - [ ] Monitoring alerts configured (error rate, latency)
  - [ ] API added to developer portal catalog
  - [ ] Rollback plan documented
```

### T-0: Launch Day
```yaml
tasks:
  - [ ] Deploy to production
  - [ ] Verify health check and monitoring
  - [ ] Publish blog post and changelog
  - [ ] Announce on community channels (Slack, Twitter, newsletter)
  - [ ] Monitor error rate and latency for first 4 hours
  - [ ] Developer advocate monitors community for questions
  - [ ] On-call engineer available for immediate issues
```

### T+2 Weeks: Post-Launch
```yaml
tasks:
  - [ ] Review launch metrics vs goals
  - [ ] Collect beta partner testimonials
  - [ ] Publish case study with first customer
  - [ ] Retrospective: what went well, what to improve
  - [ ] Plan v2 features based on feedback
  - [ ] Sunset old version if applicable
```

## Launch Checklist

### Pre-Launch Checklist
```yaml
pre_launch_checklist:
  product:
    - [ ] API design reviewed and approved by API council
    - [ ] Pricing and rate limits finalized
    - [ ] SLA documented (uptime, latency, support)
    - [ ] Deprecation policy defined
    - [ ] Launch goals documented with success metrics

  technical:
    - [ ] API deployed to production
    - [ ] Load testing passed (2x expected peak traffic)
    - [ ] Security review completed (pen test, auth audit)
    - [ ] Rate limiting configured and tested
    - [ ] Monitoring dashboards active
    - [ ] Alert thresholds configured
    - [ ] Rollback plan tested
    - [ ] Error tracking configured (Sentry, Datadog)

  documentation:
    - [ ] OpenAPI spec complete and spectral-lint passes
    - [ ] Getting started guide with copy-paste example
    - [ ] Authentication documentation
    - [ ] Error handling guide with all error codes
    - [ ] SDK quickstart in at least TypeScript and Python
    - [ ] Migration guide (if version update)
    - [ ] Changelog entry drafted
    - [ ] Interactive docs deployed (Stoplight, Redoc, or ReadMe)

  marketing:
    - [ ] Blog post drafted and reviewed
    - [ ] Social media posts prepared
    - [ ] Newsletter announcement drafted
    - [ ] Community forum post drafted
    - [ ] Partner notification email prepared
```

### Launch Day Checklist
```yaml
launch_day:
  deploy:
    - [ ] Deploy API changes to production
    - [ ] Verify health check endpoint returns 200
    - [ ] Execute test queries against production
    - [ ] Confirm monitoring data flowing

  communicate:
    - [ ] Publish blog post
    - [ ] Post to community (Slack, forum)
    - [ ] Send newsletter (if applicable)
    - [ ] Social media announcements
    - [ ] Notify existing partners

  monitor:
    - [ ] Check error rate every 15 min for first hour
    - [ ] Check latency every 15 min for first hour
    - [ ] Monitor support channels for questions
    - [ ] Watch for unexpected usage patterns
```

## Launch Metrics

### Success Metrics by Launch Type
```yaml
new_api:
  primary:
    - Active developers (MAD) in first 30 days
    - Time to first call (TTFC)
    - Developer NPS from beta participants
  secondary:
    - API revenue (if monetized)
    - Partner integrations built
    - Community engagement (forum posts, GitHub stars)

  targets:
    ideal: "100+ active devs, TTFC < 5 min, NPS > 40"
    acceptable: "50+ active devs, TTFC < 10 min, NPS > 30"
    minimum: "20+ active devs, documented feedback from 5+ devs"

new_version:
  primary:
    - Migration rate (% of consumers migrated)
    - New version adoption in first 90 days
    - Old version traffic decline
  secondary:
    - Developer satisfaction with new features
    - Support ticket volume comparison

  targets:
    ideal: "80% migrated in 90 days, TTFC < 3 min"
    acceptable: "50% migrated in 90 days"
    minimum: "All new signups use new version"

new_feature:
  primary:
    - Feature adoption rate (% of consumers using it)
    - Feature-specific error rate
  secondary:
    - Support ticket volume related to feature

  targets:
    ideal: "60% adoption in 30 days, error rate < 0.5%"
    acceptable: "30% adoption in 30 days"
    minimum: "No critical bugs reported"
```

### Launch Health Dashboard
```python
class LaunchDashboard:
    def check_launch_health(self, launch_id: str, since: str) -> dict:
        metrics = self.db.fetchone("""
            SELECT
                COUNT(DISTINCT api_key_hash) as active_devs,
                AVG(ttfc_seconds) as avg_ttfc,
                AVG(CASE WHEN status >= 500 THEN 1 ELSE 0 END) * 100 as error_rate,
                COUNT(*) as total_requests,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_latency
            FROM launch_metrics
            WHERE launch_id = ? AND timestamp > ?
        """, [launch_id, since])

        alerts = []
        if metrics['error_rate'] > 1:
            alerts.append(f"Error rate {metrics['error_rate']:.1f}% exceeds 1% threshold")
        if metrics['p99_latency'] > 500:
            alerts.append(f"P99 latency {metrics['p99_latency']}ms exceeds 500ms threshold")
        if metrics['active_devs'] == 0:
            alerts.append("No active developers — verify API is reachable")

        return {
            'launch_id': launch_id,
            'active_developers': metrics['active_devs'],
            'avg_ttfc_seconds': metrics['avg_ttfc'],
            'error_rate_pct': round(metrics['error_rate'], 2),
            'p99_latency_ms': metrics['p99_latency'],
            'total_requests': metrics['total_requests'],
            'alerts': alerts,
            'health': 'good' if len(alerts) == 0 else 'attention',
        }
```

## Post-Launch Retrospective

### Retrospective Template
```yaml
launch_retrospective:
  launch: "Payments API v1"
  date: "2026-06-01"

  against_goals:
    goal_1: "100 active developers in 30 days"
    result: "87 active developers"
    assessment: "Close — missed due to Python SDK delay"
    action: "Prioritize Python SDK for next launch"

    goal_2: "TTFC < 5 minutes"
    result: "3.2 minutes"
    assessment: "Exceeded — interactive docs are working"
    action: "Apply same interaction pattern to existing APIs"

    goal_3: "NPS > 40"
    result: "NPS 52"
    assessment: "Exceeded — beta program feedback was critical"
    action: "Always run beta for new API launches"

  what_went_well:
    - Interactive API reference with try-it-out
    - Beta partner program (caught 3 critical issues pre-launch)
    - Monitoring and alerting configured pre-launch
    - Quickstart guide that new developers followed in under 3 min

  what_could_be_better:
    - Python SDK launched 2 weeks after GA (caused 30% activation drop)
    - Migration guide for existing v1 users was confusing
    - Blog post delayed 3 days (missed launch day traffic spike)
    - Error rate alert threshold too sensitive (false positives)

  action_items:
    - [ ] P0: Ship Python SDK within 2 weeks
    - [ ] P1: Revise migration guide with before/after examples
    - [ ] P2: Pre-write blog posts for all future launches
    - [ ] P1: Tune error rate alert threshold to 1% over 5 min
```

## Key Points
- API launches follow an 8-week timeline: preparation → beta → hardening → launch prep → launch
- Beta programs catch critical issues before GA — always run for new APIs
- Launch health dashboard tracks active devs, TTFC, error rate, and latency in real-time
- Documentation readiness (OpenAPI linted, quickstart tested, migration guide written) is a launch gate
- Primary SDK (TypeScript) + secondary SDK (Python) coverage is minimum for launch
- Post-launch retrospective compares results against pre-defined goals
- Launch day requires dedicated monitoring (error rate, latency, support channels) for first 4 hours
- Migration rate is the primary success metric for new API versions
- Feature adoption rate measures success of new endpoint/feature launches
- Launch metrics should have ideal, acceptable, and minimum thresholds defined pre-launch

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with API product management, lifecycle standards, DX principles, and governance models.
-->
