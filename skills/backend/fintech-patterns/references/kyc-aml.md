# KYC and AML

## Overview
Know Your Customer (KYC) and Anti-Money Laundering (AML) compliance are critical for fintech systems. These processes verify customer identities, screen against watchlists, assess risk levels, monitor transactions, and report suspicious activity to regulators.

## Identity Verification

### Document Verification

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class DocumentType(Enum):
    PASSPORT = "passport"
    DRIVERS_LICENSE = "drivers_license"
    NATIONAL_ID = "national_id"
    RESIDENCE_PERMIT = "residence_permit"
    UTILITY_BILL = "utility_bill"
    BANK_STATEMENT = "bank_statement"

class VerificationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"

@dataclass
class VerificationDocument:
    id: str
    customer_id: str
    document_type: DocumentType
    file_url: str
    country: str
    status: VerificationStatus = VerificationStatus.PENDING
    verification_provider: str = ""
    verification_id: str = ""
    result: dict = field(default_factory=dict)
    expires_at: datetime | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)

class IdentityVerificationService:
    def __init__(self, providers: dict[str, VerificationProvider]):
        self.providers = providers

    async def verify_document(self, doc: VerificationDocument) -> VerificationResult:
        provider = self.providers.get(doc.document_type.value)
        if not provider:
            raise UnsupportedDocumentTypeError(doc.document_type)
        doc.status = VerificationStatus.IN_PROGRESS
        result = await provider.verify(doc)
        doc.status = (
            VerificationStatus.VERIFIED
            if result.is_valid
            else VerificationStatus.REJECTED
        )
        doc.result = result.raw_data
        doc.verification_id = result.provider_ref
        return result

    async def verify_identity(self, customer_id: str,
                                documents: list[VerificationDocument]
                                ) -> IdentityVerification:
        verification = IdentityVerification(
            customer_id=customer_id,
            documents=documents
        )
        results = []
        for doc in documents:
            result = await self.verify_document(doc)
            results.append(result)
        verification.overall_status = (
            VerificationStatus.VERIFIED
            if all(r.is_valid for r in results)
            else VerificationStatus.REJECTED
        )
        return verification
```

### Biometric Verification

```python
class BiometricVerification:
    def __init__(self, liveness_provider, face_match_provider):
        self.liveness = liveness_provider
        self.face_match = face_match_provider

    async def verify_liveness(self, video_url: str) -> LivenessResult:
        result = await self.liveness.check(video_url)
        return LivenessResult(
            is_alive=result.get("liveness_score", 0) > 0.8,
            confidence=result.get("liveness_score", 0),
            spoof_detected=result.get("spoof_probability", 0) > 0.3
        )

    async def match_face(self, selfie_url: str,
                          document_image_url: str) -> FaceMatchResult:
        result = await self.face_match.compare(
            selfie_url, document_image_url
        )
        return FaceMatchResult(
            match_score=result.get("similarity", 0),
            is_match=result.get("similarity", 0) > 0.75,
            quality_warnings=result.get("warnings", [])
        )
```

## Watchlist Screening

### PEP and Sanctions Screening

```python
class WatchlistScreener:
    def __init__(self, watchlist_providers: list[WatchlistProvider]):
        self.providers = watchlist_providers

    async def screen_customer(self, customer: CustomerData) -> ScreeningResult:
        all_hits = []
        for provider in self.providers:
            hits = await provider.search(
                full_name=customer.full_name,
                date_of_birth=customer.date_of_birth,
                country=customer.nationality,
                id_numbers=customer.id_numbers
            )
            all_hits.extend(hits)
        return ScreeningResult(
            customer_id=customer.id,
            hits=all_hits,
            total_hits=len(all_hits),
            high_risk_hits=[h for h in all_hits if h.risk_level == "high"],
            screened_at=datetime.utcnow()
        )

    async def continuous_monitoring(self, customer_id: str):
        while True:
            customer = await get_customer(customer_id)
            result = await self.screen_customer(customer)
            if result.high_risk_hits:
                await self._alert_compliance_team(result)
            await asyncio.sleep(86400)

@dataclass
class WatchlistHit:
    list_name: str
    match_type: str
    full_name: str
    risk_level: str
    match_score: float
    additional_info: dict = field(default_factory=dict)
```

## Risk Assessment

### Risk Scoring

```python
class RiskScorer:
    def __init__(self):
        self.factors: list[RiskFactor] = []

    def add_factor(self, factor: RiskFactor):
        self.factors.append(factor)

    async def calculate_risk(self, customer: CustomerData) -> RiskScore:
        score = 0
        max_score = 0
        details = []
        for factor in self.factors:
            factor_score, factor_max = await factor.evaluate(customer)
            score += factor_score
            max_score += factor_max
            details.append({
                "factor": factor.name,
                "score": factor_score,
                "max": factor_max,
                "weight": factor.weight
            })
        normalized = (score / max_score * 100) if max_score > 0 else 0
        risk_tier = self._tier_from_score(normalized)
        return RiskScore(
            customer_id=customer.id,
            total_score=normalized,
            risk_tier=risk_tier,
            factors=details,
            calculated_at=datetime.utcnow()
        )

    def _tier_from_score(self, score: float) -> str:
        if score < 20:
            return "low"
        elif score < 50:
            return "medium"
        elif score < 80:
            return "high"
        return "critical"

class RiskFactor(ABC):
    def __init__(self, name: str, weight: float = 1.0):
        self.name = name
        self.weight = weight

    @abstractmethod
    async def evaluate(self, customer: CustomerData) -> tuple[float, float]:
        pass

class CountryRiskFactor(RiskFactor):
    HIGH_RISK_COUNTRIES = {"IR", "KP", "SY", "CU", "MM"}
    def __init__(self):
        super().__init__("country_risk", weight=3.0)

    async def evaluate(self, customer):
        country = customer.country_of_residence
        if country in self.HIGH_RISK_COUNTRIES:
            return (90, 100)
        return (10, 100)

class TransactionVolumeFactor(RiskFactor):
    def __init__(self):
        super().__init__("transaction_volume", weight=2.0)

    async def evaluate(self, customer):
        monthly_volume = await get_monthly_volume(customer.id)
        if monthly_volume > 100000:
            return (80, 100)
        elif monthly_volume > 50000:
            return (50, 100)
        return (10, 100)
```

## Transaction Monitoring

### Rule-Based Monitoring

```python
class TransactionMonitor:
    def __init__(self):
        self.rules: list[MonitoringRule] = []

    def add_rule(self, rule: MonitoringRule):
        self.rules.append(rule)

    async def evaluate_transaction(self, tx: Transaction) -> list[Alert]:
        alerts = []
        for rule in self.rules:
            if await rule.matches(tx):
                alert = Alert(
                    transaction_id=tx.id,
                    rule_name=rule.name,
                    severity=rule.severity,
                    reason=rule.description,
                    customer_id=tx.customer_id,
                    amount=tx.amount
                )
                alerts.append(alert)
        return alerts

class MonitoringRule(ABC):
    def __init__(self, name: str, severity: str,
                 description: str):
        self.name = name
        self.severity = severity
        self.description = description

    @abstractmethod
    async def matches(self, tx: Transaction) -> bool:
        pass

class StructuringRule(MonitoringRule):
    def __init__(self, threshold: float = 10000,
                 window_hours: int = 24,
                 min_transactions: int = 3):
        super().__init__(
            name="structuring_detection",
            severity="high",
            description="Multiple transactions just below threshold"
        )
        self.threshold = threshold
        self.window_hours = window_hours
        self.min_transactions = min_transactions

    async def matches(self, tx: Transaction) -> bool:
        if tx.amount >= self.threshold:
            return False
        recent = await get_recent_transactions(
            tx.customer_id, self.window_hours
        )
        near_threshold = [
            t for t in recent
            if t.amount < self.threshold
            and t.amount > self.threshold * 0.7
        ]
        return len(near_transaction) >= self.min_transactions

class VelocityRule(MonitoringRule):
    def __init__(self, max_amount: float = 50000,
                 time_window_hours: int = 24):
        super().__init__(
            name="velocity_check",
            severity="medium",
            description="Transaction velocity exceeds threshold"
        )
        self.max_amount = max_amount
        self.time_window_hours = time_window_hours

    async def matches(self, tx: Transaction) -> bool:
        window_total = await get_transaction_total(
            tx.customer_id, self.time_window_hours
        )
        return (window_total + tx.amount) > self.max_amount
```

## Case Management

```python
class ComplianceCaseManager:
    def __init__(self):
        self.cases: dict[str, ComplianceCase] = {}

    async def create_case(self, alert: Alert) -> ComplianceCase:
        case = ComplianceCase(
            id=str(uuid4()),
            customer_id=alert.customer_id,
            transaction_id=alert.transaction_id,
            priority=self._determine_priority(alert.severity),
            description=alert.reason,
            alerts=[alert]
        )
        self.cases[case.id] = case
        await self._notify_compliance_officer(case)
        return case

    async def assign_case(self, case_id: str,
                           officer_id: str):
        case = self.cases.get(case_id)
        if not case:
            raise CaseNotFoundError(case_id)
        case.assigned_officer = officer_id
        case.status = "in_review"
        await self._send_assignment(case, officer_id)

    async def resolve_case(self, case_id: str,
                            resolution: CaseResolution):
        case = self.cases.get(case_id)
        case.status = "resolved"
        case.resolution = resolution
        case.resolved_at = datetime.utcnow()
        if resolution.action == "escalate":
            await self._escalate_to_regulator(case, resolution)
        elif resolution.action == "dismiss":
            await self._dismiss_alerts(case)

    def _determine_priority(self, severity: str) -> str:
        mapping = {
            "critical": "P0",
            "high": "P1",
            "medium": "P2",
            "low": "P3"
        }
        return mapping.get(severity, "P3")
```

## Regulatory Reporting

```python
class RegulatoryReporter:
    def __init__(self, report_endpoint: str, api_key: str):
        self.endpoint = report_endpoint
        self.api_key = api_key

    async def file_sar(self, suspicious_activity: SuspiciousActivity) -> str:
        report = self._build_sar_report(suspicious_activity)
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.endpoint}/sar",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=report
            ) as resp:
                if resp.status != 200:
                    raise FilingError(await resp.text())
                result = await resp.json()
                return result.get("filing_reference")

    def _build_sar_report(self, activity: SuspiciousActivity) -> dict:
        return {
            "filing_type": "SAR",
            "subject": {
                "full_name": activity.customer.full_name,
                "dob": activity.customer.date_of_birth.isoformat(),
                "address": activity.customer.address,
                "id_numbers": [
                    {"type": id.type, "number": id.number}
                    for id in activity.customer.id_numbers
                ]
            },
            "suspicious_activity": {
                "description": activity.description,
                "timeframe": {
                    "from": activity.period_start.isoformat(),
                    "to": activity.period_end.isoformat()
                },
                "total_amount": float(activity.total_amount),
                "transaction_count": activity.transaction_count,
                "indicators": activity.red_flags
            },
            "filer": {
                "organization": "Fintech Corp",
                "filing_date": datetime.utcnow().isoformat()
            }
        }
```

## Key Points

- Identity verification uses document checks, biometrics, and liveness detection with configurable thresholds.
- Watchlist screening checks customers against PEP lists, sanctions lists, and adverse media databases.
- Continuous monitoring re-screens customers daily for changes in watchlist status.
- Risk scoring aggregates weighted factors (country, transaction volume, business type) into tiers.
- Transaction monitoring applies rules for structuring, velocity, and unusual pattern detection.
- Case management tracks alerts through investigation, assignment, and resolution workflows.
- SAR filing automates regulatory reporting with structured data and evidence attachment.
- Audit trails record all KYC/AML decisions, actions, and officer assignments for regulator review.
