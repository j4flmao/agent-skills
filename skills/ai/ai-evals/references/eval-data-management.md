# Eval Data Management Strategies

## Overview

Eval data management covers the full lifecycle of evaluation datasets: creation, validation, versioning, storage, access control, governance, and deprecation. Poor data management leads to irreproducible results, data leakage, biased evaluations, and compliance risks.

## Data Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Creation │───▶│Validation│───▶│Versioning│───▶│ Storage  │───▶│Consumption│───▶│Archive/  │
│          │    │          │    │          │    │          │    │           │    │Delete    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Stage 1: Dataset Creation

#### Creation Methods

| Method | Quality | Cost | Speed | Best For |
|--------|---------|------|-------|----------|
| Hand-curated (experts) | Highest | High | Slow | Golden set, regression anchors |
| LLM-generated | Medium | Low | Fast | Large initial datasets, coverage |
| Production-sampled | High | Medium | Moderate | Real-world representation |
| User feedback | Variable | Low | Continuous | Long-tail issues |
| Adversarial (red-team) | N/A (edge cases) | Medium | Moderate | Safety, robustness |

#### Creation Standards

```yaml
creation_standards:
  metadata_required:
    - id: "unique identifier matching pattern {domain}-{number}"
    - category: "task category from taxonomy"
    - difficulty: "easy / medium / hard"
    - created_by: "creator identifier"
    - created_date: "ISO 8601 timestamp"
    - tags: ["array of relevant tags"]

  metadata_optional:
    - source: "origin of this example (production / synthetic / hand-written)"
    - notes: "context about why this example was created"
    - version_added: "dataset version when this example was first included"

  content_standards:
    - input: "must be representative of real user queries"
    - expected_output: "must be verified correct"
    - context: "must be sufficient to answer (for RAG evals)"
    - no_pii: "no personally identifiable information"
    - no_bias: "no demographic stereotypes or slurs"
```

### Stage 2: Dataset Validation

#### Automated Validation Pipeline

```python
class DatasetValidator:
    def __init__(self):
        self.checks = []

    def add_check(self, name: str, fn: callable, severity: str = "error"):
        self.checks.append({"name": name, "fn": fn, "severity": severity})

    def validate(self, dataset: list[dict]) -> dict:
        results = {"errors": [], "warnings": [], "passed": []}
        for check in self.checks:
            try:
                result = check["fn"](dataset)
                if result is True:
                    results["passed"].append(check["name"])
                else:
                    target = results["errors"] if check["severity"] == "error" else results["warnings"]
                    target.append({"check": check["name"], "message": result})
            except Exception as e:
                results["errors"].append({"check": check["name"], "message": str(e)})
        results["valid"] = len(results["errors"]) == 0
        return results

# Standard validators
def validate_min_size(dataset, min_examples=100):
    if len(dataset) < min_examples:
        return f"Dataset too small: {len(dataset)} (min {min_examples})"
    return True

def validate_metadata_completeness(dataset):
    missing = []
    required = ["id", "category", "difficulty", "input"]
    for i, ex in enumerate(dataset):
        for field in required:
            if field not in ex or ex[field] is None:
                missing.append(f"Example {i}: missing '{field}'")
    return missing if missing else True

def validate_category_distribution(dataset):
    categories = {}
    for ex in dataset:
        cat = ex.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1
    issues = []
    for cat, count in categories.items():
        if count < 20:
            issues.append(f"Category '{cat}' has only {count} examples (min 20)")
    return issues if issues else True

def validate_edge_case_coverage(dataset):
    edge = [e for e in dataset if e.get("difficulty") == "hard"]
    if len(edge) < len(dataset) * 0.15:
        return f"Only {len(edge)}/{len(dataset)} edge cases (<15%)"
    return True

def validate_no_duplicates(dataset):
    seen = set()
    dups = []
    for i, ex in enumerate(dataset):
        key = (ex.get("input", ""), ex.get("expected_output", ""))
        if key in seen:
            dups.append(f"Example {i}: duplicate of existing")
        seen.add(key)
    return dups if dups else True
```

#### Manual Validation

- Review 10% of new dataset entries (random sample).
- Review 100% of edge case entries.
- Two independent reviewers for hand-curated examples.
- Resolve disagreements by consensus or third reviewer.
- Maintain inter-rater reliability log (>80% agreement target).
- Document reviewer identity and date for audit trail.

### Stage 3: Versioning

#### Versioning Scheme

```
{major}.{minor}.{patch}

major: New categories, task types, or breaking format changes
minor: New examples added (10%+ change in size)
patch: Bug fixes (label corrections, metadata fixes, no semantic changes)
```

#### Version Implementation

```yaml
# metadata.yaml (stored alongside dataset)
dataset:
  name: "customer-support-eval"
  version: "3.2.0"
  created: "2026-03-15T10:00:00Z"
  last_modified: "2026-05-28T14:30:00Z"
  total_examples: 750
  schema_version: "2.0"
  format: "jsonl"
  compression: "gzip"

  splits:
    golden:       { count: 100, path: "golden.jsonl.gz" }
    synthetic:    { count: 400, path: "synthetic.jsonl.gz" }
    production:   { count: 200, path: "production.jsonl.gz" }
    adversarial:  { count: 50,  path: "adversarial.jsonl.gz" }

  lineage:
    base_version: "3.1.0"
    derived_from_run: null
    created_by: "eval-pipeline@v2.1"
    git_hash: "a1b2c3d4e5f6"

  quality_metrics:
    annotator_agreement: 0.87
    validation_errors: 0
    manual_review_sample: 0.10
```

#### Change Log

```yaml
changelog:
  - version: "3.0.0"
    date: "2026-01-15"
    type: "major"
    changes:
      - "Initial release with 500 examples"
      - "Categories: refunds, shipping, account, technical"

  - version: "3.1.0"
    date: "2026-02-01"
    type: "minor"
    changes:
      - "Added 100 synthetic QA pairs"
      - "New category: billing"
      - "Updated metadata schema to v2"

  - version: "3.2.0"
    date: "2026-03-15"
    type: "minor"
    changes:
      - "Added 50 production-sampled examples"
      - "Added 10 adversarial cases"
      - "Removed 5 deprecated examples (policy changed)"

  - version: "3.2.1"
    date: "2026-04-01"
    type: "patch"
    changes:
      - "Fixed incorrect answer on shipping-042"
      - "Corrected difficulty label on billing-018"
      - "Removed duplicate technical-099"
```

### Stage 4: Storage

#### Storage Layout

```
s3://evals-datasets/
├── customer-support/
│   ├── v3.2.0/
│   │   ├── metadata.yaml
│   │   ├── changelog.yaml
│   │   ├── golden.jsonl.gz
│   │   ├── synthetic.jsonl.gz
│   │   ├── production.jsonl.gz
│   │   └── adversarial.jsonl.gz
│   ├── v3.1.0/
│   └── v3.0.0/
├── code-generation/
│   ├── v1.0.0/
│   └── v2.0.0/
└── shared/
    ├── categories.yaml
    └── taxonomy.yaml
```

#### Storage Technologies

| Technology | Read Performance | Write Performance | Versioning | Cost | Best For |
|------------|-----------------|-------------------|------------|------|----------|
| S3 / GCS | High (parallel) | High | Built-in | Low | Primary dataset store |
| Git LFS | Moderate | Moderate | Git-based | Low | Small datasets, DVC |
| DVC | Depends on backend | Depends on backend | Git-based | Free | ML data versioning |
| Relational DB | High (indexed) | High (transactions) | Manual | Medium | Metadata, annotations |
| HuggingFace Datasets | High (streaming) | Moderate | HF-native | Free | Public benchmarks |

#### Compression Strategy

```python
class DatasetCompressor:
    def __init__(self, method: str = "gzip"):
        self.method = method
        self.compression_level = {
            "gzip": 6,      # Good balance
            "brotli": 4,    # Better ratio, slower
            "zstd": 3,      # Fast, good ratio
        }

    def compress(self, data: bytes) -> bytes:
        if self.method == "gzip":
            import gzip
            return gzip.compress(data, compresslevel=self.compression_level["gzip"])
        elif self.method == "zstd":
            import zstandard
            return zstandard.compress(data, level=self.compression_level["zstd"])
        # JSONL text: 5-10x compression ratio typical
```

### Stage 5: Consumption

#### Dataset Access Patterns

```python
class DatasetReader:
    def __init__(self, base_path: str):
        self.base_path = base_path

    def load_version(self, name: str, version: str, split: str = None) -> list:
        path = f"{self.base_path}/{name}/v{version}/"
        if split:
            path += f"{split}.jsonl.gz"
        else:
            path += "*.jsonl.gz"
        return self._read_all(path)

    def load_latest(self, name: str, split: str = None) -> list:
        versions = self._list_versions(name)
        latest = sorted(versions, key=lambda v: [int(x) for x in v.split(".")])[-1]
        return self.load_version(name, latest, split)

    def stream_version(self, name: str, version: str, split: str = None):
        path = f"{self.base_path}/{name}/v{version}/"
        if split:
            path += f"{split}.jsonl.gz"
        files = self._list_files(path)
        for file in files:
            for line in self._read_lines(file):
                yield json.loads(line)

    def _read_all(self, pattern: str) -> list:
        results = []
        for file in glob.glob(pattern):
            with gzip.open(file, "rt") as f:
                for line in f:
                    results.append(json.loads(line))
        return results

    def _list_versions(self, name: str) -> list:
        path = f"{self.base_path}/{name}/"
        return [d.replace("v", "") for d in os.listdir(path) if d.startswith("v")]
```

#### Pinning Dataset Versions in Config

```yaml
# config/eval-config.yaml
evaluation:
  dataset:
    name: "customer-support"
    version: "3.2.0"        # Pinned — never use "latest" in production
    split: "all"
    sample_size: null       # null = use full dataset
    random_seed: 42          # For reproducibility of sampling

  # Override for quick testing
  dev_overrides:
    dataset:
      sample_size: 50       # Small sample for fast iteration
```

### Stage 6: Archive and Deletion

#### Archival Policy

| Condition | Action | Timing |
|-----------|--------|--------|
| Version superseded by 3+ minor versions | Archive to cold storage | On new release |
| Version unused for 6 months | Move to cold storage | Quarterly review |
| Version unused for 2 years | Delete (after confirmation) | Annual review |
| Dataset retired (task obsolete) | Archive with tombstone marker | On retirement decision |
| PII discovered | Immediate quarantine + deletion | On discovery |

#### Data Retention Compliance

- **GDPR**: Delete user-sourced data on request. No PII in eval datasets.
- **SOC 2**: Retain eval results for minimum 1 year. Access logs for 90 days.
- **HIPAA**: No PHI in eval datasets. Encrypt at rest and in transit.
- **Internal policy**: Retain datasets for life of model + 1 year.

## Data Governance

### Access Control

```yaml
access_control:
  roles:
    - name: "eval_admin"
      permissions:
        - create_dataset
        - delete_dataset
        - modify_metadata
        - manage_access
      approvers: ["security-team"]
      audit: true

    - name: "eval_engineer"
      permissions:
        - create_dataset_version
        - modify_labels
        - add_examples
      approvers: ["lead-eval-engineer"]
      audit: true

    - name: "eval_reader"
      permissions:
        - read_dataset
        - use_in_pipeline
      approvers: null
      audit: false
```

### Data Quality SLAs

| Quality Dimension | Target | Measurement | Frequency |
|-------------------|--------|-------------|-----------|
| Label accuracy | >98% | Manual review sample | Per version |
| Annotation agreement | >80% Cohen's kappa | Inter-rater reliability | Per version |
| Deduplication | 0% duplicates | Automated check | Per version |
| PII presence | 0% | Automated PII scanner | Per version |
| Edge case coverage | >15% of dataset | Automated count | Per version |
| Category balance | Min 20 per category | Automated count | Per version |

### Dataset Health Score

```python
class DatasetHealthScore:
    def compute(self, dataset: list[dict], metadata: dict) -> dict:
        scores = {}

        # Size check
        total = len(dataset)
        target = metadata.get("target_size", 500)
        scores["size"] = min(total / target, 1.0)

        # Category balance
        categories = {}
        for ex in dataset:
            cat = ex.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        if categories:
            values = list(categories.values())
            scores["balance"] = 1 - (max(values) - min(values)) / max(values)
        else:
            scores["balance"] = 0

        # Edge case ratio
        edge = sum(1 for e in dataset if e.get("difficulty") == "hard")
        scores["edge_coverage"] = min(edge / (total * 0.15), 1.0)

        # Freshness
        if "last_modified" in metadata:
            age_days = (datetime.utcnow() - datetime.fromisoformat(metadata["last_modified"])).days
            scores["freshness"] = max(0, 1 - age_days / 180)  # Decay over 6 months
        else:
            scores["freshness"] = 0

        # Overall
        weights = {"size": 0.25, "balance": 0.25, "edge_coverage": 0.25, "freshness": 0.25}
        scores["overall"] = sum(scores[k] * weights[k] for k in weights)

        return scores
```

## Privacy and Compliance

### PII Detection

```python
import re

class PIIDetector:
    patterns = {
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "phone": r"(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}",
        "ssn": r"\d{3}-\d{2}-\d{4}",
        "credit_card": r"\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}",
        "ip_address": r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}",
        "api_key_pattern": r"(sk-[a-zA-Z0-9]{20,}|pk-[a-zA-Z0-9]{20,})",
    }

    def scan(self, text: str) -> list:
        findings = []
        for pattern_name, pattern in self.patterns.items():
            matches = re.findall(pattern, text)
            for match in matches:
                findings.append({
                    "type": pattern_name,
                    "value": match[:20] + "..." if len(match) > 20 else match,
                    "position": text.index(match),
                })
        return findings

    def sanitize(self, dataset: list[dict]) -> list[dict]:
        sanitized = []
        for example in dataset:
            clean = {}
            for key, value in example.items():
                if isinstance(value, str):
                    findings = self.scan(value)
                    if findings:
                        clean[key] = self._redact(value, findings)
                    else:
                        clean[key] = value
                else:
                    clean[key] = value
            sanitized.append(clean)
        return sanitized

    def _redact(self, text: str, findings: list) -> str:
        result = text
        for finding in sorted(findings, key=lambda x: -x["position"]):
            result = result[:finding["position"]] + "[REDACTED]" + result[finding["position"] + len(finding["value"]):]
        return result
```

### Compliance Checklist

- [ ] All production-sampled data is anonymized (PII stripped).
- [ ] Dataset metadata records provenance and creation date.
- [ ] Access controls implemented: read-only for consumers, write requires review.
- [ ] Retention policy documented and enforced.
- [ ] Dataset versions immutable — no modifications after release.
- [ ] Change log maintained with every version update.
- [ ] Data lineage tracked from creation through consumption.
- [ ] Regular privacy audits of dataset content.
- [ ] User consent obtained for production-sampled data (where required).
- [ ] Cross-border data transfer compliance verified (for multi-region teams).

## Dataset Splitting Strategies

### Standard Split

```yaml
splits:
  train: 60%   # Used for development iteration
  test:  20%   # Held out, used for final evaluation only
  eval:  20%   # Used for CI/CD eval gates

rules:
  - "Never use test set for prompt or model decisions"
  - "Never use test set in CI/CD — only final release evals"
  - "Rotate eval set examples monthly to prevent overfitting"
  - "Stratify splits by category and difficulty"
```

### Stratified Splitting

```python
class StratifiedSplitter:
    def split(self, dataset: list[dict], ratios: dict = None) -> dict:
        if ratios is None:
            ratios = {"train": 0.6, "test": 0.2, "eval": 0.2}

        grouped = {}
        for ex in dataset:
            key = (ex.get("category", "unknown"), ex.get("difficulty", "medium"))
            grouped.setdefault(key, []).append(ex)

        splits = {name: [] for name in ratios}
        for key, examples in grouped.items():
            random.shuffle(examples)
            n = len(examples)
            start = 0
            for split_name, ratio in ratios.items():
                end = start + int(n * ratio)
                splits[split_name].extend(examples[start:end])
                start = end

        # Distribute remainder
        remainder = {k: v for k, v in grouped.items()}
        for key, examples in remainder.items():
            n = len(examples)
            allocated = sum(int(n * r) for r in ratios.values())
            remaining = examples[allocated:]
            for ex in remaining:
                splits["eval"].append(ex)  # Default remainder to eval

        return splits
```

### Cross-Validation for Small Datasets

When golden dataset < 200 examples, use k-fold cross-validation:

```python
class CrossValidator:
    def __init__(self, k: int = 5):
        self.k = k

    def folds(self, dataset: list[dict]) -> list[tuple]:
        random.shuffle(dataset)
        fold_size = len(dataset) // self.k
        folds = []
        for i in range(self.k):
            test_start = i * fold_size
            test_end = (i + 1) * fold_size if i < self.k - 1 else len(dataset)
            test_set = dataset[test_start:test_end]
            train_set = dataset[:test_start] + dataset[test_end:]
            folds.append((train_set, test_set))
        return folds

    def evaluate(self, dataset: list[dict], eval_fn: callable) -> dict:
        fold_results = []
        for train, test in self.folds(dataset):
            score = eval_fn(train, test)
            fold_results.append(score)
        return {
            "mean": statistics.mean(fold_results),
            "std": statistics.stdev(fold_results) if len(fold_results) > 1 else 0,
            "per_fold": fold_results,
        }
```

## Data Lineage

### Lineage Tracking Schema

```yaml
lineage_entry:
  node_id: "dataset:customer-support@3.2.0"
  type: "dataset"
  created_at: "2026-03-15T10:00:00Z"
  created_by: "pipeline:v2.1.0"
  parents:
    - "dataset:customer-support@3.1.0"
    - "production-logs:2026-03-01"
  children:
    - "eval-run:nightly-2026-03-15"
    - "eval-run:release-v2.3"
  metadata:
    total_examples: 750
    categories: ["refunds", "shipping", "account", "technical", "billing"]
```

### Querying Lineage

```python
class LineageGraph:
    def __init__(self):
        self.nodes = {}

    def add_node(self, node_id: str, node_type: str, parents: list = None, metadata: dict = None):
        self.nodes[node_id] = {
            "id": node_id,
            "type": node_type,
            "parents": parents or [],
            "children": [],
            "metadata": metadata or {},
        }
        for parent in (parents or []):
            if parent in self.nodes:
                self.nodes[parent]["children"].append(node_id)

    def ancestors(self, node_id: str) -> list:
        path = []
        visited = set()

        def dfs(nid):
            if nid in visited:
                return
            visited.add(nid)
            node = self.nodes.get(nid)
            if node:
                path.append(node)
                for parent in node["parents"]:
                    dfs(parent)

        dfs(node_id)
        return path

    def descendants(self, node_id: str) -> list:
        path = []
        visited = set()

        def dfs(nid):
            if nid in visited:
                return
            visited.add(nid)
            node = self.nodes.get(nid)
            if node:
                path.append(node)
                for child in node["children"]:
                    dfs(child)

        dfs(node_id)
        return path

    def impact_analysis(self, dataset_name: str, version: str) -> dict:
        node_id = f"dataset:{dataset_name}@{version}"
        consumers = self.descendants(node_id)
        return {
            "dataset": node_id,
            "affected_runs": [n for n in consumers if n["type"] == "eval-run"],
            "affected_models": list(set(
                n["metadata"].get("model") for n in consumers
                if n["metadata"].get("model")
            )),
        }
```

## Key Points

- Implement a full data lifecycle: creation → validation → versioning → storage → consumption → archive.
- Version datasets with semver: major (new categories), minor (new examples), patch (fixes).
- Never modify a released dataset version — create a new version.
- Store datasets in object storage (S3/GCS) with versioning enabled.
- Pin dataset versions in eval configs — never use "latest" in production.
- Automate dataset validation: size checks, metadata completeness, category balance, duplicates.
- Require manual review of 10% sample for every new version.
- Implement PII detection and sanitization for production-sampled data.
- Track data lineage from creation through consumption for auditability.
- Use stratified splitting to maintain category and difficulty balance across splits.
- Implement access controls: read for consumers, write with review for creators.
- Monitor dataset health (size, balance, freshness, edge coverage).
- Archive unused datasets to cold storage; delete after retention period with confirmation.
- Document every version change in a changelog.
