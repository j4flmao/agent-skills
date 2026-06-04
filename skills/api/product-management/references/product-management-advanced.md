# API Product Management Advanced Topics

## Advanced Consumer Insights

### Cohort Analysis for API Products
```sql
-- Retention by signup month
SELECT
    DATE_TRUNC('month', first_seen) as cohort_month,
    COUNT(DISTINCT api_key_hash) as cohort_size,
    COUNT(DISTINCT CASE WHEN month_1_active THEN api_key_hash END) * 100.0
        / COUNT(DISTINCT api_key_hash) as retention_m1,
    COUNT(DISTINCT CASE WHEN month_2_active THEN api_key_hash END) * 100.0
        / COUNT(DISTINCT api_key_hash) as retention_m2,
    COUNT(DISTINCT CASE WHEN month_3_active THEN api_key_hash END) * 100.0
        / COUNT(DISTINCT api_key_hash) as retention_m3,
    COUNT(DISTINCT CASE WHEN month_6_active THEN api_key_hash END) * 100.0
        / COUNT(DISTINCT api_key_hash) as retention_m6
FROM consumer_cohorts
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

### Usage Segmentation Engine
```python
class UsageSegmenter:
    SEGMENTS = {
        'power_user': {'min_daily_requests': 1000, 'growth_rate': 1.1, 'active_days': 25},
        'growing': {'min_daily_requests': 100, 'growth_rate': 1.2, 'active_days': 15},
        'steady': {'min_daily_requests': 10, 'active_days': 10},
        'declining': {'min_daily_requests': 10, 'growth_rate': 0.8},
        'dormant': {'max_days_inactive': 30},
        'churned': {'max_days_inactive': 60},
    }

    def segment(self, consumer: dict) -> str:
        days_inactive = consumer['days_since_last_request']
        if days_inactive >= 60: return 'churned'
        if days_inactive >= 30: return 'dormant'

        daily_avg = consumer['requests_last_30d'] / 30
        prev_avg = consumer['requests_prev_30d'] / 30
        growth = daily_avg / prev_avg if prev_avg > 0 else 0

        if daily_avg >= 1000 and growth >= 1.1: return 'power_user'
        if daily_avg >= 100 and growth >= 1.2: return 'growing'
        if daily_avg >= 10 and growth >= 0.9: return 'steady'
        if daily_avg >= 10 and growth < 0.8: return 'declining'
        return 'casual'

    def targeted_action(self, segment: str) -> str:
        actions = {
            'power_user': 'Invite to advisory board, offer enterprise tier',
            'growing': 'Send upgrade offer, suggest webhooks onboarding',
            'steady': 'Monthly newsletter with tips and new features',
            'declining': 'Check-in email, offer support consultation',
            'dormant': 'Re-engagement email with what\'s new',
            'churned': 'Exit survey, win-back campaign after 90 days',
            'casual': 'Nurture with getting-started content',
        }
        return actions.get(segment, 'Monitor')
```

### Churn Prediction Model
```python
class ChurnPredictor:
    RISK_WEIGHTS = {
        'error_rate_7d_above_5pct': 30,
        'latency_p99_above_1000ms': 20,
        'support_tickets_30d_above_3': 25,
        'no_api_call_in_14d': 35,
        'usage_drop_50pct': 25,
        'downgraded_from_paid': 40,
    }

    def risk_score(self, consumer: dict) -> dict:
        score = 0
        factors = []

        if consumer.get('error_rate_7d', 0) > 0.05:
            score += self.RISK_WEIGHTS['error_rate_7d_above_5pct']
            factors.append('High error rate in last 7 days')

        if consumer.get('latency_p99_7d', 0) > 1000:
            score += self.RISK_WEIGHTS['latency_p99_above_1000ms']
            factors.append('High P99 latency')

        if consumer.get('support_tickets_30d', 0) > 3:
            score += self.RISK_WEIGHTS['support_tickets_30d_above_3']
            factors.append('Multiple support tickets')

        if consumer.get('days_since_last_call', 0) > 14:
            score += self.RISK_WEIGHTS['no_api_call_in_14d']
            factors.append('No API calls in 14 days')

        requests_30d = consumer.get('requests_last_30d', 0)
        requests_60d = consumer.get('requests_prev_30d', 1)
        if requests_60d > 0 and requests_30d / requests_60d < 0.5:
            score += self.RISK_WEIGHTS['usage_drop_50pct']
            factors.append('Usage dropped by more than 50%')

        if consumer.get('tier_changed') == 'downgrade':
            score += self.RISK_WEIGHTS['downgraded_from_paid']
            factors.append('Downgraded from paid tier')

        return {
            'risk_score': score,
            'risk_level': 'high' if score >= 70 else 'medium' if score >= 35 else 'low',
            'risk_factors': factors,
            'next_action': self.next_action(score, factors),
        }

    def next_action(self, score: int, factors: list) -> str:
        if score >= 70:
            return 'Executive outreach within 48 hours'
        if score >= 35:
            return 'Automated check-in email with personalized offer'
        return 'Monitor — no action needed'
```

## API SLA Management

### Multi-Tier SLA Framework
```yaml
sla_framework:
  free:
    uptime: 99.9%
    p99_latency: 1000ms
    error_rate: 1%
    support_response: 24 hours
    support_channels: [community, docs]
    credits: none

  pro:
    uptime: 99.95%
    p99_latency: 500ms
    error_rate: 0.5%
    support_response: 4 hours
    support_channels: [email, chat]
    credits: 5% per 0.1% below uptime target
    max_credits: 50%

  enterprise:
    uptime: 99.99%
    p99_latency: 200ms
    error_rate: 0.1%
    support_response: 30 minutes
    support_channels: [dedicated Slack, phone, email]
    support_engineers: 2 dedicated
    credits: 10% per 0.1% below uptime target
    max_credits: 100%
```

### SLA Credit Computation
```python
class SLACreditEngine:
    def compute_monthly_credits(self, tier: str, month: str) -> dict:
        sla = self.get_sla_target(tier)
        uptime = self.measure_monthly_uptime(tier, month)
        if uptime >= sla['uptime']:
            return {'credits_due': 0, 'reason': 'SLA met'}

        shortfall = (sla['uptime'] - uptime) / 0.001  # in 0.1% units
        credit_rate = sla['credit_per_0.1pct']
        max_credits = sla['max_credits']
        credits = min(shortfall * credit_rate, max_credits)

        affected = self.count_affected_consumers(tier, month)
        self.notify_affected(affected, tier, uptime, credits)

        return {
            'month': month,
            'tier': tier,
            'uptime': uptime,
            'target': sla['uptime'],
            'shortfall_pct': round(sla['uptime'] - uptime, 4),
            'credits_due_pct': credits,
            'affected_consumers': len(affected),
        }
```

## API Partnership Programs

### Partner Tier Structure
```yaml
partner_program:
  technology_partner:
    requirements:
      - Active API usage > 6 months
      - Published integration
      - Technical review passed
    benefits:
      - Co-marketing (blog post, webinar)
      - Early access to new features
      - Listing in partner directory
    revenue_share: 0%

  solution_partner:
    requirements:
      - Minimum 10 joint customers
      - Certified developer on staff
      - Annual business review
    benefits:
      - Revenue share (10-20%)
      - Dedicated partner manager
      - Joint roadmap sessions
      - Co-branded case study
    revenue_share: 15%

  strategic_partner:
    requirements:
      - Top 10 revenue-generating partner
      - Joint GTM strategy
      - Executive sponsorship
    benefits:
      - Revenue share (20-30%)
      - Custom SLA (99.995%)
      - Co-development engineering resources
      - Quarterly executive business review
    revenue_share: 25%
```

### Partner Key Management
```python
class PartnerKeyManager:
    def issue_partner_key(self, partner_id: str, tier: str, scopes: list[str]) -> str:
        key = f"partner_{secrets.token_urlsafe(32)}"
        hashed = hashlib.sha256(key.encode()).hexdigest()
        limits = self.get_tier_limits(tier)
        self.db.execute("""
            INSERT INTO partner_keys (key_hash, partner_id, tier, scopes, limits)
            VALUES (?, ?, ?, ?, ?)
        """, [hashed, partner_id, tier, json.dumps(scopes), json.dumps(limits)])
        return key

    def calculate_payout(self, partner_id: str, period_start: str, period_end: str) -> dict:
        rows = self.db.fetchall("""
            SELECT SUM(t.amount) as revenue, p.revenue_share_pct
            FROM transactions t
            JOIN partner_keys pk ON t.key_hash = pk.key_hash
            JOIN partners p ON pk.partner_id = p.id
            WHERE p.id = ? AND t.created_at BETWEEN ? AND ?
            GROUP BY p.id
        """, [partner_id, period_start, period_end])

        if not rows:
            return {'revenue': 0, 'share_pct': 0, 'payout': 0}

        r = rows[0]
        return {
            'revenue': r['revenue'],
            'share_pct': r['revenue_share_pct'],
            'payout': round(r['revenue'] * r['revenue_share_pct'] / 100, 2),
        }
```

## API Marketplace Strategy

### Marketplace Feature Set
```yaml
marketplace_features:
  discovery:
    - Category browsing and search
    - Filter by pricing model, protocol (REST/GraphQL), popularity
    - Rating and review system (1-5 stars, peer reviews)
    - Compare side-by-side

  subscription:
    - One-click subscribe with free trial
    - Automatic API key provisioning
    - Usage-based billing with spend caps
    - Consolidated monthly invoice

  management:
    - Unified dashboard across all subscribed APIs
    - Cross-API analytics (total usage, spend, latency)
    - API key rotation and permissions
    - Webhook management per API
```

### Cross-Selling Analytics
```sql
-- Bundling affinity: which APIs are used together
SELECT
    a.endpoint_group as api_a,
    b.endpoint_group as api_b,
    COUNT(DISTINCT a.consumer_id) as joint_usage,
    COUNT(DISTINCT a.consumer_id) * 100.0 /
        (SELECT COUNT(DISTINCT consumer_id) FROM monthly_usage) as pct_of_platform
FROM monthly_usage a
JOIN monthly_usage b
    ON a.consumer_id = b.consumer_id
    AND a.endpoint_group < b.endpoint_group
WHERE a.month = '2026-06' AND b.month = '2026-06'
GROUP BY a.endpoint_group, b.endpoint_group
HAVING joint_usage >= 10
ORDER BY joint_usage DESC;
```

## Documentation Strategy

### Documentation Architecture
```yaml
documentation_hierarchy:
  getting_started:
    type: tutorial
    audience: new developers
    goal: First API call in under 5 minutes
    includes:
      - Authentication setup
      - Copy-paste curl example
      - SDK quickstart (primary language)

  guides:
    type: task-based
    audience: active developers
    goal: Complete common integration tasks
    includes:
      - Pagination, error handling, webhooks, rate limiting
      - Data model explanations
      - Best practices and anti-patterns

  reference:
    type: auto-generated
    audience: all developers
    source: OpenAPI spec
    includes:
      - Endpoints, parameters, request/response schemas
      - Error codes
      - Rate limits per endpoint

  concepts:
    type: explanation
    audience: technical decision-makers
    goal: Understand architecture and design decisions
    includes:
      - System architecture
      - Data model deep dive
      - Security and compliance
      - SLA definitions

  changelog:
    type: chronological
    audience: all developers
    includes:
      - Breaking changes (with migration guides)
      - New features and endpoints
      - Bug fixes and performance improvements
      - Deprecation notices
```

### Documentation Quality Gates
```yaml
doc_quality_gates:
  automated:
    - Every endpoint has description and request example
    - Every parameter has description and type
    - Every response code documented with example
    - No placeholder text ("TODO", "TBD", "lorem ipsum")
    - OpenAPI spec passes linting (spectral with API style ruleset)

  manual_review:
    - Technical accuracy verified by domain expert
    - All code examples tested and produce valid responses
    - Migration guides include before/after JSON examples
    - Screenshots and diagrams match current UI
    - API reference parity checked against deployed spec
```

## Deprecation Automation

### Automated Sunset Process
```python
class DeprecationAutomation:
    def execute_sunset(self, version: str, sunset_date: str):
        """Execute sunset for a deprecated API version."""
        # 1. Final notification to remaining consumers
        remaining = self.find_active_consumers(version)
        for consumer in remaining:
            self.send_final_warning(
                email=consumer['email'],
                version=version,
                sunset_date=sunset_date,
                migration_url=consumer['migration_guide_url'],
            )

        # 2. Block traffic at sunset date
        if datetime.utcnow() >= datetime.fromisoformat(sunset_date):
            self.db.execute("""
                INSERT INTO sunset_actions (version, action, executed_at)
                VALUES (?, 'gateway_block', NOW())
            """, [version])
            self.update_gateway_config(version, action='block')

        # 3. Verify zero traffic after 7 days
        traffic_check = self.db.fetchone("""
            SELECT COUNT(*) as cnt FROM api_usage
            WHERE version = ? AND timestamp > NOW() - INTERVAL '7 days'
        """, [version])
        if traffic_check['cnt'] == 0:
            self.decommission_infrastructure(version)

    def decommission_infrastructure(self, version: str):
        """Remove DNS, load balancer rules, and infrastructure."""
        self.remove_dns_entries(version)
        self.remove_load_balancer_rules(version)
        self.archive_documentation(version)
        self.remove_monitoring_alerts(version)
        self.archive_api_spec(version)
        self.db.execute("""
            UPDATE api_versions SET status = 'archived'
            WHERE version = ?
        """, [version])
```

## API Product Scorecard

### Weighted Score Computation
```python
class ApiProductScorecard:
    WEIGHTS = {
        'adoption': 0.25,
        'developer_experience': 0.25,
        'reliability': 0.25,
        'business_value': 0.15,
        'documentation': 0.10,
    }

    def compute(self, metrics: dict) -> dict:
        scores = {
            'adoption': self.score_adoption(metrics),
            'developer_experience': self.score_dx(metrics),
            'reliability': self.score_reliability(metrics),
            'business_value': self.score_business(metrics),
            'documentation': self.score_documentation(metrics),
        }
        total = sum(scores[k] * self.WEIGHTS[k] for k in scores)
        return {
            'overall': round(total, 1),
            'breakdown': scores,
            'status': (
                'healthy' if total >= 80
                else 'needs_attention' if total >= 60
                else 'critical'
            ),
            'trend': self.compute_trend(metrics),
        }

    def score_adoption(self, m: dict) -> float:
        score = 0
        if m.get('mad_growth_mom', 0) >= 0.10: score += 40
        elif m.get('mad_growth_mom', 0) >= 0.05: score += 25
        else: score += 10
        if m.get('activation_rate', 0) >= 0.60: score += 30
        elif m.get('activation_rate', 0) >= 0.40: score += 20
        else: score += 10
        if m.get('retention_rate', 0) >= 0.80: score += 30
        elif m.get('retention_rate', 0) >= 0.60: score += 20
        else: score += 10
        return score
```

## Key Points
- Cohort analysis reveals true retention patterns beyond aggregate metrics
- Usage segmentation (power user, growing, steady, declining, dormant, churned) drives targeted engagement
- Churn prediction enables proactive outreach before consumers leave
- SLA management requires precise uptime monitoring and automated credit computation
- Partnership tiers (technology, solution, strategic) create scalable ecosystem growth
- API marketplaces enable cross-selling with unified billing and management
- Documentation architecture serves different audiences: evaluators, implementers, operators
- Automated deprecation handles notification, traffic blocking, and infrastructure decommissioning
- API product scorecard with weighted dimensions provides a single health metric
- Documentation quality gates must combine automated linting and manual SME review

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with API product management, lifecycle standards, DX principles, and governance models.
-->
