# Fraud Detection

## Detection Architecture

### Layered Approach
```
Rule Engine → ML Scoring → Behavior Analysis → Manual Review
     ↓             ↓              ↓                  ↓
   Block      Hold/Flag        Escalate          Review Queue
```

### Detection Pipeline
```python
class FraudDetectionPipeline:
    def __init__(self):
        self.rules: list[Rule] = []
        self.models: list[MLModel] = []
        self.behavioral: list[BehavioralAnalyzer] = []

    async def evaluate(self, transaction: Transaction) -> FraudAssessment:
        score = 0.0
        reasons = []

        # Rule evaluation
        for rule in self.rules:
            if rule.matches(transaction):
                score += rule.weight
                reasons.append(rule.name)

        # ML score
        for model in self.models:
            model_score = await model.predict(transaction)
            score += model_score * model.weight
            if model_score > model.threshold:
                reasons.append(f"ml:{model.name}")

        # Behavioral analysis
        for analyzer in self.behavioral:
            behavior_score = await analyzer.analyze(transaction)
            score += behavior_score
            if behavior_score > analyzer.threshold:
                reasons.append(f"behavior:{analyzer.name}")

        return FraudAssessment(
            score=score,
            reasons=reasons,
            action=self.decide_action(score),
        )

    def decide_action(self, score: float) -> str:
        if score >= 80:
            return "block"
        elif score >= 50:
            return "review"
        elif score >= 20:
            return "flag"
        return "approve"
```

## Rule Engine

### Rule Definition
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class Rule(ABC):
    name: str
    weight: float
    enabled: bool = True

    @abstractmethod
    def matches(self, transaction: Transaction) -> bool:
        pass

class VelocityRule(Rule):
    def __init__(self, max_count: int, window_seconds: int, **kwargs):
        super().__init__(**kwargs)
        self.max_count = max_count
        self.window_seconds = window_seconds

    async def matches(self, transaction: Transaction) -> bool:
        count = await transaction_store.count_recent(
            field="card_fingerprint",
            value=transaction.card_fingerprint,
            window_seconds=self.window_seconds,
        )
        return count >= self.max_count

class AmountRule(Rule):
    def __init__(self, max_amount: float, **kwargs):
        super().__init__(**kwargs)
        self.max_amount = max_amount

    def matches(self, transaction: Transaction) -> bool:
        return transaction.amount > self.max_amount

class GeoAnomalyRule(Rule):
    async def matches(self, transaction: Transaction) -> bool:
        last_location = await transaction_store.get_last_location(
            transaction.user_id
        )
        if not last_location:
            return False
        distance = haversine_distance(
            last_location, transaction.location
        )
        time_diff = transaction.timestamp - last_location.timestamp
        return distance / time_diff.hours > 800  # km/h impossible
```

### Rule Configuration
```python
rules_config = [
    {
        "type": "velocity",
        "name": "rapid_transactions",
        "weight": 40,
        "max_count": 5,
        "window_seconds": 300,
    },
    {
        "type": "amount",
        "name": "high_value",
        "weight": 30,
        "max_amount": 10000,
    },
    {
        "type": "geo_anomaly",
        "name": "impossible_travel",
        "weight": 50,
    },
    {
        "type": "country_block",
        "name": "high_risk_country",
        "weight": 60,
        "blocked_countries": ["XX", "YY", "ZZ"],
    },
    {
        "type": "new_account",
        "name": "new_account_high_value",
        "weight": 35,
        "max_account_age_hours": 24,
        "max_amount": 1000,
    },
]
```

## Machine Learning Scoring

### Feature Engineering
```python
import pandas as pd
from datetime import datetime, timedelta

class FeatureExtractor:
    async def extract_features(self, transaction: Transaction) -> dict:
        features = {}

        # Transaction features
        features["amount"] = transaction.amount
        features["amount_deviation"] = await self.amount_deviation(transaction)
        features["is_high_risk_currency"] = transaction.currency in HIGH_RISK_CURRENCIES

        # User features
        features["account_age_days"] = await self.account_age(transaction.user_id)
        features["past_30d_volume"] = await self.user_volume(transaction.user_id, days=30)
        features["past_30d_failures"] = await self.user_failures(transaction.user_id)
        features["device_fingerprint_exists"] = transaction.device_id is not None

        # Card features
        features["card_age_days"] = await self.card_age(transaction.card_fingerprint)
        features["is_bin_prepaid"] = await self.is_bin_prepaid(transaction.card_bin)
        features["card_attempts_today"] = await self.card_attempts(transaction.card_fingerprint)

        # Behavioral features
        features["hour_of_day"] = transaction.timestamp.hour
        features["is_weekend"] = transaction.timestamp.weekday() >= 5
        features["ip_country_match"] = await self.check_ip_country_match(
            transaction.ip_address, transaction.billing_country
        )

        return features

    async def amount_deviation(self, transaction: Transaction) -> float:
        avg = await transaction_store.get_user_avg_amount(transaction.user_id)
        if avg == 0:
            return 0
        return (transaction.amount - avg) / avg
```

### Model Training Pipeline
```python
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_curve
import joblib

class FraudModelTrainer:
    def __init__(self, feature_extractor: FeatureExtractor):
        self.feature_extractor = feature_extractor

    async def train(self, start_date: datetime, end_date: datetime):
        transactions = await transaction_store.get_labeled(
            start_date, end_date
        )

        X = []
        y = []
        for txn in transactions:
            features = await self.feature_extractor.extract_features(txn)
            X.append(features)
            y.append(1 if txn.is_fraud else 0)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )

        model.fit(X_train, y_train)

        # Evaluate
        y_pred = model.predict_proba(X_test)[:, 1]
        precision, recall, thresholds = precision_recall_curve(y_test, y_pred)

        # Find optimal threshold
        f1_scores = 2 * (precision[:-1] * recall[:-1]) / (precision[:-1] + recall[:-1] + 1e-10)
        best_threshold = thresholds[f1_scores.argmax()]

        return {
            "model": model,
            "threshold": best_threshold,
            "precision": precision[f1_scores.argmax()],
            "recall": recall[f1_scores.argmax()],
            "feature_importance": dict(zip(
                X[0].keys(), model.feature_importances_
            )),
        }

    async def deploy_model(self, model, threshold: float):
        joblib.dump(model, "models/fraud_model.pkl")
        await config_store.set("fraud_model_threshold", threshold)
        await config_store.set("fraud_model_version", datetime.utcnow().isoformat())
```

## Behavioral Analysis

### User Behavior Profile
```python
class UserBehaviorProfile:
    def __init__(self, user_id: str):
        self.user_id = user_id

    async def build(self) -> dict:
        return {
            "typical_amount_range": await self.typical_amounts(),
            "usual_hours": await self.active_hours(),
            "common_devices": await self.known_devices(),
            "typical_locations": await self.frequent_locations(),
            "payment_methods": await self.used_payment_methods(),
            "purchase_frequency": await self.purchase_frequency(),
        }

    async def detect_anomaly(self, transaction: Transaction) -> float:
        profile = await self.build()
        anomalies = 0

        # Amount anomaly
        min_amt, max_amt = profile["typical_amount_range"]
        if transaction.amount > max_amt * 3:
            anomalies += 20
        elif transaction.amount > max_amt * 2:
            anomalies += 10

        # Time anomaly
        if transaction.timestamp.hour not in profile["usual_hours"]:
            anomalies += 15

        # Device anomaly
        if transaction.device_id not in profile["common_devices"]:
            anomalies += 25

        # Location anomaly
        if not self.is_near_location(transaction, profile["typical_locations"]):
            anomalies += 20

        return min(anomalies, 100)
```

## Real-Time Scoring

### Async Scoring Service
```python
class FraudScoringService:
    def __init__(self):
        self.rule_engine = RuleEngine()
        self.ml_scorer = MLScorer()
        self.behavior_analyzer = BehaviorAnalyzer()
        self.cache = RedisCache()

    async def score_transaction(self, transaction: Transaction) -> FraudScore:
        # Check cache for similar transaction
        cache_key = f"fraud_score:{transaction.fingerprint}"
        cached = await self.cache.get(cache_key)
        if cached:
            return FraudScore.from_dict(cached)

        # Run all detectors in parallel
        rule_score, ml_score, behavior_score = await asyncio.gather(
            self.rule_engine.evaluate(transaction),
            self.ml_scorer.predict(transaction),
            self.behavior_analyzer.analyze(transaction),
        )

        score = FraudScore(
            transaction_id=transaction.id,
            total_score=(
                rule_score.total * 0.3 +
                ml_score * 0.5 +
                behavior_score * 0.2
            ),
            rule_results=rule_score.details,
            ml_probability=ml_score,
            behavior_anomalies=behavior_score.details,
            timestamp=datetime.utcnow(),
        )

        # Cache for dedup
        await self.cache.set(cache_key, score.to_dict(), ttl=60)

        return score
```

## Review Queue

### Case Management
```python
@dataclass
class FraudCase:
    id: str
    transaction_id: str
    user_id: str
    risk_score: float
    reasons: list[str]
    status: str  # pending, reviewing, resolved
    assigned_to: str | None
    created_at: datetime
    resolved_at: datetime | None
    resolution: str | None  # legitimate, fraud, false_positive

class FraudReviewQueue:
    def __init__(self, case_store):
        self.case_store = case_store

    async def create_case(self, assessment: FraudAssessment, transaction: Transaction):
        case = FraudCase(
            id=generate_id(),
            transaction_id=transaction.id,
            user_id=transaction.user_id,
            risk_score=assessment.score,
            reasons=assessment.reasons,
            status="pending",
            created_at=datetime.utcnow(),
        )
        await self.case_store.save(case)
        await self.notify_reviewers(case)
        return case

    async def assign_case(self, case_id: str, reviewer: str):
        await self.case_store.update(case_id, {
            "status": "reviewing",
            "assigned_to": reviewer,
        })

    async def resolve_case(self, case_id: str, resolution: str, reviewer: str):
        await self.case_store.update(case_id, {
            "status": "resolved",
            "resolution": resolution,
            "resolved_by": reviewer,
            "resolved_at": datetime.utcnow(),
        })

        if resolution == "fraud":
            await self.action_service.block_user(case_id)
        elif resolution == "false_positive":
            await self.action_service.mark_safe(case_id)
```

## Monitoring and Dashboards

### Fraud Metrics
```python
class FraudMetrics:
    def __init__(self, meter):
        self.blocked_count = meter.create_counter("fraud.blocked")
        self.flagged_count = meter.create_counter("fraud.flagged")
        self.false_positive = meter.create_counter("fraud.false_positive")
        self.review_time = meter.create_histogram("fraud.review_time_seconds")

    def record_block(self, reason: str):
        self.blocked_count.add(1, {"reason": reason})

    def record_review(self, case: FraudCase):
        if case.resolved_at and case.created_at:
            duration = (case.resolved_at - case.created_at).total_seconds()
            self.review_time.record(duration, {"resolution": case.resolution})
```

## Key Points
- Layered fraud detection: rules → ML → behavioral → manual review
- Rule engine evaluates velocity, amount, geo-anomaly, and other patterns
- ML model scoring with gradient boosting provides probability estimates
- Feature engineering extracts transaction, user, card, and behavioral signals
- Behavioral profiling detects deviations from user's normal patterns
- Real-time scoring caches results for deduplication within time windows
- Review queue with case management handles manual review workflow
- False positive tracking improves model accuracy over time
