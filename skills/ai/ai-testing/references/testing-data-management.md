# Testing Data Management

## Overview
Testing data for LLMs includes golden datasets, edge case collections, adversarial examples, and production traces. Proper management ensures data quality, versioning, freshness, and traceability.

## Dataset Types

### Golden Dataset
A curated set of input-output pairs representing expected model behavior. Used for regression testing, model comparison, and quality gates.

```python
class GoldenDataset:
    def __init__(self, version: str, examples: list[dict]):
        self.version = version
        self.examples = examples
        self.created_at = datetime.utcnow().isoformat()

    def validate(self) -> list[str]:
        issues = []
        for i, ex in enumerate(self.examples):
            required = ["input", "expected_output", "category"]
            for field in required:
                if field not in ex:
                    issues.append(f"Example {i}: missing '{field}'")
            if "metadata" in ex:
                if "source" not in ex["metadata"]:
                    issues.append(f"Example {i}: metadata missing 'source'")
        return issues

    def sample(self, n: int, category: str | None = None) -> "GoldenDataset":
        filtered = [e for e in self.examples if category is None or e.get("category") == category]
        sampled = random.sample(filtered, min(n, len(filtered)))
        return GoldenDataset(f"{self.version}-sample", sampled)

    def statistics(self) -> dict:
        categories = Counter(e.get("category", "unknown") for e in self.examples)
        difficulties = Counter(e.get("difficulty", "medium") for e in self.examples)
        avg_input_len = statistics.mean([len(str(e["input"])) for e in self.examples])
        avg_output_len = statistics.mean([len(str(e["expected_output"])) for e in self.examples])
        return {
            "total": len(self.examples),
            "categories": dict(categories),
            "difficulties": dict(difficulties),
            "avg_input_length": avg_input_len,
            "avg_output_length": avg_output_len,
        }
```

### Production Trace Dataset
Sampled from production traffic. Represents real user queries and model responses.

```python
class ProductionTraceDataset:
    def __init__(self, trace_source: str):
        self.traces = []
        self.source = trace_source

    def collect_from_production(self, hours: int = 24, sample_rate: float = 0.01):
        end = datetime.utcnow()
        start = end - timedelta(hours=hours)
        raw_traces = self.query_traces(start, end)

        for trace in raw_traces:
            if random.random() < sample_rate:
                self.traces.append({
                    "input": trace.input,
                    "output": trace.output,
                    "user_id": trace.user_id,
                    "model": trace.model,
                    "latency_ms": trace.latency_ms,
                    "timestamp": trace.timestamp.isoformat(),
                    "feedback_score": trace.feedback_score,
                })

    def filter_by_quality(self, min_feedback: int = 3) -> list[dict]:
        return [t for t in self.traces if (t.get("feedback_score") or 0) >= min_feedback]

    def extract_edge_cases(self) -> list[dict]:
        edges = []
        for t in self.traces:
            if len(t["input"]) > 1000:
                edges.append({**t, "reason": "very_long_input"})
            elif len(t["input"]) < 5:
                edges.append({**t, "reason": "very_short_input"})
            elif t.get("latency_ms", 0) > 10000:
                edges.append({**t, "reason": "high_latency"})
        return edges
```

## Storage and Versioning

### Dataset Registry
```python
class DatasetRegistry:
    def __init__(self, storage_path: str):
        self.storage = Path(storage_path)
        self.storage.mkdir(parents=True, exist_ok=True)
        self.manifest = self._load_manifest()

    def register(self, dataset: GoldenDataset, name: str, tags: list[str] = None):
        path = self.storage / f"{name}-{dataset.version}.json"
        with open(path, "w") as f:
            json.dump({
                "name": name,
                "version": dataset.version,
                "created_at": dataset.created_at,
                "tags": tags or [],
                "statistics": dataset.statistics(),
                "examples": dataset.examples,
            }, f)

        entry = {
            "name": name,
            "version": dataset.version,
            "path": str(path),
            "tags": tags or [],
            "examples": len(dataset.examples),
        }
        self.manifest["datasets"].append(entry)
        self._save_manifest()

    def get_latest(self, name: str) -> dict:
        versions = [d for d in self.manifest["datasets"] if d["name"] == name]
        if not versions:
            raise ValueError(f"No dataset found: {name}")
        latest = max(versions, key=lambda d: d["version"])
        with open(latest["path"]) as f:
            return json.load(f)

    def list_datasets(self, tag: str | None = None) -> list[dict]:
        if tag:
            return [d for d in self.manifest["datasets"] if tag in d.get("tags", [])]
        return self.manifest["datasets"]

    def diff_versions(self, name: str, v1: str, v2: str) -> dict:
        d1 = self.get_version(name, v1)
        d2 = self.get_version(name, v2)

        set1 = {(e["input"], json.dumps(e["expected_output"])) for e in d1["examples"]}
        set2 = {(e["input"], json.dumps(e["expected_output"])) for e in d2["examples"]}

        return {
            "added": len(set2 - set1),
            "removed": len(set1 - set2),
            "unchanged": len(set1 & set2),
        }
```

### Dataset Lifecycle
```python
class DatasetLifecycle:
    STAGES = ["development", "staging", "production", "archived"]

    def __init__(self):
        self.stage_map = {}

    def promote(self, dataset_name: str, version: str, to_stage: str):
        if to_stage not in self.STAGES:
            raise ValueError(f"Invalid stage: {to_stage}")

        entry = {
            "dataset": dataset_name,
            "version": version,
            "stage": to_stage,
            "promoted_at": datetime.utcnow().isoformat(),
            "promoted_by": get_current_user(),
        }
        self.stage_map[f"{dataset_name}@{version}"] = entry

    def get_current_production(self, dataset_name: str) -> dict | None:
        versions = [
            (k, v) for k, v in self.stage_map.items()
            if k.startswith(dataset_name) and v["stage"] == "production"
        ]
        if versions:
            return max(versions, key=lambda x: x[1]["promoted_at"])[1]
        return None

    def auto_archive(self, days_inactive: int = 90):
        cutoff = datetime.utcnow() - timedelta(days=days_inactive)
        for key, entry in list(self.stage_map.items()):
            promoted = datetime.fromisoformat(entry["promoted_at"])
            if promoted < cutoff and entry["stage"] == "production":
                entry["stage"] = "archived"
```

## Quality Gates

### Data Quality Checks
```python
class DataQualityGate:
    def check_dataset(self, dataset: GoldenDataset) -> dict:
        results = {
            "size_ok": self._check_size(dataset),
            "diversity_ok": self._check_diversity(dataset),
            "balance_ok": self._check_category_balance(dataset),
            "freshness_ok": self._check_freshness(dataset),
            "noise_ok": self._check_noise_level(dataset),
        }
        results["all_passed"] = all(results.values())
        return results

    def _check_size(self, dataset: GoldenDataset) -> bool:
        return len(dataset.examples) >= 50

    def _check_diversity(self, dataset: GoldenDataset) -> bool:
        unique_inputs = len(set(e["input"] for e in dataset.examples))
        return unique_inputs / max(len(dataset.examples), 1) > 0.8

    def _check_category_balance(self, dataset: GoldenDataset) -> bool:
        categories = Counter(e.get("category", "other") for e in dataset.examples)
        max_cat = max(categories.values())
        min_cat = min(categories.values())
        return max_cat / max(min_cat, 1) < 5

    def _check_freshness(self, dataset: GoldenDataset) -> bool:
        created = datetime.fromisoformat(dataset.created_at)
        return (datetime.utcnow() - created).days < 30

    def _check_noise_level(self, dataset: GoldenDataset) -> bool:
        noise_count = sum(
            1 for e in dataset.examples
            if e.get("metadata", {}).get("quality_flag") == "noisy"
        )
        return noise_count / max(len(dataset.examples), 1) < 0.05
```

## Synthetic Data Generation

```python
class SyntheticDataGenerator:
    def __init__(self, llm_model):
        self.model = llm_model

    def generate_test_cases(self, template: dict, n: int = 100) -> list[dict]:
        cases = []
        for category, instruction in template.items():
            prompt = f"""
Generate {n // len(template)} {category} test cases for LLM evaluation.
Each case should be realistic and diverse.
Include: input, expected_output, difficulty (easy/medium/hard).
Format as JSON list.
"""
            response = self.model.generate(prompt)
            cases.extend(json.loads(response))
        return cases

    def augment_dataset(self, base: list[dict], factor: int = 3) -> list[dict]:
        augmented = list(base)
        for example in base:
            for i in range(factor - 1):
                variant = self._create_variant(example, i)
                augmented.append(variant)
        return augmented
```

## Key Points
- Maintain golden datasets with versioning and full metadata
- Collect production traces at a controlled sample rate
- Implement dataset lifecycle: dev → staging → production → archive
- Run quality gates before promoting datasets
- Track dataset statistics for drift detection
- Automate synthetic data generation for edge cases
- Version control test data alongside code
- Refresh golden datasets monthly to prevent staleness
- Balance categories and difficulties in all datasets
- Document dataset provenance (source, date of collection, curation method)
