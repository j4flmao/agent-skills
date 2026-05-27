# Federated Governance Operating Model

## Governance Structure

Federated governance balances domain autonomy with global standards in a data mesh.

### Policy Framework

```python
from enum import Enum
from dataclasses import dataclass

class GovernanceLevel(Enum):
    GLOBAL = "global"           # Applied to all domains
    DOMAIN = "domain"           # Specific to a domain
    PRODUCT = "product"         # Specific to a data product

@dataclass
class GovernancePolicy:
    name: str
    level: GovernanceLevel
    description: str
    enforcement: str  # mandatory, recommended, optional
    audit_frequency: str  # daily, weekly, monthly, quarterly

GLOBAL_POLICIES = [
    GovernancePolicy("data_classification", GovernanceLevel.GLOBAL,
                     "Classify all data by sensitivity", "mandatory", "daily"),
    GovernancePolicy("pii_masking", GovernanceLevel.GLOBAL,
                     "PII columns must be masked by default", "mandatory", "weekly"),
    GovernancePolicy("retention", GovernanceLevel.GLOBAL,
                     "Define retention policy per dataset", "mandatory", "monthly"),
    GovernancePolicy("ownership", GovernanceLevel.GLOBAL,
                     "Every dataset must have a documented owner", "mandatory", "daily"),
]
```

### Compliance Monitoring

```python
class ComplianceMonitor:
    def __init__(self, policies: list[GovernancePolicy]):
        self.policies = policies
        self.violations: list[Violation] = []

    def check_compliance(self, domain: str) -> DomainCompliance:
        results = {}
        for policy in self.policies:
            if policy.level == GovernanceLevel.GLOBAL:
                passed = self._check_global_policy(domain, policy)
            else:
                passed = self._check_domain_policy(domain, policy)

            results[policy.name] = passed

            if not passed:
                self.violations.append(Violation(
                    domain=domain,
                    policy=policy.name,
                    timestamp=datetime.utcnow(),
                    severity="high" if policy.enforcement == "mandatory" else "medium",
                ))

        return DomainCompliance(
            domain=domain,
            total_policies=len(self.policies),
            passed=sum(1 for r in results.values() if r),
            failed=sum(1 for r in results.values() if not r),
            violations=self.violations[-10:],
        )

    def _check_global_policy(self, domain: str, policy: GovernancePolicy) -> bool:
        if policy.name == "pii_masking":
            return self._verify_pii_masking(domain)
        elif policy.name == "retention":
            return self._verify_retention(domain)
        return True
```

## Certification Workflow

```python
class DataProductCertification:
    def __init__(self):
        self.checks: list[CertificationCheck] = [
            CertificationCheck("schema_documented", "Schema documentation complete"),
            CertificationCheck("ownership_assigned", "Owner assigned"),
            CertificationCheck("sla_defined", "SLA documented"),
            CertificationCheck("quality_checks", "Quality checks configured"),
            CertificationCheck("freshness_monitor", "Freshness monitoring enabled"),
        ]

    def certify(self, product_id: str, domain: str) -> CertificationResult:
        results = []
        all_passed = True

        for check in self.checks:
            passed = self._run_check(product_id, check)
            results.append(CheckResult(check=check.name, passed=passed))
            if not passed:
                all_passed = False

        if all_passed:
            return CertificationResult(
                product_id=product_id,
                certified=True,
                certified_at=datetime.utcnow(),
                certificate_id=str(uuid.uuid4()),
            )

        return CertificationResult(product_id=product_id, certified=False, results=results)
```

## Key Points

- Three governance levels: global (mandatory), domain (recommended), product (optional)
- Compliance monitoring checks policies at configured frequencies
- Automated certification workflow for data product quality gates
- Violation tracking with severity levels for escalation
- Domain autonomy within global policy boundaries
- Regular audit cycles for continuous compliance
- Certification renewal required annually
- Policy exception process for legitimate deviations
- Cross-domain policy alignment through governance council
- Automated remediation for common compliance violations
