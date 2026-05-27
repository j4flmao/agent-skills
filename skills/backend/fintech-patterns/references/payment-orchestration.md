# Payment Orchestration

## Orchestration Architecture

### Core Components
```
Payment Request → Orchestrator → Router → Provider Adapter → Provider API
                      ↓                      ↓
              Payment State Store    Provider Registry
                      ↓
              Event Publisher → Handlers (Notifications, Ledger, Fraud)
```

### Provider Registry
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Protocol

class PaymentProvider(Protocol):
    name: str
    supported_currencies: list[str]
    supported_methods: list[PaymentMethod]
    fee_percentage: float
    is_active: bool

class PaymentMethod(Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"
    BNPL = "buy_now_pay_later"
    CRYPTO = "cryptocurrency"

@dataclass
class ProviderConfig:
    name: str
    api_key: str
    api_secret: str
    base_url: str
    webhook_secret: str
    timeout_seconds: int = 30
    retry_config: dict = None
```

## Payment Routing

### Routing Strategy
```python
class PaymentRouter:
    def __init__(self, providers: list[PaymentProvider], strategy: str = "cost"):
        self.providers = providers
        self.strategy = strategy

    def route(self, payment: PaymentRequest) -> PaymentProvider:
        eligible = self.filter_eligible(payment)

        if not eligible:
            raise NoEligibleProviderError(payment)

        if self.strategy == "cost":
            return min(eligible, key=lambda p: p.fee_percentage)
        elif self.strategy == "fallback":
            return eligible[0]
        elif self.strategy == "least_used":
            return min(eligible, key=lambda p: p.daily_volume)
        elif self.strategy == "round_robin":
            return self.round_robin_select(eligible)

    def filter_eligible(self, payment: PaymentRequest) -> list[PaymentProvider]:
        return [
            p for p in self.providers
            if p.is_active
            and payment.currency in p.supported_currencies
            and payment.method in p.supported_methods
            and payment.amount >= p.min_amount
            and payment.amount <= p.max_amount
        ]
```

### Smart Routing Rules
```python
routing_rules = {
    "high_value": {
        "condition": lambda p: p.amount > 10000,
        "preferred_providers": ["stripe", "adyen"],
        "require_3ds": True,
        "require_fraud_check": True,
    },
    "international": {
        "condition": lambda p: p.currency != p.billing_country_currency,
        "prefer_providers_with": ["forex_optimized"],
        "max_fee_percentage": 2.5,
    },
    "recurring": {
        "condition": lambda p: p.is_recurring,
        "require_provider_with": ["retry_logic", "dunning"],
        "prefer_least_failures": True,
    },
    "low_value": {
        "condition": lambda p: p.amount < 5,
        "prefer_providers": ["local_bank"],
        "skip_3ds": True,
    },
}
```

## Provider Adapter Pattern

### Adapter Interface
```python
class PaymentProviderAdapter(ABC):
    @abstractmethod
    async def charge(self, request: ChargeRequest) -> ChargeResponse:
        pass

    @abstractmethod
    async def refund(self, request: RefundRequest) -> RefundResponse:
        pass

    @abstractmethod
    async def void(self, request: VoidRequest) -> VoidResponse:
        pass

    @abstractmethod
    async def get_status(self, transaction_id: str) -> TransactionStatus:
        pass

    @abstractmethod
    async def parse_webhook(self, payload: dict, headers: dict) -> WebhookEvent:
        pass

class StripeAdapter(PaymentProviderAdapter):
    def __init__(self, config: ProviderConfig):
        import stripe
        stripe.api_key = config.api_key
        self.stripe = stripe

    async def charge(self, request: ChargeRequest) -> ChargeResponse:
        intent = await self.stripe.PaymentIntent.create_async(
            amount=int(request.amount * 100),
            currency=request.currency.lower(),
            payment_method=request.payment_method_id,
            confirm=True,
            metadata={"order_id": request.order_id},
        )
        return ChargeResponse(
            transaction_id=intent.id,
            status=intent.status,
            amount=request.amount,
            currency=request.currency,
            provider_fee=intent.amount - intent.amount_received,
        )

    async def parse_webhook(self, payload: dict, headers: dict) -> WebhookEvent:
        event = None
        sig_header = headers.get("stripe-signature")
        try:
            event = self.stripe.Webhook.construct_event(
                payload, sig_header, self.config.webhook_secret
            )
        except ValueError:
            raise InvalidWebhookError("Invalid payload")
        except self.stripe.error.SignatureVerificationError:
            raise InvalidWebhookError("Invalid signature")

        return WebhookEvent(
            type=event.type,
            provider="stripe",
            data=event.data.object,
        )
```

## Payment Flow

### Standard Charge Flow
```python
class PaymentOrchestrator:
    def __init__(self, router, adapters, state_store, event_publisher):
        self.router = router
        self.adapters = adapters
        self.state_store = state_store
        self.event_publisher = event_publisher

    async def process_payment(self, request: PaymentRequest) -> PaymentResult:
        payment_id = generate_id()
        await self.state_store.create(PaymentState(
            id=payment_id,
            status="pending",
            request=request,
        ))

        provider = self.router.route(request)
        adapter = self.adapters[provider.name]

        try:
            charge_response = await adapter.charge(ChargeRequest(
                amount=request.amount,
                currency=request.currency,
                payment_method_id=request.payment_method_id,
                order_id=request.order_id,
                metadata=request.metadata,
            ))

            await self.state_store.update(payment_id, {
                "status": charge_response.status,
                "transaction_id": charge_response.transaction_id,
                "provider": provider.name,
            })

            await self.event_publisher.publish(PaymentCompleted(
                payment_id=payment_id,
                transaction_id=charge_response.transaction_id,
                amount=request.amount,
                provider=provider.name,
            ))

            return PaymentResult(
                success=True,
                payment_id=payment_id,
                transaction_id=charge_response.transaction_id,
                provider=provider.name,
            )

        except ProviderError as e:
            await self.handle_payment_failure(payment_id, provider, e)

            # Fallback to next provider
            fallback_providers = [
                p for p in self.router.eligible
                if p.name != provider.name
            ]
            for fallback in fallback_providers:
                try:
                    return await self.retry_with_provider(
                        payment_id, request, fallback
                    )
                except ProviderError:
                    continue

            return PaymentResult(
                success=False,
                payment_id=payment_id,
                error="All providers failed",
            )
```

## Webhook Handling

### Webhook Router
```python
class WebhookRouter:
    def __init__(self, adapters: dict[str, PaymentProviderAdapter]):
        self.adapters = adapters

    async def handle_webhook(
        self, provider: str, payload: dict, headers: dict
    ) -> None:
        adapter = self.adapters.get(provider)
        if not adapter:
            raise UnknownProviderError(provider)

        event = await adapter.parse_webhook(payload, headers)
        await self.process_event(event)

    async def process_event(self, event: WebhookEvent):
        mapping = {
            "payment_intent.succeeded": self.handle_success,
            "payment_intent.payment_failed": self.handle_failure,
            "charge.refunded": self.handle_refund,
            "charge.dispute.created": self.handle_dispute,
        }

        handler = mapping.get(event.type)
        if handler:
            await handler(event)
```

## Reconciliation

### Daily Reconciliation
```python
class ReconciliationService:
    def __init__(self, ledger_service, provider_adapters):
        self.ledger = ledger_service
        self.adapters = provider_adapters

    async def reconcile(self, date: date, provider: str):
        ledger_records = await self.ledger.get_transactions(date, provider)
        provider_records = await self.adapters[provider].get_settlements(date)

        mismatches = []
        for provider_txn in provider_records:
            ledger_txn = ledger_records.get(provider_txn.id)
            if not ledger_txn:
                mismatches.append(Mismatch(
                    type="missing_in_ledger",
                    provider_txn=provider_txn,
                ))
            elif ledger_txn.amount != provider_txn.amount:
                mismatches.append(Mismatch(
                    type="amount_mismatch",
                    provider_txn=provider_txn,
                    ledger_txn=ledger_txn,
                    diff=provider_txn.amount - ledger_txn.amount,
                ))

        return ReconciliationReport(
            date=date,
            provider=provider,
            total_ledger=sum(r.amount for r in ledger_records.values()),
            total_provider=sum(r.amount for r in provider_records),
            mismatches=mismatches,
        )
```

## Key Points
- Payment orchestrator routes requests to optimal provider based on cost, region, or strategy
- Provider adapters normalize different payment APIs behind a common interface
- Smart routing rules handle high-value, international, recurring, and low-value payments differently
- Failed payments trigger automatic fallback to secondary providers
- Webhook handling with signature verification ensures secure event processing
- Daily reconciliation detects discrepancies between ledger and provider records
- Provider registry maintains capabilities, fees, and health status per provider
- Idempotency keys prevent duplicate charges across retries
