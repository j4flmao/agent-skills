# Data Testing Pipeline Integration

## Integrating Tests into Data Pipelines

Data testing must be embedded in the data pipeline, not a separate activity.

### Pipeline Test Stages

```python
from enum import Enum

class TestStage(Enum):
    SOURCE_VALIDATION = "source_validation"       # Validate source data before processing
    TRANSFORMATION = "transformation"              # Check intermediate results
    OUTPUT_VALIDATION = "output_validation"        # Validate final output before publishing
    CONSUMER_CONTRACT = "consumer_contract"        # Verify consumer expectations

class PipelineTestFramework:
    def __init__(self, pipeline_name: str):
        self.pipeline = pipeline_name
        self.tests: dict[TestStage, list[DataTest]] = {
            stage: [] for stage in TestStage
        }

    def add_test(self, stage: TestStage, test: DataTest):
        self.tests[stage].append(test)

    def execute_stage(self, stage: TestStage, context: ExecutionContext) -> StageResult:
        stage_tests = self.tests[stage]
        if not stage_tests:
            return StageResult(stage=stage, passed=True, skipped=True)

        results = []
        for test in stage_tests:
            result = test.execute(context)
            results.append(result)
            if not result.passed and test.blocking:
                return StageResult(
                    stage=stage,
                    passed=False,
                    results=results,
                    error=f"Blocking test failed: {test.name}",
                )

        return StageResult(stage=stage, passed=all(r.passed for r in results), results=results)
```

### Quality Gates

```python
class QualityGate:
    def __init__(self, name: str, min_score: float):
        self.name = name
        self.min_score = min_score

    def evaluate(self, metrics: dict[str, float]) -> GateResult:
        score = metrics.get(self.name, 0)
        passed = score >= self.min_score
        return GateResult(
            gate=self.name,
            score=score,
            threshold=self.min_score,
            passed=passed,
            gap=max(0, self.min_score - score),
        )

class PipelineGates:
    def __init__(self):
        self.gates = {
            "staging": [
                QualityGate("completeness", 0.90),
                QualityGate("schema_compatibility", 1.0),
            ],
            "production": [
                QualityGate("completeness", 0.99),
                QualityGate("accuracy", 0.95),
                QualityGate("freshness", 0.95),
                QualityGate("schema_compatibility", 1.0),
                QualityGate("volume_stability", 0.90),
            ],
        }

    def check_gates(self, environment: str, metrics: dict) -> GateCheckResult:
        gates = self.gates[environment]
        results = [g.evaluate(metrics) for g in gates]
        all_passed = all(r.passed for r in results)
        return GateCheckResult(environment=environment, passed=all_passed, gates=results)
```

## CI/CD Integration

```python
class DataTestCIPipeline:
    def __init__(self):
        self.stages = []

    def build_pipeline(self) -> list[CIPipelineStage]:
        return [
            CIPipelineStage("lint", "SQLFluff linting"),
            CIPipelineStage("unit", "dbt unit tests", parallel=True),
            CIPipelineStage("schema", "Schema validation tests"),
            CIPipelineStage("freshness", "Source freshness checks"),
            CIPipelineStage("volume", "Volume anomaly detection"),
            CIPipelineStage("quality", "Quality gate evaluation"),
        ]

    def should_deploy(self, test_results: list[StageResult]) -> bool:
        blocking_stages = {"lint", "schema", "quality"}
        for result in test_results:
            if result.stage in blocking_stages and not result.passed:
                return False
        return True
```

## Key Points

- Test stages embedded in pipeline: source → transform → output → consumer
- Quality gates per environment: staging (90%), production (99%)
- Blocking tests prevent pipeline progression
- CI/CD pipeline: lint → unit → schema → freshness → volume → quality gates
- Parallel test execution within stages
- Incremental testing for changed datasets only
- Test failures block deployment to production
- Contract tests verify consumer expectations
- Source validation catches upstream issues early
- Quality gate gap analysis shows improvement needed
