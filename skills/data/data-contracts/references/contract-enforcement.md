# Contract Enforcement

## CI/CD Contract Validation

### Python Contract Validator

```python
import yaml
import json
import re
from enum import Enum
from typing import Dict, List, Optional

class CompatibilityMode(Enum):
    BACKWARD = "BACKWARD"
    FORWARD = "FORWARD"
    FULL = "FULL"
    NONE = "NONE"

def validate_contract(contract_path: str, actual_schema_path: str, mode: str):
    with open(contract_path) as f:
        contract = yaml.safe_load(f)
    with open(actual_schema_path) as f:
        actual = json.load(f)

    errors = []
    contract_columns = {c["name"]: c for c in contract["schema"]["columns"]}
    actual_columns = {c["name"]: c for c in actual["columns"]}

    mode = CompatibilityMode(mode)

    if mode in [CompatibilityMode.BACKWARD, CompatibilityMode.FULL]:
        # New schema must read old data: cannot delete required columns
        for name, col in contract_columns.items():
            if col.get("required") and name not in actual_columns:
                errors.append(f"BACKWARD: Required column '{name}' missing in actual schema")

    if mode in [CompatibilityMode.FORWARD, CompatibilityMode.FULL]:
        # Old schema must read new data: no new required columns
        for name, col in actual_columns.items():
            if col.get("required") and name not in contract_columns:
                errors.append(f"FORWARD: New required column '{name}' not in contract")

    # Type check
    for name in set(contract_columns) & set(actual_columns):
        if contract_columns[name]["type"] != actual_columns[name]["type"]:
            errors.append(f"Type mismatch: {name} ({contract_columns[name]['type']} vs {actual_columns[name]['type']})")

    return errors

if __name__ == "__main__":
    import sys
    errs = validate_contract(sys.argv[1], sys.argv[2], sys.argv[3])
    if errs:
        print("\n".join(errs))
        sys.exit(1)
    print("Contract validation passed")
```

### GitHub Action

```yaml
name: Contract Check
on:
  pull_request:
    paths:
      - 'contracts/**/*.yaml'
      - 'models/**/*.sql'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install pyyaml jsonschema

      - name: Check All Contracts
        run: |
          for contract in contracts/**/*.yaml; do
            echo "Checking $contract"
            python scripts/validate_contract.py \
              "$contract" \
              "schemas/$(basename $contract .yaml).json" \
              "BACKWARD"
          done

      - name: Notify on Breaking Changes
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "channel": "#data-alerts",
              "text": ":warning: Breaking contract change detected in ${{ github.ref_name }}"
            }
```

## Producer/Consumer Workflow

```
Producer creates/changes contract
  → PR to contracts/ repository
  → CI runs compatibility checks
  → If breaking change:
    → Notify all consumers of current version
    → Wait for acknowledgment (48h SLA)
    → Merge
    → Deploy new version
  → If non-breaking:
    → Auto-merge
    → Deploy

Consumer detects contract change
  → CI test against new contract
  → If compatible: auto-accept
  → If breaking: alert consumer team
```

## Breaking Change Detection

| Change | BACKWARD | FORWARD | FULL | Severity |
|---|---|---|---|---|
| **Add optional column** | Compatible | Compatible | Compatible | None |
| **Add required column** | Compatible | Breaking | Breaking | Major |
| **Drop column** | Breaking | Compatible | Breaking | Major |
| **Rename column** | Breaking | Breaking | Breaking | Major |
| **Type change (widening)** | Compatible | Breaking | Breaking | Minor |
| **Type change (narrowing)** | Breaking | Breaking | Breaking | Major |
| **Add constraint (NOT NULL)** | Breaking | Compatible | Breaking | Minor |
| **Remove constraint** | Compatible | Breaking | Breaking | Minor |

### Automated Breaking Change Check

```python
def check_breaking(old: Dict, new: Dict, mode: str) -> List[str]:
    breaking = []
    old_cols = {c["name"]: c for c in old["schema"]["columns"]}
    new_cols = {c["name"]: c for c in new["schema"]["columns"]}

    for name in set(old_cols) - set(new_cols):
        if mode in ["BACKWARD", "FULL"]:
            breaking.append(f"Column '{name}' removed (breaking in {mode} mode)")

    for name in set(new_cols) - set(old_cols):
        if new_cols[name].get("required") and mode in ["FORWARD", "FULL"]:
            breaking.append(f"New required column '{name}' (breaking in {mode} mode)")

    for name in set(old_cols) & set(new_cols):
        old_type = old_cols[name].get("type")
        new_type = new_cols[name].get("type")
        if old_type != new_type:
            if mode == "FULL":
                breaking.append(f"Type change for '{name}': {old_type} → {new_type} (breaking in FULL mode)")

    return breaking
```
