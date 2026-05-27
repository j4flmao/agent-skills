# Pipeline CI/CD Environment Management

## Multi-Environment Promotion

Data pipelines require structured environment promotion from development through production.

### Environment Strategy

```python
from enum import Enum
from datetime import datetime

class Environment(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class EnvironmentManager:
    def __init__(self):
        self.environments = {
            Environment.DEVELOPMENT: EnvConfig(
                schema_prefix="dev_",
                data_freshness="latest",
                quality_gates=False,
                auto_deploy=True,
            ),
            Environment.STAGING: EnvConfig(
                schema_prefix="stg_",
                data_freshness="t-1",
                quality_gates=["schema", "volume"],
                auto_deploy=False,
            ),
            Environment.PRODUCTION: EnvConfig(
                schema_prefix="",
                data_freshness="t-1",
                quality_gates=["schema", "volume", "freshness", "custom"],
                auto_deploy=False,
                approval_required=True,
            ),
        }

    def promote(self, pipeline: str, source: Environment, target: Environment):
        if not self._quality_gates_pass(pipeline, target):
            raise PromotionError(f"Quality gates failed for promotion to {target.value}")

        if self.environments[target].approval_required:
            self._request_approval(pipeline, source, target)
        else:
            self._execute_promotion(pipeline, source, target)
```

### Data Environment Isolation

```python
class DataEnvironment:
    def __init__(self, env: Environment):
        self.env = env
        self._setup_isolation()

    def _setup_isolation(self):
        if self.env == Environment.DEVELOPMENT:
            self._schema_prefix = "dev_"
            self._use_sampled_data = True
            self._sample_rate = 0.01
            self._parallelism = 1
        elif self.env == Environment.STAGING:
            self._schema_prefix = "stg_"
            self._use_sampled_data = True
            self._sample_rate = 0.1
            self._parallelism = 2
        else:
            self._schema_prefix = ""
            self._use_sampled_data = False
            self._sample_rate = 1.0
            self._parallelism = 8

    def get_table_ref(self, table_name: str) -> str:
        return f"{self._schema_prefix}{table_name}"

    def get_config(self) -> dict:
        return {
            "schema_prefix": self._schema_prefix,
            "sample_rate": self._sample_rate,
            "parallelism": self._parallelism,
        }
```

## Promotion Pipeline

```python
class PromotionPipeline:
    def __init__(self):
        self.stages: list[PromotionStage] = [
            PromotionStage("lint", "Run SQL linting"),
            PromotionStage("compile", "Compile dbt models"),
            PromotionStage("test_schema", "Schema tests"),
            PromotionStage("test_data", "Data quality tests"),
            PromotionStage("deploy", "Deploy to target"),
        ]

    def execute(self, pipeline: str, target_env: Environment):
        results = []
        for stage in self.stages:
            result = stage.run(pipeline, target_env)
            results.append(result)
            if not result.passed and stage.blocking:
                return PromotionResults(failed_stage=stage.name, results=results)
        return PromotionResults(passed=True, results=results)
```

## Key Points

- Schema prefixes (dev_, stg_) isolate environments in shared databases
- Development uses 1% sampled data for fast iteration
- Staging uses 10% sampled data with schema tests
- Production uses full data with all quality gates
- Auto-deploy for development, approval for production
- Quality gates escalate: schema only → +volume → +freshness → +custom tests
- Promotion pipeline: lint → compile → test → deploy
- Rollback procedure: revert schema and re-deploy previous version
- Environment parity ensures staging matches production
- Data retention: dev (7 days), staging (30 days), production (indefinite)
