# Compliance and Analytics

## Overview
SMS messaging compliance covers telecommunications regulations, data privacy laws, and industry standards across different jurisdictions. Analytics provide visibility into message delivery rates, cost efficiency, customer engagement, and compliance adherence.

## Regulatory Framework

### Global Regulations

```python
from enum import Enum
from dataclasses import dataclass, field

class RegulatoryRegion(Enum):
    US = "us"
    EU = "eu"  
    UK = "uk"
    INDIA = "india"
    UAE = "uae"
    SINGAPORE = "singapore"
    AUSTRALIA = "australia"
    BRAZIL = "brazil"

@dataclass
class RegulatoryRequirement:
    region: RegulatoryRegion
    requires_opt_in: bool = True
    requires_opt_out: bool = True
    opt_out_keyword: str = "STOP"
    max_messages_per_day: int = 0
    restricted_hours: tuple[int, int] | None = None
    requires_sender_id_registration: bool = False
    message_retention_days: int = 365
    dlt_registration_required: bool = False

class ComplianceRegistry:
    REGULATIONS = {
        RegulatoryRegion.US: RegulatoryRequirement(
            region=RegulatoryRegion.US,
            requires_opt_in=True,
            requires_opt_out=True,
            max_messages_per_day=0,
            message_retention_days=365
        ),
        RegulatoryRegion.EU: RegulatoryRequirement(
            region=RegulatoryRegion.EU,
            requires_opt_in=True,
            requires_opt_out=True,
            restricted_hours=(21, 8),
            message_retention_days=730
        ),
        RegulatoryRegion.INDIA: RegulatoryRequirement(
            region=RegulatoryRegion.INDIA,
            requires_opt_in=True,
            requires_opt_out=True,
            max_messages_per_day=3,
            dlt_registration_required=True,
            message_retention_days=365
        ),
        RegulatoryRegion.UAE: RegulatoryRequirement(
            region=RegulatoryRegion.UAE,
            requires_opt_in=True,
            requires_sender_id_registration=True,
            message_retention_days=730
        )
    }

    @classmethod
    def get_requirements(cls, region: RegulatoryRegion) -> RegulatoryRequirement:
        return cls.REGULATIONS.get(region, cls.REGULATIONS[RegulatoryRegion.US])
```

## Opt-In and Opt-Out Management

```python
class ConsentManager:
    def __init__(self, db_session):
        self.db = db_session

    async def record_opt_in(self, phone: str, channel: str,
                             source: str, ip: str):
        query = """
            INSERT INTO sms_consent
                (phone, channel, source, ip_address,
                 consent_type, consented_at, expires_at)
            VALUES ($1, $2, $3, $4, 'opt_in', NOW(),
                    NOW() + INTERVAL '2 years')
            ON CONFLICT (phone, channel)
            DO UPDATE SET revoked_at = NULL,
                          consented_at = NOW(),
                          expires_at = NOW() + INTERVAL '2 years'
        """
        await self.db.execute(query, phone, channel, source, ip)

    async def record_opt_out(self, phone: str, channel: str,
                              source: str):
        query = """
            UPDATE sms_consent
            SET revoked_at = NOW(), revoked_source = $3
            WHERE phone = $1 AND channel = $2 AND revoked_at IS NULL
        """
        await self.db.execute(query, phone, channel, source)

    async def has_consent(self, phone: str, channel: str) -> bool:
        query = """
            SELECT COUNT(1) FROM sms_consent
            WHERE phone = $1 AND channel = $2
            AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > NOW())
        """
        result = await self.db.fetchval(query, phone, channel)
        return result > 0

    async def get_consent_status(self, phone: str) -> list[dict]:
        query = """
            SELECT channel, consented_at, revoked_at,
                   source, expires_at
            FROM sms_consent
            WHERE phone = $1
            ORDER BY consented_at DESC
        """
        rows = await self.db.fetch(query, phone)
        return [dict(r) for r in rows]

class OptOutKeywordHandler:
    STOP_KEYWORDS = {"STOP", "STOPALL", "UNSUBSCRIBE",
                      "CANCEL", "END", "QUIT"}
    START_KEYWORDS = {"START", "YES", "UNSTOP", "CONTINUE"}

    def __init__(self, consent_manager: ConsentManager,
                 channel: str):
        self.consent = consent_manager
        self.channel = channel

    async def handle_inbound(self, message: InboundMessage) -> str:
        body = message.content.get("body", "").strip().upper()
        if body in self.STOP_KEYWORDS:
            await self.consent.record_opt_out(
                message.from_number, self.channel, "keyword"
            )
            return "You have been unsubscribed. Reply START to resubscribe."
        elif body in self.START_KEYWORDS:
            await self.consent.record_opt_in(
                message.from_number, self.channel, "keyword", "0.0.0.0"
            )
            return "You have been resubscribed. Reply STOP to unsubscribe."
        return ""
```

## Message Filtering

```python
class MessageFilter:
    def __init__(self):
        self.rules: list[FilterRule] = []

    def add_rule(self, rule: FilterRule):
        self.rules.append(rule)

    async def filter(self, message: SMSMessage) -> FilterResult:
        for rule in self.rules:
            result = await rule.check(message)
            if not result.allowed:
                return result
        return FilterResult(allowed=True)

class ContentFilter(FilterRule):
    def __init__(self, blocked_patterns: list[str]):
        self.patterns = [re.compile(p, re.IGNORECASE)
                         for p in blocked_patterns]

    async def check(self, message: SMSMessage) -> FilterResult:
        for pattern in self.patterns:
            if pattern.search(message.body):
                return FilterResult(
                    allowed=False,
                    reason=f"Blocked content matched pattern: {pattern.pattern}",
                    rule="content_filter"
                )
        return FilterResult(allowed=True)

class RateFilter(FilterRule):
    def __init__(self, db_session, max_per_day: int = 5):
        self.db = db_session
        self.max_per_day = max_per_day

    async def check(self, message: SMSMessage) -> FilterResult:
        query = """
            SELECT COUNT(1) FROM sms_messages
            WHERE to_number = $1
            AND created_at > NOW() - INTERVAL '24 hours'
        """
        count = await self.db.fetchval(query, message.to_number)
        if count >= self.max_per_day:
            return FilterResult(
                allowed=False,
                reason=f"Daily limit of {self.max_per_day} exceeded",
                rule="rate_filter"
            )
        return FilterResult(allowed=True)
```

## Delivery Analytics

### Metrics Collection

```python
class SMSAnalyticsCollector:
    def __init__(self, db_session, metrics_client):
        self.db = db_session
        self.metrics = metrics_client

    async def record_delivery(self, message: SMSMessage):
        await self.db.execute("""
            INSERT INTO sms_delivery_log
                (message_id, provider, status, segments, cost,
                 delivery_time_ms, country, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, message.id, message.provider,
            message.status.value, message.segments,
            message.cost, message.delivery_time_ms,
            self._extract_country(message.to_number),
            message.delivered_at or datetime.utcnow()
        )

        self.metrics.increment("sms.sent", tags={
            "provider": message.provider,
            "status": message.status.value,
            "country": self._extract_country(message.to_number)
        })
        self.metrics.histogram("sms.segments", message.segments)
        self.metrics.histogram("sms.cost", float(message.cost),
                                tags={"provider": message.provider})
        if message.delivery_time_ms:
            self.metrics.histogram(
                "sms.delivery_time", message.delivery_time_ms,
                tags={"provider": message.provider}
            )

    async def delivery_rate(self, from_date: datetime,
                             to_date: datetime) -> dict:
        query = """
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                AVG(delivery_time_ms) as avg_delivery_time,
                SUM(cost) as total_cost
            FROM sms_delivery_log
            WHERE created_at BETWEEN $1 AND $2
        """
        row = await self.db.fetchrow(query, from_date, to_date)
        total = row["total"] or 0
        return {
            "total": total,
            "delivered": row["delivered"] or 0,
            "failed": row["failed"] or 0,
            "delivery_rate": (row["delivered"] / total * 100)
                             if total > 0 else 0,
            "avg_delivery_time_ms": round(row["avg_delivery_time"] or 0, 2),
            "total_cost": float(row["total_cost"] or 0)
        }

    def _extract_country(self, phone: str) -> str:
        try:
            import phonenumbers
            parsed = phonenumbers.parse(phone)
            return phonenumbers.region_code_for_number(parsed)
        except Exception:
            return "unknown"
```

### Analytics Dashboard

```python
class SMSDashboard:
    def __init__(self, db_session):
        self.db = db_session

    async def daily_summary(self, date: datetime.date) -> dict:
        query = """
            SELECT
                DATE(created_at) as day,
                COUNT(*) as total_messages,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                SUM(segments) as total_segments,
                SUM(cost) as total_cost,
                AVG(delivery_time_ms)::int as avg_delivery_ms
            FROM sms_delivery_log
            WHERE DATE(created_at) = $1
            GROUP BY DATE(created_at)
        """
        row = await self.db.fetchrow(query, date)
        if not row:
            return {}
        return dict(row)

    async def provider_comparison(self, days: int = 7) -> list[dict]:
        query = """
            SELECT
                provider,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                ROUND(
                    COUNT(*) FILTER (WHERE status = 'delivered')
                    * 100.0 / NULLIF(COUNT(*), 0), 2
                ) as delivery_rate,
                SUM(cost) as cost,
                AVG(delivery_time_ms)::int as avg_delivery_ms
            FROM sms_delivery_log
            WHERE created_at > NOW() - $1::interval
            GROUP BY provider
            ORDER BY total DESC
        """
        rows = await self.db.fetch(query, f"{days} days")
        return [dict(r) for r in rows]

    async def country_breakdown(self, days: int = 30) -> list[dict]:
        query = """
            SELECT
                country,
                COUNT(*) as total,
                SUM(cost) as cost,
                ROUND(
                    COUNT(*) FILTER (WHERE status = 'delivered')
                    * 100.0 / NULLIF(COUNT(*), 0), 2
                ) as delivery_rate
            FROM sms_delivery_log
            WHERE created_at > NOW() - $1::interval
            GROUP BY country
            ORDER BY total DESC
            LIMIT 20
        """
        rows = await self.db.fetch(query, f"{days} days")
        return [dict(r) for r in rows]
```

## Audit Trail

```python
class SMSAuditLogger:
    def __init__(self, db_session):
        self.db = db_session

    async def log(self, event_type: str, phone: str,
                   details: dict, actor: str):
        query = """
            INSERT INTO sms_audit_log
                (event_type, phone, details, actor, created_at)
            VALUES ($1, $2, $3, $4, NOW())
        """
        await self.db.execute(query, event_type, phone,
                               json.dumps(details), actor)

    async def query_logs(self, phone: str | None = None,
                          event_type: str | None = None,
                          from_date: datetime | None = None,
                          to_date: datetime | None = None) -> list[dict]:
        conditions = []
        params = []
        param_idx = 1
        if phone:
            conditions.append(f"phone = ${param_idx}")
            params.append(phone)
            param_idx += 1
        if event_type:
            conditions.append(f"event_type = ${param_idx}")
            params.append(event_type)
            param_idx += 1
        if from_date:
            conditions.append(f"created_at >= ${param_idx}")
            params.append(from_date)
            param_idx += 1
        if to_date:
            conditions.append(f"created_at <= ${param_idx}")
            params.append(to_date)
            param_idx += 1
        where = " AND ".join(conditions) if conditions else "TRUE"
        query = f"""
            SELECT * FROM sms_audit_log
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT 100
        """
        rows = await self.db.fetch(query, *params)
        return [dict(r) for r in rows]
```

## Key Points

- Compliance requirements vary by region with opt-in, opt-out, message frequency, and time-of-day restrictions.
- Opt-in consent must be explicitly recorded with source, IP address, and channel metadata.
- Opt-out keywords (STOP, UNSUBSCRIBE) must be honored immediately with confirmation response.
- Message filtering prevents spam, prohibited content, and rate limit violations.
- Delivery analytics track success rates, delivery times, segment usage, and costs per provider.
- Provider comparison dashboards inform routing decisions and cost optimization.
- Country-level breakdowns identify regions with poor delivery rates requiring provider changes.
- Audit trails record all consent changes, compliance events, and administrative actions for regulator review.
- DLT (Distributed Ledger Technology) registration is mandatory for SMS in India with template registration.
