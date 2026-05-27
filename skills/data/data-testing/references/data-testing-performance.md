# Data Testing Performance

## Performance Testing for Data Pipelines

Data testing must be fast enough to run in CI/CD without blocking development velocity.

### Test Execution Optimization

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Callable

class OptimizedTestRunner:
    def __init__(self, max_workers: int = 8):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def run_tests_parallel(self, tests: list[DataTest]) -> list[TestResult]:
        futures = {self.executor.submit(t.execute): t for t in tests}
        results = []

        for future in as_completed(futures):
            test = futures[future]
            try:
                result = future.result(timeout=300)
                results.append(result)
            except TimeoutError:
                results.append(TestResult(
                    name=test.name,
                    passed=False,
                    error=f"Test timed out after 300s",
                    duration=300,
                ))

        return results

    def run_tests_incremental(self, tests: list[DataTest],
                               changed_tables: list[str]) -> list[TestResult]:
        relevant_tests = [
            t for t in tests
            if any(table in t.tables for table in changed_tables)
        ]
        return self.run_tests_parallel(relevant_tests)
```

### Test Data Sampling

```python
class TestDataSampler:
    def __init__(self, sample_rate: float = 0.01, max_rows: int = 100000):
        self.sample_rate = sample_rate
        self.max_rows = max_rows

    def get_sample_query(self, table: str, distribution_col: str = None) -> str:
        if distribution_col:
            return f"""
            SELECT * FROM {table} TABLESAMPLE SYSTEM({self.sample_rate * 100})
            WHERE {distribution_col} IS NOT NULL
            """
        return f"""
        SELECT * FROM {table} TABLESAMPLE BERNOULLI({self.sample_rate * 100})
        LIMIT {self.max_rows}
        """

    def stratified_sample(self, table: str, strata_col: str,
                          samples_per_stratum: int = 1000) -> str:
        return f"""
        SELECT * FROM (
            SELECT *, ROW_NUMBER() OVER (
                PARTITION BY {strata_col}
                ORDER BY RANDOM()
            ) AS rn
            FROM {table}
        ) WHERE rn <= {samples_per_stratum}
        """
```

## Test Caching

```python
class TestResultCache:
    def __init__(self, redis_client: Redis, ttl_seconds: int = 3600):
        self.redis = redis_client
        self.ttl = ttl_seconds

    def get_cached(self, test_name: str, table_hash: str) -> TestResult | None:
        cache_key = f"test:{test_name}:{table_hash}"
        cached = self.redis.get(cache_key)
        if cached:
            return TestResult.parse_raw(cached)
        return None

    def cache_result(self, test_name: str, table_hash: str, result: TestResult):
        cache_key = f"test:{test_name}:{table_hash}"
        self.redis.setex(cache_key, self.ttl, result.json())

    def invalidate_table(self, table: str):
        # Invalidate all test results for this table
        pattern = f"test:*:{hash(table)}"
        for key in self.redis.scan_iter(match=pattern):
            self.redis.delete(key)
```

## Key Points

- Parallel test execution with configurable worker count
- Incremental testing runs only tests for changed tables
- Bernoulli and system sampling for test data
- Stratified sampling ensures representation across categories
- 300-second timeout per test to prevent CI pipeline blocking
- Test result caching with 1-hour TTL
- Cache invalidation on table changes
- Test data sampling: 1% sample or 100K rows max
- Sample size ensures statistical significance
- Profile slow tests and optimize or skip in CI
