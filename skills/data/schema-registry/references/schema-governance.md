# Schema Governance

## Governance Framework
Schema governance ensures that data contracts are enforced, schemas evolve safely, and all stakeholders are informed of changes.

## Automated Governance Rules
```python
class SchemaGovernanceRule:
    def __init__(self, name, rule_fn, severity="error"):
        self.name = name
        self.rule_fn = rule_fn
        self.severity = severity

class SchemaGovernor:
    def __init__(self, registry_client):
        self.client = registry_client
        self.rules = []

    def add_rule(self, rule):
        self.rules.append(rule)

    def validate_schema(self, subject, schema_str):
        results = []
        for rule in self.rules:
            passed, message = rule.rule_fn(subject, schema_str, self.client)
            results.append({
                "rule": rule.name,
                "passed": passed,
                "severity": rule.severity,
                "message": message
            })
        return results

    def promote_schema(self, subject, schema_str, environment):
        results = self.validate_schema(subject, schema_str)
        errors = [r for r in results if not r["passed"] and r["severity"] == "error"]
        if errors:
            raise SchemaGovernanceError(
                f"Cannot promote schema to {environment}: {errors}"
            )
        schema_id = self.client.register_schema(subject, schema_str)
        return {"schema_id": schema_id, "warnings": [r for r in results if not r["passed"]]}
```

## Key Points
- Define automated governance rules for schema review
- Enforce naming conventions and metadata requirements
- Implement approval workflows for schema changes
- Track schema ownership and notify stakeholders of changes
- Monitor compliance with periodic audits
- Integrate governance into CI/CD pipelines
- Document schema evolution decisions with ADRs
- Establish schema review boards for critical subjects
