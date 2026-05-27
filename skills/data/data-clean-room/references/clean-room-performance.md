# Clean Room Performance Optimization

## Query Performance in Clean Rooms

Clean rooms impose query constraints for privacy, which requires specific performance optimizations.

### Query Constraint Layer

```python
class CleanRoomQueryEngine:
    def __init__(self, backend: QueryBackend):
        self.backend = backend
        self.constraints = QueryConstraints(
            max_rows_returned=1000,
            min_group_size=5,
            allowed_aggregations={"COUNT", "SUM", "AVG", "MEDIAN"},
            forbidden_columns={"user_id", "email", "phone"},
            max_join_conditions=3,
        )

    def validate_and_optimize(self, query: str) -> OptimizedPlan:
        parsed = self._parse(query)
        violations = self._check_constraints(parsed)

        if violations:
            return OptimizedPlan(
                valid=False,
                violations=[str(v) for v in violations],
                suggested_fix=self._suggest_fix(violations),
            )

        optimized = self._apply_optimizations(parsed)
        return OptimizedPlan(valid=True, plan=optimized)

    def _apply_optimizations(self, parsed: ParsedQuery) -> str:
        optimizations = [
            self._pushdown_filters,
            self._pre_aggregate,
            self._limit_pushdown,
            self._use_materialized_views,
        ]
        for opt in optimizations:
            parsed = opt(parsed)
        return parsed.to_sql()

    def _pre_aggregate(self, parsed: ParsedQuery) -> ParsedQuery:
        if parsed.has_filter and not parsed.has_join:
            parsed.add_hint("/*+ AGGREGATE_OPTIMIZER */")
        return parsed
```

### Join Key Optimization

```python
class JoinKeyManager:
    def __init__(self):
        self.join_keys: dict[str, JoinKey] = {}

    def register_key(self, key: JoinKey):
        self.join_keys[key.id] = key
        self._create_bloom_filter(key)

    def _create_bloom_filter(self, key: JoinKey):
        from pybloom_live import BloomFilter
        bloom = BloomFilter(capacity=key.expected_cardinality, error_rate=0.001)
        for value in key.sample_values:
            bloom.add(value)
        key.bloom_filter = bloom

    def estimate_join_size(self, key_a: str, key_b: str) -> int:
        ka = self.join_keys[key_a]
        kb = self.join_keys[key_b]
        intersection_estimate = sum(
            1 for v in ka.sample_values if v in kb.bloom_filter
        )
        ratio = intersection_estimate / len(ka.sample_values)
        return int(ka.cardinality * ratio)
```

## Privacy Budget Tracking

```python
class PrivacyBudgetTracker:
    def __init__(self, epsilon_total: float = 1.0):
        self.epsilon_total = epsilon_total
        self.epsilon_spent = 0.0
        self.query_log: list[QueryBudget] = []

    def request_budget(self, epsilon_requested: float) -> bool:
        if self.epsilon_spent + epsilon_requested > self.epsilon_total:
            return False
        return True

    def consume(self, query_id: str, epsilon: float):
        self.epsilon_spent += epsilon
        self.query_log.append(QueryBudget(
            query_id=query_id,
            epsilon=epsilon,
            remaining=self.epsilon_total - self.epsilon_spent,
            timestamp=datetime.utcnow(),
        ))

    def remaining_budget(self) -> float:
        return max(0.0, self.epsilon_total - self.epsilon_spent)
```

## Key Points

- Query constraint layer enforces row limits, min group size, allowed aggregations
- Pre-aggregation and filter pushdown optimize constrained queries
- Bloom filters estimate join intersection size without revealing data
- Privacy budget tracking prevents epsilon depletion
- Suggest query fixes when constraints are violated
- Materialized views pre-compute common aggregations
- Limit pushdown reduces data scanned in constrained queries
- Differential privacy noise calibrated to remaining budget
- Cache frequent query patterns with identical constraints
- Monitor query performance against baseline to detect regressions
