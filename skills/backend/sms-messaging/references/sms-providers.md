# SMS Providers

## Overview
SMS messaging requires integration with third-party providers that handle the actual delivery of messages through carrier networks. Choosing and integrating the right provider involves evaluating reliability, coverage, cost, compliance, and API capabilities.

## Provider Abstraction

### Provider Interface

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from decimal import Decimal

class MessageStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    REJECTED = "rejected"
    EXPIRED = "expired"

@dataclass
class SMSMessage:
    id: str
    to_number: str
    from_number: str
    body: str
    status: MessageStatus = MessageStatus.PENDING
    segments: int = 1
    provider: str = ""
    provider_message_id: str = ""
    cost: Decimal = Decimal("0")
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    delivered_at: datetime | None = None

class SMSProvider(ABC):
    @abstractmethod
    async def send(self, message: SMSMessage) -> SMSMessage:
        pass

    @abstractmethod
    async def get_status(self, provider_message_id: str) -> MessageStatus:
        pass

    @abstractmethod
    async def get_balance(self) -> Decimal:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass
```

### Twilio Provider

```python
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

class TwilioProvider(SMSProvider):
    def __init__(self, account_sid: str, auth_token: str,
                 from_number: str):
        self.client = Client(account_sid, auth_token)
        self.from_number = from_number
        self.name = "twilio"

    async def send(self, message: SMSMessage) -> SMSMessage:
        try:
            twilio_message = self.client.messages.create(
                body=message.body,
                from_=self.from_number,
                to=message.to_number,
                status_callback=(
                    "https://api.example.com/sms/status/twilio"
                )
            )
            message.provider_message_id = twilio_message.sid
            message.status = MessageStatus.SENT
            message.provider = self.name
            message.segments = twilio_message.num_segments or 1
            if twilio_message.price:
                message.cost = Decimal(str(twilio_message.price))
            return message
        except TwilioRestException as e:
            message.status = MessageStatus.FAILED
            message.error_code = str(e.code)
            message.error_message = e.msg
            return message

    async def get_status(self, provider_message_id: str) -> MessageStatus:
        try:
            twilio_message = self.client.messages(provider_message_id).fetch()
            status_map = {
                "queued": MessageStatus.PENDING,
                "sent": MessageStatus.SENT,
                "delivered": MessageStatus.DELIVERED,
                "failed": MessageStatus.FAILED,
                "undelivered": MessageStatus.FAILED
            }
            return status_map.get(
                twilio_message.status, MessageStatus.PENDING
            )
        except TwilioRestException:
            return MessageStatus.FAILED

    async def get_balance(self) -> Decimal:
        account = self.client.api.accounts(self.client.account_sid).fetch()
        return Decimal(str(account.balance))

    async def health_check(self) -> bool:
        try:
            self.client.api.accounts(self.client.account_sid).fetch()
            return True
        except TwilioRestException:
            return False
```

### AWS SNS Provider

```python
import boto3

class SNSSMSProvider(SMSProvider):
    def __init__(self, region: str, access_key: str,
                 secret_key: str, sender_id: str = ""):
        self.client = boto3.client(
            "sns",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
        self.sender_id = sender_id
        self.name = "aws_sns"

    async def send(self, message: SMSMessage) -> SMSMessage:
        try:
            kwargs = {
                "PhoneNumber": message.to_number,
                "Message": message.body,
                "MessageAttributes": {
                    "AWS.SNS.SMS.SenderID": {
                        "DataType": "String",
                        "StringValue": self.sender_id or "Default"
                    },
                    "AWS.SNS.SMS.SMSType": {
                        "DataType": "String",
                        "StringValue": "Transactional"
                    }
                }
            }
            response = self.client.publish(**kwargs)
            message.provider_message_id = response.get("MessageId")
            message.status = MessageStatus.SENT
            message.provider = self.name
            return message
        except Exception as e:
            message.status = MessageStatus.FAILED
            message.error_message = str(e)
            return message

    async def get_status(self, provider_message_id: str) -> MessageStatus:
        try:
            response = self.client.get_sms_attributes(
                attributes=["messageStatus"]
            )
            provider_status = response.get("attributes", {}).get(
                provider_message_id, "PENDING"
            )
            status_map = {
                "PENDING": MessageStatus.PENDING,
                "SUCCESS": MessageStatus.DELIVERED,
                "FAILURE": MessageStatus.FAILED
            }
            return status_map.get(provider_status, MessageStatus.PENDING)
        except Exception:
            return MessageStatus.PENDING

    async def get_balance(self) -> Decimal:
        response = self.client.get_sms_attributes(
            attributes=["monthlySpendLimit", "monthlySpend"]
        )
        attrs = response.get("attributes", {})
        return Decimal(str(attrs.get("monthlySpend", "0")))

    async def health_check(self) -> bool:
        try:
            self.client.list_topics(MaxResults=1)
            return True
        except Exception:
            return False
```

## Provider Routing

### Intelligent Provider Router

```python
class SMSProviderRouter:
    def __init__(self, providers: dict[str, SMSProvider],
                 routing_rules: list[RoutingRule]):
        self.providers = providers
        self.routing_rules = routing_rules

    async def route(self, message: SMSMessage) -> SMSProvider:
        country = self._detect_country(message.to_number)
        for rule in self.routing_rules:
            if rule.matches(message, country):
                provider = self.providers.get(rule.provider_name)
                if provider and await provider.health_check():
                    return provider
        default = self.providers.get("default")
        if not default:
            raise NoAvailableProviderError(
                f"No provider available for {message.to_number}"
            )
        return default

    def _detect_country(self, phone_number: str) -> str:
        parsed = phonenumbers.parse(phone_number)
        return phonenumbers.region_code_for_number(parsed)

@dataclass
class RoutingRule:
    provider_name: str
    countries: list[str] | None = None
    min_priority: int | None = None
    max_segments: int | None = None
    time_window: tuple[int, int] | None = None

    def matches(self, message: SMSMessage, country: str) -> bool:
        if self.countries and country not in self.countries:
            return False
        if self.max_segments and message.segments > self.max_segments:
            return False
        if self.time_window:
            current_hour = datetime.utcnow().hour
            start, end = self.time_window
            if not (start <= current_hour < end):
                return False
        return True
```

### Failover Router

```python
class FailoverRouter:
    def __init__(self, primary: SMSProvider,
                 fallbacks: list[SMSProvider],
                 max_retries: int = 2):
        self.primary = primary
        self.fallbacks = fallbacks
        self.max_retries = max_retries

    async def send_with_failover(self, message: SMSMessage) -> SMSMessage:
        providers = [self.primary] + self.fallbacks
        for provider in providers:
            for attempt in range(self.max_retries):
                try:
                    result = await provider.send(message)
                    if result.status != MessageStatus.FAILED:
                        return result
                except Exception as e:
                    logging.warning(
                        f"Provider {provider.name} attempt {attempt + 1} "
                        f"failed: {e}"
                    )
                await asyncio.sleep(1)
        message.status = MessageStatus.FAILED
        message.error_message = "All providers exhausted"
        return message
```

## Cost Tracking

```python
class SMSCostTracker:
    def __init__(self, db_session):
        self.db = db_session

    async def record_cost(self, message: SMSMessage):
        query = """
            INSERT INTO sms_costs
                (message_id, provider, segments, cost_per_segment,
                 total_cost, currency, country, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """
        country = self._extract_country(message.to_number)
        await self.db.execute(query,
            message.id, message.provider, message.segments,
            message.cost / message.segments if message.segments else 0,
            message.cost, "USD", country, datetime.utcnow()
        )

    async def monthly_spend(self, year: int, month: int) -> dict:
        query = """
            SELECT provider, COUNT(*) as count,
                   SUM(total_cost) as total_cost,
                   SUM(segments) as total_segments
            FROM sms_costs
            WHERE EXTRACT(YEAR FROM created_at) = $1
            AND EXTRACT(MONTH FROM created_at) = $2
            GROUP BY provider
        """
        rows = await self.db.fetch(query, year, month)
        return {
            "total": sum(r["total_cost"] for r in rows),
            "by_provider": {r["provider"]: dict(r) for r in rows}
        }

    def _extract_country(self, phone: str) -> str:
        try:
            parsed = phonenumbers.parse(phone)
            return phonenumbers.region_code_for_number(parsed)
        except phonenumbers.NumberParseException:
            return "unknown"
```

## Provider Health Monitoring

```python
class ProviderHealthMonitor:
    def __init__(self, providers: dict[str, SMSProvider]):
        self.providers = providers
        self.health_status: dict[str, bool] = {}
        self.latency: dict[str, list[float]] = {}

    async def check_all(self):
        for name, provider in self.providers.items():
            start = time.monotonic()
            try:
                healthy = await provider.health_check()
                elapsed = time.monotonic() - start
                self.health_status[name] = healthy
                if name not in self.latency:
                    self.latency[name] = []
                self.latency[name].append(elapsed)
                if len(self.latency[name]) > 100:
                    self.latency[name] = self.latency[name][-100:]
            except Exception:
                self.health_status[name] = False

    def get_healthy_providers(self) -> list[str]:
        return [
            name for name, healthy in self.health_status.items()
            if healthy
        ]

    def average_latency(self, provider_name: str) -> float:
        latencies = self.latency.get(provider_name, [])
        return sum(latencies) / len(latencies) if latencies else 0
```

## Key Points

- Provider abstraction via a common interface allows swapping providers without changing business logic.
- Twilio and AWS SNS are common providers with different APIs, pricing models, and capabilities.
- Intelligent routing selects the best provider based on destination country, message size, and time of day.
- Failover routing automatically retries with alternative providers when the primary fails.
- Cost tracking records per-message costs segmented by provider, country, and time period.
- Provider health monitoring tracks availability and latency to inform routing decisions.
- Webhook-based delivery status callbacks provide real-time visibility into message delivery.
- Environment-specific provider configuration (sandbox, test, production) prevents accidental sending.
