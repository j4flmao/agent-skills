# Reconciliation

## Overview
Reconciliation is the process of comparing two sets of records to ensure they match. In fintech systems, reconciliation typically compares internal transaction records against external statements from banks, payment processors, or partner systems. Discrepancies must be identified, investigated, and resolved.

## Data Sources

### Source Models

```python
from dataclasses import dataclass, field
from decimal import Decimal
from datetime import datetime
from enum import Enum

class ReconciliationSource(Enum):
    INTERNAL = "internal"
    EXTERNAL = "external"

@dataclass
class TransactionRecord:
    id: str
    source: ReconciliationSource
    reference: str
    amount: Decimal
    currency: str
    type: str
    status: str
    date: datetime
    description: str
    metadata: dict = field(default_factory=dict)

@dataclass
class ReconciliationRun:
    id: str
    date_from: datetime
    date_to: datetime
    source_internal: str
    source_external: str
    status: str = "pending"
    total_internal: int = 0
    total_external: int = 0
    matched: int = 0
    unmatched_internal: int = 0
    unmatched_external: int = 0
    discrepancies: int = 0
    started_at: datetime | None = None
    completed_at: datetime | None = None
```

## Reconciliation Engine

### Matching Algorithm

```python
class ReconciliationEngine:
    def __init__(self, matchers: list[Matcher]):
        self.matchers = matchers

    async def reconcile(self, run: ReconciliationRun,
                         internal_records: list[TransactionRecord],
                         external_records: list[TransactionRecord]
                         ) -> ReconciliationResult:
        result = ReconciliationResult(run_id=run.id)
        internal_pool = list(internal_records)
        external_pool = list(external_records)

        for matcher in self.matchers:
            matched, internal_pool, external_pool = (
                await matcher.match(internal_pool, external_pool)
            )
            result.matched.extend(matched)

        result.unmatched_internal = internal_pool
        result.unmatched_external = external_pool
        result.discrepancies = self._detect_discrepancies(
            result.matched
        )
        return result

class Matcher(ABC):
    @abstractmethod
    async def match(self, internal: list[TransactionRecord],
                     external: list[TransactionRecord]
                     ) -> tuple[list[Match], list[TransactionRecord],
                                list[TransactionRecord]]:
        pass

class ExactMatcher(Matcher):
    async def match(self, internal, external):
        matched = []
        remaining_internal = []
        external_dict = {r.reference: r for r in external}
        for int_rec in internal:
            ext_rec = external_dict.pop(int_rec.reference, None)
            if ext_rec and (
                abs(int_rec.amount - ext_rec.amount) <= Decimal("0.01")
                and int_rec.currency == ext_rec.currency
            ):
                matched.append(Match(
                    internal=int_rec,
                    external=ext_rec,
                    confidence=1.0,
                    method="exact"
                ))
            else:
                remaining_internal.append(int_rec)
        return matched, remaining_internal, list(external_dict.values())

class FuzzyMatcher(Matcher):
    def __init__(self, amount_tolerance: Decimal = Decimal("0.50"),
                 time_window_hours: int = 48):
        self.amount_tolerance = amount_tolerance
        self.time_window_hours = time_window_hours

    async def match(self, internal, external):
        matched = []
        remaining_internal = []
        external_pool = list(external)
        for int_rec in internal:
            best_match = None
            best_score = 0
            for ext_rec in external_pool:
                score = self._calculate_similarity(int_rec, ext_rec)
                if score > best_score and score > 0.7:
                    best_score = score
                    best_match = ext_rec
            if best_match:
                matched.append(Match(
                    internal=int_rec,
                    external=best_match,
                    confidence=best_score,
                    method="fuzzy"
                ))
                external_pool.remove(best_match)
            else:
                remaining_internal.append(int_rec)
        return matched, remaining_internal, external_pool

    def _calculate_similarity(self, a: TransactionRecord,
                               b: TransactionRecord) -> float:
        score = 0.0
        if abs(a.amount - b.amount) <= self.amount_tolerance:
            score += 0.4
        time_diff = abs((a.date - b.date).total_seconds())
        if time_diff <= self.time_window_hours * 3600:
            score += 0.3 * (1 - time_diff / (self.time_window_hours * 3600))
        if a.description and b.description:
            token_overlap = len(
                set(a.description.lower().split()) &
                set(b.description.lower().split())
            ) / max(len(set(a.description.lower().split())), 1)
            score += 0.3 * token_overlap
        return min(score, 1.0)
```

### Discrepancy Detection

```python
class DiscrepancyDetector:
    def __init__(self, tolerance: Decimal = Decimal("0.01")):
        self.tolerance = tolerance

    def detect(self, matched: list[Match]) -> list[Discrepancy]:
        discrepancies = []
        for match in matched:
            diff = abs(match.internal.amount - match.external.amount)
            if diff > self.tolerance:
                discrepancies.append(Discrepancy(
                    match=match,
                    type="amount_mismatch",
                    internal_amount=match.internal.amount,
                    external_amount=match.external.amount,
                    difference=diff,
                    severity="high" if diff > Decimal("10.00") else "low"
                ))
            if match.internal.currency != match.external.currency:
                discrepancies.append(Discrepancy(
                    match=match,
                    type="currency_mismatch",
                    internal_amount=match.internal.amount,
                    external_amount=match.external.amount,
                    difference=diff,
                    severity="critical"
                ))
            date_diff = abs(
                (match.internal.date - match.external.date).days
            )
            if date_diff > 1:
                discrepancies.append(Discrepancy(
                    match=match,
                    type="date_mismatch",
                    severity="low",
                    description=f"Date difference: {date_diff} days"
                ))
        return discrepancies
```

## Reporting

### Reconciliation Report

```python
class ReconciliationReport:
    def __init__(self, result: ReconciliationResult):
        self.result = result

    def generate_summary(self) -> str:
        total_internal = (
            len(self.result.matched) +
            len(self.result.unmatched_internal)
        )
        total_external = (
            len(self.result.matched) +
            len(self.result.unmatched_external)
        )
        match_rate = (
            len(self.result.matched) / total_internal * 100
            if total_internal > 0 else 0
        )
        return f"""
        Reconciliation Summary
        =====================
        Internal Records: {total_internal}
        External Records: {total_external}
        Matched: {len(self.result.matched)} ({match_rate:.1f}%)
        Unmatched Internal: {len(self.result.unmatched_internal)}
        Unmatched External: {len(self.result.unmatched_external)}
        Discrepancies: {len(self.result.discrepancies)}
        """

    def to_dataframe(self) -> pd.DataFrame:
        rows = []
        for match in self.result.matched:
            rows.append({
                "reference": match.internal.reference,
                "internal_amount": float(match.internal.amount),
                "external_amount": float(match.external.amount),
                "internal_date": match.internal.date,
                "external_date": match.external.date,
                "match_confidence": match.confidence,
                "match_method": match.method
            })
        return pd.DataFrame(rows)
```

## Workflow Integration

```python
class ReconciliationWorkflow:
    def __init__(self, engine: ReconciliationEngine,
                 report_generator: ReconciliationReport,
                 storage: ReconciliationStorage):
        self.engine = engine
        self.report_generator = report_generator
        self.storage = storage

    async def run_reconciliation(self, run: ReconciliationRun):
        run.status = "running"
        run.started_at = datetime.utcnow()
        await self.storage.save_run(run)
        internal = await self.storage.load_internal(run)
        external = await self.storage.load_external(run)
        result = await self.engine.reconcile(run, internal, external)
        run.matched = len(result.matched)
        run.unmatched_internal = len(result.unmatched_internal)
        run.unmatched_external = len(result.unmatched_external)
        run.discrepancies = len(result.discrepancies)
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        await self.storage.save_run(run)
        await self.storage.save_result(result)
        if result.discrepancies:
            await self._notify_discrepancies(result)
        return result

    async def _notify_discrepancies(self, result: ReconciliationResult):
        for disc in result.discrepancies[:5]:
            notification = {
                "type": "reconciliation_discrepancy",
                "severity": disc.severity,
                "reference": disc.match.internal.reference,
                "diff": float(disc.difference),
                "type": disc.type
            }
            await publish_notification(notification)
```

## Auto-Reconciliation

```python
class AutoReconciler:
    def __init__(self, rules: list[ReconciliationRule],
                 engine: ReconciliationEngine):
        self.rules = rules
        self.engine = engine

    async def auto_resolve(self, discrepancy: Discrepancy) -> Resolution | None:
        for rule in self.rules:
            if await rule.can_apply(discrepancy):
                resolution = await rule.resolve(discrepancy)
                if resolution:
                    return resolution
        return None

class ReconciliationRule(ABC):
    @abstractmethod
    async def can_apply(self, discrepancy: Discrepancy) -> bool:
        pass

    @abstractmethod
    async def resolve(self, discrepancy: Discrepancy) -> Resolution | None:
        pass

class ToleranceRule(ReconciliationRule):
    def __init__(self, max_tolerance: Decimal = Decimal("0.50")):
        self.max_tolerance = max_tolerance

    async def can_apply(self, discrepancy: Discrepancy) -> bool:
        return (
            discrepancy.type == "amount_mismatch"
            and discrepancy.difference <= self.max_tolerance
        )

    async def resolve(self, discrepancy: Discrepancy) -> Resolution:
        return Resolution(
            discrepancy_id=discrepancy.id,
            action="accept_difference",
            note=f"Difference of {discrepancy.difference} "
                 f"within tolerance threshold",
            resolved_by="system"
        )
```

## Key Points

- Reconciliation compares internal and external transaction records to identify matches and discrepancies.
- Exact matching uses reference numbers for deterministic matching with high confidence.
- Fuzzy matching uses amount tolerance, time windows, and description similarity for approximate matches.
- Discrepancy detection identifies amount, currency, and date mismatches with severity levels.
- Match rates and reporting provide visibility into reconciliation health over time.
- Auto-reconciliation rules resolve known discrepancy patterns automatically.
- Workflow integration supports scheduling periodic reconciliation runs.
- Notifications alert operations teams to discrepancies requiring manual investigation.
