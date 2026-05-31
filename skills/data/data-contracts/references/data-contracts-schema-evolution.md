# Data Contracts Schema Evolution

## Overview

Schema evolution in data contracts defines how producers change data structures over time while maintaining compatibility with consumers. This reference covers semver strategies, compatibility modes, migration workflows, breaking change management, and automated enforcement patterns.

## Contract Versioning Strategy

### Semantic Versioning for Data Contracts

```
MAJOR.MINOR.PATCH

MAJOR: Breaking schema change (remove column, narrow type, add NOT NULL)
MINOR: Additive change (new column, widen type, add optional)
PATCH: Non-functional change (description update, tag change, constraint relaxation)
```

### Version Compatibility Matrix

```yaml
version_compatibility:
  rules:
    - producer_version: "1.0.0"
      consumer_min_version: "1.0.0"
      consumer_max_version: "1.x.x"  # backward compatible

    - producer_version: "1.1.0"  # additive change
      consumer_min_version: "1.0.0"  # old consumers can still read
      consumer_max_version: "1.1.x"

    - producer_version: "2.0.0"  # breaking change
      consumer_min_version: "2.0.0"  # consumers must upgrade
      consumer_max_version: "2.x.x"

  migration_window: 14 days  # consumers have 14 days to acknowledge MAJOR
```

### Version Storage

```yaml
contracts/
  analytics/
    fct_orders/
      v1.0.0.yaml
      v1.1.0.yaml
      v2.0.0.yaml
  commerce/
    dim_customers/
      v1.0.0.yaml
      v2.0.0.yaml
```

## Schema Change Types

### Additive Changes (MINOR)

```yaml
# v1.0.0 → v1.1.0: Add new column with default
contract:
  version: "1.1.0"
  changes:
    - type: ADD_COLUMN
      column:
        name: discount
        type: DECIMAL(5,2)
        required: false
        default: 0.00
        description: "Applied discount percentage"
      compatibility: "BACKWARD"  # safe, old consumers fill default

# v1.0.0 → v1.1.0: Add new column (nullable)
    - type: ADD_COLUMN
      column:
        name: notes
        type: STRING
        required: false
        description: "Order notes (optional)"
      compatibility: "BACKWARD"
```

### Widening Changes (MINOR)

```yaml
# v1.0.0 → v1.1.0: Widen type
contract:
  version: "1.1.0"
  changes:
    - type: WIDEN_TYPE
      column: total_amount
      from_type: "DECIMAL(12,2)"
      to_type: "DECIMAL(18,2)"
      compatibility: "BACKWARD"  # wider type accepts narrower values
```

### Breaking Changes (MAJOR)

```yaml
# v1.0.0 → v2.0.0: Remove column
contract:
  version: "2.0.0"
  changes:
    - type: REMOVE_COLUMN
      column: legacy_flag
      deprecation_notice: "Deprecated in v1.1.0, removed in v2.0.0"
      migration_period_days: 90
      compatibility: "BREAKING"

# v1.0.0 → v2.0.0: Rename column (two-step)
contract:
  version: "2.0.0"
  changes:
    - type: ADD_COLUMN  # Step 1: add new
      column:
        name: customer_email
        type: STRING
        required: true
    - type: DEPRECATE_COLUMN  # Step 2: deprecate old
      column: email
      replacement: customer_email
      deprecation_date: "2026-01-01"
      removal_version: "3.0.0"

# v1.0.0 → v2.0.0: Add NOT NULL to existing column (need backfill)
contract:
  version: "2.0.0"
  changes:
    - type: ADD_NOT_NULL
      column: status
      precondition: "All rows have non-null status values (backfill required)"
      compatibility: "BREAKING"
```

## Migration Workflows

### Additive Change (MINOR)

```
1. Producer defines new column with default/nullable in contract
2. CI/CD validates: backward compatible → MINOR bump
3. Contract registered in catalog as v1.1.0
4. Producer deploys new pipeline (starts writing new column)
5. Old consumers continue working (default fills for missing)
6. New consumers can use the new column
7. No consumer action required
```

### Breaking Change (MAJOR)

```
1. Producer identifies need for breaking change
2. Producer creates v2.0.0 contract in branch
3. CI/CD detects breaking change → triggers consumer notification
4. All consumers notified with 14-day acknowledgment window
5. Consumers review impact and acknowledge
6. After acknowledgment from all consumers (or 14 days elapsed):
   a. Producer merges contract
   b. Producer deploys v2.0.0
   c. v1.x consumers continue working if backward compatible, else break
7. If not all consumers acknowledged: block deploy, escalate to governance
```

### Two-Step Rename

```
Phase 1 (v1.1.0):
  ├── Add new column (customer_email)
  ├── Deprecate old column (email)
  ├── Producers write both columns
  └── Consumers migrate to new column

Phase 2 (v2.0.0):
  ├── Remove old column (email)
  ├── All consumers on new column
  └── Producers write only new column
```

## Automated Enforcement

### Contract Validation Script

```python
import yaml
import json
from dataclasses import dataclass
from typing import Optional

@dataclass
class SchemaChange:
    type: str  # ADD, REMOVE, MODIFY, WIDEN, NARROW
    column: str
    old: Optional[dict] = None
    new: Optional[dict] = None

def detect_changes(old_contract: dict, new_contract: dict) -> list:
    """Detect all schema changes between two contract versions."""
    changes = []
    old_cols = {c["name"]: c for c in old_contract["schema"]["columns"]}
    new_cols = {c["name"]: c for c in new_contract["schema"]["columns"]}

    # Detect removed columns
    for name, col in old_cols.items():
        if name not in new_cols:
            changes.append(SchemaChange("REMOVE", name, old=col))

    # Detect added columns
    for name, col in new_cols.items():
        if name not in old_cols:
            changes.append(SchemaChange("ADD", name, new=col))

    # Detect modified columns
    for name in old_cols.keys() & new_cols.keys():
        old_type = old_cols[name]["type"]
        new_type = new_cols[name]["type"]
        if old_type != new_type:
            if is_type_widening(old_type, new_type):
                changes.append(SchemaChange("WIDEN", name, old=old_cols[name], new=new_cols[name]))
            else:
                changes.append(SchemaChange("NARROW", name, old=old_cols[name], new=new_cols[name]))

        old_required = old_cols[name].get("required", False)
        new_required = new_cols[name].get("required", False)
        if not old_required and new_required:
            changes.append(SchemaChange("ADD_NOT_NULL", name, old=old_cols[name], new=new_cols[name]))

    return changes


def classify_compatibility(changes: list, current_mode: str) -> dict:
    """Classify changes as MAJOR, MINOR, or PATCH."""
    has_breaking = False
    has_additive = False

    for change in changes:
        if change.type in ("REMOVE", "NARROW", "ADD_NOT_NULL"):
            has_breaking = True
        elif change.type in ("ADD", "WIDEN"):
            has_additive = True

    if has_breaking:
        semver_bump = "MAJOR"
    elif has_additive:
        semver_bump = "MINOR"
    else:
        semver_bump = "PATCH"

    # Verify compatibility mode
    compatible = True
    violations = []

    if current_mode == "BACKWARD" and has_breaking:
        if not any(c.type == "REMOVE" for c in changes):
            compatible = False
            violations.append("Removing columns not allowed in BACKWARD mode")

    return {
        "semver_bump": semver_bump,
        "compatible": compatible,
        "violations": violations,
    }
```

### CI/CD Gate

```python
def run_contract_check(old_path: str, new_path: str, consumers: list) -> dict:
    """Run contract validation in CI/CD."""
    with open(old_path) as f:
        old_contract = yaml.safe_load(f)
    with open(new_path) as f:
        new_contract = yaml.safe_load(f)

    changes = detect_changes(old_contract, new_contract)
    result = classify_compatibility(changes, old_contract.get("compatibility", "BACKWARD"))

    report = {
        "contract": new_contract["dataset"],
        "old_version": old_contract["version"],
        "new_version": new_contract["version"],
        "changes": [c.__dict__ for c in changes],
        "classification": result,
        "status": "PASS" if result["compatible"] else "FAIL",
    }

    # Trigger notification for MAJOR changes
    if result["semver_bump"] == "MAJOR":
        report["consumer_acknowledgment_required"] = True
        report["consumers_to_notify"] = [
            c for c in consumers if c.get("current_version").startswith(old_contract["version"].split(".")[0])
        ]

    return report


def notify_consumers(report: dict) -> None:
    """Notify consumers of breaking changes."""
    if report.get("consumer_acknowledgment_required"):
        for consumer in report["consumers_to_notify"]:
            send_notification(
                consumer["contact"],
                f"Breaking change detected in {report['contract']}: "
                f"{report['old_version']} -> {report['new_version']}. "
                f"See details: {report['changes']}. "
                f"Acknowledge within 14 days."
            )
```

## Consumer Acknowledgment

### Acknowledgment Workflow

```python
def consumer_acknowledge(consumer_id: str, contract_name: str, new_version: str) -> dict:
    """Record consumer acknowledgment of breaking change."""
    acknowledgment = {
        "consumer_id": consumer_id,
        "contract": contract_name,
        "new_version": new_version,
        "acknowledged_at": datetime.utcnow().isoformat(),
        "status": "acknowledged",
        "migration_plan": "Will consume v2 schema starting next sprint",
    }

    store_acknowledgment(acknowledgment)

    # Check if all consumers acknowledged
    all_acknowledged = check_all_consumers_acknowledged(contract_name, new_version)
    return {
        "acknowledgment": acknowledgment,
        "all_acknowledged": all_acknowledged,
    }


def check_all_consumers_acknowledged(contract_name: str, new_version: str) -> bool:
    """Check if all consumers of contract have acknowledged."""
    consumers = get_contract_consumers(contract_name)
    acknowledgments = get_acknowledgments(contract_name, new_version)

    acknowledged_ids = {a["consumer_id"] for a in acknowledgments}
    required_ids = {c["id"] for c in consumers}

    all_done = acknowledged_ids >= required_ids

    if not all_done:
        missing = required_ids - acknowledged_ids
        missing_consumers = [c for c in consumers if c["id"] in missing]
        alert_unacknowledged_consumers(missing_consumers, contract_name, new_version)

    return all_done
```

## Contract Testing

### Runtime Contract Validation

```python
import pandas as pd

def validate_contract_runtime(df: pd.DataFrame, contract: dict) -> dict:
    """Validate DataFrame against contract at runtime."""
    violations = []

    schema = contract["schema"]
    for col_def in schema["columns"]:
        col_name = col_def["name"]

        # Check column exists
        if col_name not in df.columns:
            if col_def.get("required", False):
                violations.append(f"Missing required column: {col_name}")
            continue

        # Check null rate
        if col_def.get("required", False):
            null_count = df[col_name].isna().sum()
            if null_count > 0:
                violations.append(f"Column {col_name} has {null_count} null values (required)")

        # Check type (basic)
        expected_type = col_def["type"]
        actual_type = str(df[col_name].dtype)
        if not type_matches(actual_type, expected_type):
            violations.append(f"Column {col_name} type mismatch: expected {expected_type}, got {actual_type}")

        # Check constraints
        constraints = col_def.get("constraints", {})
        if "minimum" in constraints:
            min_val = df[col_name].min()
            if min_val < constraints["minimum"]:
                violations.append(f"Column {col_name} has value {min_val} below minimum {constraints['minimum']}")
        if "maximum" in constraints:
            max_val = df[col_name].max()
            if max_val > constraints["maximum"]:
                violations.append(f"Column {col_name} has value {max_val} above maximum {constraints['maximum']}")

        # Check uniqueness
        if col_def.get("unique", False):
            dup_count = df[col_name].duplicated().sum()
            if dup_count > 0:
                violations.append(f"Column {col_name} has {dup_count} duplicate values (must be unique)")

    # Check SLA
    sla = contract.get("sla", {})
    if sla.get("volume"):
        row_count = len(df)
        if row_count < sla["volume"]["min_rows"]:
            violations.append(f"Row count {row_count} below minimum {sla['volume']['min_rows']}")
        if row_count > sla["volume"]["max_rows"]:
            violations.append(f"Row count {row_count} above maximum {sla['volume']['max_rows']}")

    return {
        "contract": contract["dataset"],
        "version": contract["version"],
        "valid": len(violations) == 0,
        "violations": violations,
        "row_count": len(df),
        "checked_at": datetime.utcnow().isoformat(),
    }
```

## Multi-Party Contracts

### Producer-Consumer Contract

```yaml
contract_version: "2.0.0"
dataset: analytics.fct_orders

parties:
  producer:
    domain: commerce
    team: orders-engine
    owner: orders-team@org.com
  consumers:
    - domain: finance
      team: revenue-analytics
      owner: finance-analytics@org.com
      contract_version: "1.x.x"  # consuming old version
    - domain: marketing
      team: campaign-analytics
      owner: marketing-analytics@org.com
      contract_version: "2.0.0"  # upgraded

compatibility:
  mode: BACKWARD
  enforced: true

notification:
  on_breaking:
    channel: slack
    webhook: ${SLACK_DATA_GOV_URL}
    template: "Breaking change in {dataset}: {old_version} -> {new_version}"
    escalation:
      after_hours: 24
      escalate_to: data-governance-council
```

## References

- Data contract definition and examples
- Contract lifecycle management
- Contract integration patterns
- Contract migration strategies
- Contract monitoring and enforcement
- Schema evolution policies
- Schema registry evolution
- dbt contract configuration
