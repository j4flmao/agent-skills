# Transaction Processing

## Overview
Transaction processing is the core of any fintech system, handling the lifecycle of financial transactions from initiation through authorization, clearing, settlement, and reconciliation. Systems must ensure atomicity, consistency, isolation, and durability (ACID) while maintaining high throughput and availability.

## Transaction Lifecycle

### State Machine

```python
from enum import Enum

class TransactionState(Enum):
    INITIATED = "initiated"
    AUTHORIZED = "authorized"
    PENDING = "pending"
    PROCESSING = "processing"
    CLEARED = "cleared"
    SETTLED = "settled"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"
    REFUNDED = "refunded"
    CHARGEBACK = "chargeback"

class TransactionStateMachine:
    TRANSITIONS = {
        TransactionState.INITIATED: [TransactionState.AUTHORIZED,
                                      TransactionState.FAILED],
        TransactionState.AUTHORIZED: [TransactionState.PENDING,
                                       TransactionState.FAILED,
                                       TransactionState.REVERSED],
        TransactionState.PENDING: [TransactionState.PROCESSING,
                                    TransactionState.FAILED],
        TransactionState.PROCESSING: [TransactionState.CLEARED,
                                       TransactionState.FAILED],
        TransactionState.CLEARED: [TransactionState.SETTLED,
                                    TransactionState.CHARGEBACK],
        TransactionState.SETTLED: [TransactionState.COMPLETED,
                                    TransactionState.REFUNDED],
        TransactionState.COMPLETED: [TransactionState.REFUNDED,
                                      TransactionState.CHARGEBACK],
        TransactionState.FAILED: [TransactionState.REVERSED],
        TransactionState.REVERSED: [TransactionState.REFUNDED],
    }

    def transition(self, current: TransactionState,
                   target: TransactionState) -> TransactionState:
        if target not in self.TRANSITIONS.get(current, []):
            raise InvalidStateTransitionError(
                f"Cannot transition from {current.value} to {target.value}"
            )
        return target
```

## Transaction Model

```python
from dataclasses import dataclass, field
from decimal import Decimal
from datetime import datetime
from uuid import uuid4

@dataclass
class PaymentTransaction:
    id: str = field(default_factory=lambda: str(uuid4()))
    reference: str = ""
    transaction_type: str = ""
    amount: Decimal = Decimal("0.00")
    currency: str = "USD"
    settlement_amount: Decimal | None = None
    settlement_currency: str | None = None
    exchange_rate: Decimal | None = None
    fee_amount: Decimal = Decimal("0.00")
    fee_currency: str = "USD"
    net_amount: Decimal = Decimal("0.00")
    source_account: str = ""
    destination_account: str = ""
    source_network: str = ""
    destination_network: str = ""
    status: TransactionState = TransactionState.INITIATED
    error_code: str | None = None
    error_message: str | None = None
    customer_id: str = ""
    merchant_id: str | None = None
    metadata: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
```

## Authorization

### Payment Authorization

```python
class AuthorizationService:
    def __init__(self, ledger: LedgerEngine,
                 risk_engine: RiskEngine,
                 fraud_detector: FraudDetector):
        self.ledger = ledger
        self.risk = risk_engine
        self.fraud = fraud_detector

    async def authorize(self, tx: PaymentTransaction) -> AuthorizationResult:
        risk_score = await self.risk.evaluate(tx)
        if risk_score > 80:
            return AuthorizationResult(
                transaction=tx,
                status="declined",
                reason="High risk score",
                risk_score=risk_score
            )

        fraud_check = await self.fraud.check(tx)
        if fraud_check.is_suspicious:
            return AuthorizationResult(
                transaction=tx,
                status="flagged",
                reason=fraud_check.reason,
                fraud_flags=fraud_check.flags
            )

        tx.status = TransactionState.AUTHORIZED
        tx.updated_at = datetime.utcnow()

        auth_hold = await self.ledger.hold_funds(
            account_id=tx.source_account,
            amount=tx.amount + tx.fee_amount,
            reason=f"Authorization for {tx.reference}"
        )
        tx.metadata["auth_hold_id"] = auth_hold

        return AuthorizationResult(
            transaction=tx,
            status="approved",
            risk_score=risk_score,
            authorization_code=str(uuid4())[:8].upper()
        )
```

### 3D Secure Authentication

```python
class ThreeDSecureService:
    def __init__(self, ds_provider: DirectoryServerProvider):
        self.ds_provider = ds_provider

    async def initiate_authentication(self, tx: PaymentTransaction) -> ThreeDSResult:
        request = {
            "amount": str(tx.amount),
            "currency": tx.currency,
            "merchant_id": tx.merchant_id,
            "customer_id": tx.customer_id,
            "transaction_reference": tx.reference,
            "device_channel": "browser",
            "message_category": "01"
        }
        response = await self.ds_provider.create_authentication_request(request)
        return ThreeDSResult(
            transaction_id=tx.id,
            three_ds_server_ref=response.get("threeDSServerTransID"),
            authentication_url=response.get("authenticationUrl"),
            creq=response.get("creq")
        )

    async def verify_authentication(self, tx: PaymentTransaction,
                                     cres: str) -> bool:
        result = await self.ds_provider.verify_authentication(
            tx.metadata.get("three_ds_server_ref"), cres
        )
        return result.get("authenticationValue") is not None
```

## Clearing and Settlement

### Clearing Engine

```python
class ClearingEngine:
    def __init__(self, network_gateways: dict[str, PaymentGateway]):
        self.gateways = network_gateways

    async def clear_transaction(self, tx: PaymentTransaction) -> ClearingResult:
        gateway = self.gateways.get(tx.source_network)
        if not gateway:
            raise UnsupportedNetworkError(tx.source_network)

        tx.status = TransactionState.PROCESSING
        tx.updated_at = datetime.utcnow()

        clearing_request = {
            "transaction_id": tx.id,
            "reference": tx.reference,
            "amount": str(tx.amount),
            "currency": tx.currency,
            "source": tx.source_account,
            "destination": tx.destination_account,
            "type": tx.transaction_type,
            "authorization_code": tx.metadata.get("authorization_code")
        }

        try:
            response = await gateway.submit_for_clearing(clearing_request)
            tx.status = TransactionState.CLEARED
            tx.metadata["clearing_reference"] = response.get("clearing_id")
            tx.metadata["network_trace_id"] = response.get("trace_id")

            if response.get("settlement_amount"):
                tx.settlement_amount = Decimal(response["settlement_amount"])
                tx.settlement_currency = response.get("settlement_currency", tx.currency)

            return ClearingResult(
                transaction=tx,
                success=True,
                network_reference=response.get("clearing_id"),
                settlement_amount=tx.settlement_amount
            )
        except GatewayError as e:
            tx.status = TransactionState.FAILED
            tx.error_code = e.code
            tx.error_message = str(e)
            return ClearingResult(
                transaction=tx,
                success=False,
                error=e
            )

    async def batch_clearing(self, transactions: list[PaymentTransaction]) -> list[ClearingResult]:
        results = []
        for tx in transactions:
            result = await self.clear_transaction(tx)
            results.append(result)
        return results
```

### Settlement Engine

```python
class SettlementEngine:
    def __init__(self, ledger: LedgerEngine,
                 clearing_engine: ClearingEngine):
        self.ledger = ledger
        self.clearing = clearing_engine

    async def settle(self, tx: PaymentTransaction) -> SettlementResult:
        if tx.status != TransactionState.CLEARED:
            raise InvalidStateError("Transaction must be cleared before settlement")

        async with self.ledger.db.transaction():
            await self.ledger.settle_hold(tx.metadata["auth_hold_id"])

            settlement_tx = Transaction(
                reference=f"SETTLE-{tx.reference}",
                transaction_type="settlement",
                entries=[
                    LedgerEntry(
                        account_id=tx.source_account,
                        entry_type="debit",
                        amount=tx.amount + tx.fee_amount,
                        description=f"Settlement: {tx.reference}"
                    ),
                    LedgerEntry(
                        account_id=tx.destination_account,
                        entry_type="credit",
                        amount=tx.net_amount,
                        description=f"Settlement: {tx.reference}"
                    ),
                    LedgerEntry(
                        account_id="FEE_INCOME_ACCOUNT",
                        entry_type="credit",
                        amount=tx.fee_amount,
                        description=f"Fee: {tx.reference}"
                    )
                ]
            )
            await self.ledger.post_transaction(settlement_tx)

            tx.status = TransactionState.SETTLED
            tx.completed_at = datetime.utcnow()
            tx.metadata["settlement_transaction_id"] = settlement_tx.id

            if tx.settlement_currency and tx.settlement_currency != tx.currency:
                await self._settle_fx_conversion(tx)

            return SettlementResult(
                transaction=tx,
                settled_amount=tx.settlement_amount or tx.net_amount,
                settlement_tx_id=settlement_tx.id
            )

    async def _settle_fx_conversion(self, tx: PaymentTransaction):
        fx_tx = Transaction(
            reference=f"FX-{tx.reference}",
            transaction_type="fx_conversion",
            entries=[
                LedgerEntry(
                    account_id=f"FX_{tx.currency}_ACCOUNT",
                    entry_type="debit",
                    amount=tx.amount,
                    currency=tx.currency,
                    description=f"FX conversion for {tx.reference}"
                ),
                LedgerEntry(
                    account_id=f"FX_{tx.settlement_currency}_ACCOUNT",
                    entry_type="credit",
                    amount=tx.settlement_amount,
                    currency=tx.settlement_currency,
                    description=f"FX conversion for {tx.reference}"
                )
            ]
        )
        await self.ledger.post_transaction(fx_tx)
```

## Error Handling

### Retry Logic

```python
class TransactionRetryHandler:
    def __init__(self, max_retries: int = 3,
                 base_delay: int = 1,
                 max_delay: int = 60):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    async def process_with_retry(self, tx: PaymentTransaction,
                                  processor: callable) -> PaymentTransaction:
        last_error = None
        for attempt in range(self.max_retries):
            try:
                return await processor(tx)
            except RetriableError as e:
                last_error = e
                delay = min(
                    self.base_delay * (2 ** attempt),
                    self.max_delay
                )
                logging.warning(
                    f"Transaction {tx.id} attempt {attempt + 1} "
                    f"failed: {e}. Retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                tx.attempt_count = attempt + 1
            except NonRetriableError as e:
                tx.status = TransactionState.FAILED
                tx.error_code = e.code
                tx.error_message = str(e)
                return tx

        tx.status = TransactionState.FAILED
        tx.error_code = "MAX_RETRIES_EXCEEDED"
        tx.error_message = str(last_error)
        return tx
```

## Reversals and Refunds

```python
class ReversalService:
    def __init__(self, ledger: LedgerEngine):
        self.ledger = ledger

    async def reverse_authorization(self, tx: PaymentTransaction) -> ReversalResult:
        if tx.status != TransactionState.AUTHORIZED:
            raise InvalidStateError(
                f"Cannot reverse transaction in state {tx.state.value}"
            )

        hold_id = tx.metadata.get("auth_hold_id")
        await self.ledger.settle_hold(hold_id)

        reversal_tx = Transaction(
            reference=f"REV-{tx.reference}",
            transaction_type="reversal",
            entries=[
                LedgerEntry(
                    account_id=tx.source_account,
                    entry_type="credit",
                    amount=tx.amount + tx.fee_amount,
                    description=f"Reversal: {tx.reference}"
                ),
                LedgerEntry(
                    account_id="HOLDINGS_ACCOUNT",
                    entry_type="debit",
                    amount=tx.amount + tx.fee_amount,
                    description=f"Reversal: {tx.reference}"
                )
            ]
        )
        await self.ledger.post_transaction(reversal_tx)

        tx.status = TransactionState.REVERSED
        return ReversalResult(transaction=tx, reversed_amount=tx.amount)

    async def process_refund(self, tx: PaymentTransaction,
                               refund_amount: Decimal | None = None) -> RefundResult:
        amount = refund_amount or tx.amount
        refund_tx = Transaction(
            reference=f"RFND-{tx.reference}-{uuid4().hex[:8]}",
            transaction_type="refund",
            entries=[
                LedgerEntry(
                    account_id=tx.destination_account,
                    entry_type="debit",
                    amount=amount,
                    description=f"Refund: {tx.reference}"
                ),
                LedgerEntry(
                    account_id=tx.source_account,
                    entry_type="credit",
                    amount=amount,
                    description=f"Refund: {tx.reference}"
                )
            ]
        )
        await self.ledger.post_transaction(refund_tx)

        tx.status = TransactionState.REFUNDED
        tx.metadata["refund_transaction_id"] = refund_tx.id
        tx.metadata["refund_amount"] = str(amount)

        return RefundResult(
            original_transaction=tx,
            refund_amount=amount,
            refund_tx_id=refund_tx.id
        )
```

## Idempotency

```python
class IdempotencyService:
    def __init__(self, storage: IdempotencyStorage):
        self.storage = storage

    async def process_idempotent(self, idempotency_key: str,
                                  processor: callable,
                                  ttl_seconds: int = 86400) -> dict:
        existing = await self.storage.get(idempotency_key)
        if existing:
            return existing["response"]

        response = await processor()
        await self.storage.set(
            idempotency_key,
            {"response": response},
            ttl_seconds
        )
        return response

class IdempotencyMiddleware:
    def __init__(self, idempotency_service: IdempotencyService):
        self.service = idempotency_service

    async def __call__(self, request: Request,
                        handler: callable) -> Response:
        key = request.headers.get("Idempotency-Key")
        if not key:
            return await handler(request)

        result = await self.service.process_idempotent(
            key, lambda: handler(request)
        )
        return result
```

## Key Points

- Transaction lifecycle follows a strict state machine with defined transitions between each state.
- Authorization validates transactions against risk models and fraud detectors before holding funds.
- 3D Secure adds an authentication layer for card-not-present transactions.
- Clearing submits authorized transactions to payment networks for processing.
- Settlement completes the funds transfer between source and destination accounts.
- Retry handlers distinguish retriable errors (network timeouts) from non-retriable errors (invalid account).
- Reversals and refunds use compensating transactions to undo prior operations.
- Idempotency keys ensure duplicate submissions do not result in duplicate charges.
- Exchange rate handling ensures accurate multi-currency settlement with FX tracking.
