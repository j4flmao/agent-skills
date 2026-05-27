# SBOM Policy Enforcement Guide

## Overview

SBOM policy enforcement ensures that every artifact entering your supply chain meets security, licensing, and integrity requirements before deployment. This guide covers policy engine design using OPA/Kyverno, vulnerability severity policies, license compliance rules, attestation verification, fail-build thresholds, exception management, and audit trails.

## Policy Engine Architecture

### Architecture Overview

```
SBOM → Policy Engine → Decision
  │                        │
  ├── Vulnerability       ├── Pass (deploy)
  ├── License             ├── Warn (log, alert)
  ├── Attestation         ├── Block (fail pipeline)
  └── Supply Chain        └── Review (flag for manual review)
```

### OPA (Open Policy Agent) Integration

#### Rego Policy for SBOM Validation

```rego
# sbom-policy.rego
package sbom.policy

# Default decision: deny
default deny = false
default warn = false

# Vulnerability severity thresholds
critical_severity := ["CRITICAL"]
high_severity := ["CRITICAL", "HIGH"]
medium_severity := ["CRITICAL", "HIGH", "MEDIUM"]

# Block if any CRITICAL vulnerabilities exist
deny_block_critical {
    vuln := input.vulnerabilities[_]
    vuln.severity == "CRITICAL"
    vuln.status == "open"
}

# Block if any HIGH vulnerabilities unpatched for > 7 days
deny_block_high_aged {
    vuln := input.vulnerabilities[_]
    vuln.severity == "HIGH"
    vuln.status == "open"
    vuln.days_since_disclosure > 7
}

# Warn for MEDIUM vulnerabilities
warn_medium {
    vuln := input.vulnerabilities[_]
    vuln.severity == "MEDIUM"
}

# Verify required fields in SBOM
deny_missing_fields {
    component := input.components[_]
    not component.purl
}

# License compliance
deny_blocked_license {
    component := input.components[_]
    license := component.licenses[_]
    blocked_licenses := {"GPL-3.0", "AGPL-3.0", "SSPL", "BUSL-1.1"}
    license.id == blocked_licenses[_]
}

deny_unknown_license {
    component := input.components[_]
    not component.licenses
}

# Attestation verification
deny_invalid_attestation {
    not input.attestation.verified
}

deny_expired_attestation {
    expiry := time.parse_rfc3339(input.attestation.expires)
    now := time.now_ns()
    expiry < now
}

# Policy decision output
decision = "deny" {
    deny_block_critical
}

decision = "deny" {
    deny_block_high_aged
}

decision = "deny" {
    deny_blocked_license
}

decision = "deny" {
    deny_missing_fields
}

decision = "deny" {
    deny_invalid_attestation
}

decision = "warn" {
    warn_medium
}

decision = "allow" {
    not deny_block_critical
    not deny_block_high_aged
    not deny_blocked_license
    not deny_missing_fields
    not deny_invalid_attestation
}

# Policy metadata
policy_info = {
    "name": "sbom-supply-chain-policy",
    "version": "1.0.0",
    "description": "SBOM validation policy for supply chain security",
    "severity": "high",
}
```

#### Policy Evaluation CLI

```bash
# Evaluate SBOM against OPA policy
opa eval --data sbom-policy.rego --input bom.json "data.sbom.policy.decision"

# Evaluate with all rules
opa eval --data sbom-policy.rego --input bom.json "data.sbom.policy"

# Format for CI/CD
opa eval \
  --data sbom-policy.rego \
  --input bom.json \
  --format pretty \
  "data.sbom.policy.decision"

# Conftest integration
conftest test --policy policies/sbom.rego bom.json
```

### Kyverno Policy Integration

```yaml
# sbom-validation-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: sbom-validation
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: require-cyclonedx-sbom
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "All containers must have a CycloneDX SBOM attestation"
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                all:
                  - key: "{{ element.image }}"
                    operator: AnyNotIn
                    value: "{{ images.attestations.keys(@) }}"
    - name: block-critical-vulnerabilities
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Container has CRITICAL vulnerabilities in SBOM"
        foreach:
          - list: "request.object.spec.containers"
            context:
              - name: vuln_data
                apiCall:
                  urlPath: "/apis/kyverno.io/v1/namespaces/{{ request.namespace }}/sbomdata"
                  jmesPath: "items[?image=='{{ element.image }}'].vulnerabilities[?severity=='CRITICAL']"
            deny:
              conditions:
                any:
                  - key: "{{ vuln_data }}"
                    operator: GreaterThanOrEquals
                    value: 1
```

## Vulnerability Severity Policies

### Severity Matrix by Environment

```yaml
# severity-policy.yaml
environments:
  production:
    severity_threshold: CRITICAL
    actions:
      CRITICAL:
        action: block
        message: "CRITICAL vulnerability detected in production artifact"
        patch_sla: 48h
        auto_remediate: false
      HIGH:
        action: block_if_unpatched_7d
        message: "HIGH vulnerability unpatched for > 7 days"
        patch_sla: 7d
        auto_remediate: true
      MEDIUM:
        action: warn
        message: "MEDIUM vulnerability - review at next triage"
        patch_sla: 30d
        auto_remediate: false
      LOW:
        action: log
        message: "LOW vulnerability logged for quarterly review"
        auto_remediate: false
  staging:
    severity_threshold: HIGH
    actions:
      CRITICAL:
        action: block
        patch_sla: 72h
      HIGH:
        action: warn
        patch_sla: 14d
      MEDIUM:
        action: log
      LOW:
        action: log
  development:
    severity_threshold: NONE
    actions:
      CRITICAL:
        action: warn
      HIGH:
        action: log
      MEDIUM:
        action: log
      LOW:
        action: log
```

### Reachability-Weighted Severity

```python
# reachability_scoring.py
def calculate_effective_severity(cve_data, call_graph):
    """
    Adjust severity based on whether the vulnerable code path
    is reachable from application code.
    """
    base_severity = cve_data['cvss_score']
    reachable = is_reachable(cve_data['vulnerable_function'], call_graph)
    
    if not reachable:
        # Reduce severity by one level if not reachable
        return reduce_severity(base_severity)
    
    # Check if vulnerable function is tested
    if has_coverage(cve_data['vulnerable_function']):
        # Further reduce if exercised by tests and no exploit detected
        return base_severity - 1.0
    
    return base_severity

def reduce_severity(score):
    if score >= 9.0:
        return 7.0  # CRITICAL -> HIGH
    elif score >= 7.0:
        return 4.0  # HIGH -> MEDIUM
    elif score >= 4.0:
        return 1.0  # MEDIUM -> LOW
    return 0.0
```

## License Compliance Rules

### License Policy Model

```yaml
# license-policy.yaml
license_policy:
  version: "2.0"
  metadata:
    owner: security-team
    last_reviewed: "2025-01-15"
  
  categories:
    allow:
      - id: "MIT"
        description: "Permissive, minimal restrictions"
      - id: "Apache-2.0"
        description: "Permissive with patent grant"
      - id: "BSD-2-Clause"
        description: "Simple permissive"
      - id: "BSD-3-Clause"
        description: "Permissive with no-endorsement clause"
      - id: "ISC"
        description: "Permissive, functionally equivalent to MIT"
      - id: "Unlicense"
        description: "Public domain dedication"
      - id: "CC0-1.0"
        description: "Creative Commons Zero - public domain"
      - id: "Zlib"
        description: "Permissive, commonly used in C/C++ ecosystem"
      - id: "Python-2.0"
        description: "Python Software Foundation License"
      - id: "PostgreSQL"
        description: "PostgreSQL license - permissive"
      - id: "ICU"
        description: "ICU license - permissive"

    block:
      - id: "GPL-3.0"
        description: "Strong copyleft - risk of forced source disclosure"
        risk: "Force open source entire derivative work"
      - id: "AGPL-3.0"
        description: "Strong copyleft - extends to network services"
        risk: "Forces source disclosure for SaaS deployments"
      - id: "SSPL"
        description: "MongoDB SSPL - not open source per OSI, cloud provider restrictions"
        risk: "Restricts cloud service providers"
      - id: "BUSL-1.1"
        description: "Business Source License - source-available, not open source"
        risk: "Use limitations in production, converts to OSS after change date"
      - id: "No-license"
        description: "No license specified - assume all rights reserved"
        risk: "Cannot legally use without explicit permission"
      - id: "Custom-proprietary"
        description: "Custom proprietary license"
        risk: "Must be reviewed by legal team"

    review:
      - id: "LGPL-2.1"
        description: "Weak copyleft - OK for dynamic linking, distribute source for modifications"
      - id: "LGPL-3.0"
        description: "Weak copyleft - similar to LGPL-2.1 with additional patent provisions"
      - id: "MPL-2.0"
        description: "File-level copyleft - modifications to MPL files must be shared"
      - id: "EPL-2.0"
        description: "Eclipse Public License - weak copyleft, Eclipse Foundation"
      - id: "CDDL-1.0"
        description: "Common Development and Distribution License"
      - id: "EUPL-1.2"
        description: "European Union Public License - copyleft with EU law framework"
      - id: "GPL-2.0"
        description: "GPL v2 - requires case-by-case legal review"
```

### Automated License Checking

```python
# license_checker.py
import json
import sys
import re
from typing import Dict, List, Tuple

class LicenseChecker:
    def __init__(self, policy_file: str):
        with open(policy_file) as f:
            self.policy = yaml.safe_load(f)
        self.allowed = {l['id'] for l in self.policy['license_policy']['categories']['allow']}
        self.blocked = {l['id'] for l in self.policy['license_policy']['categories']['block']}
        self.review = {l['id'] for l in self.policy['license_policy']['categories']['review']}

    def check_sbom(self, sbom_path: str) -> Tuple[bool, List[Dict]]:
        with open(sbom_path) as f:
            bom = json.load(f)
        
        violations = []
        for component in bom.get('components', []):
            name = component.get('name', 'unknown')
            licenses = self._extract_licenses(component)
            
            if not licenses:
                violations.append({
                    'component': name,
                    'version': component.get('version', 'unknown'),
                    'purl': component.get('purl', 'unknown'),
                    'issue': 'MISSING_LICENSE',
                    'severity': 'BLOCK',
                    'message': f"No license declared for {name}"
                })
                continue
            
            for lic in licenses:
                lic_id = self._normalize_license_id(lic)
                if lic_id in self.blocked:
                    violations.append({
                        'component': name,
                        'version': component.get('version', 'unknown'),
                        'purl': component.get('purl', 'unknown'),
                        'issue': 'BLOCKED_LICENSE',
                        'severity': 'BLOCK',
                        'license': lic_id,
                        'message': f"Blocked license {lic_id} for {name}"
                    })
                elif lic_id not in self.allowed and lic_id not in self.review:
                    violations.append({
                        'component': name,
                        'version': component.get('version', 'unknown'),
                        'purl': component.get('purl', 'unknown'),
                        'issue': 'UNRECOGNIZED_LICENSE',
                        'severity': 'REVIEW',
                        'license': lic_id,
                        'message': f"Unrecognized license {lic_id} for {name}"
                    })
        
        return len([v for v in violations if v['severity'] == 'BLOCK']) == 0, violations

    def _extract_licenses(self, component: Dict) -> List[str]:
        licenses = component.get('licenses', [])
        result = []
        for entry in licenses:
            if 'license' in entry:
                if 'id' in entry['license']:
                    result.append(entry['license']['id'])
                elif 'name' in entry['license']:
                    result.append(entry['license']['name'])
        return result

    def _normalize_license_id(self, lic_id: str) -> str:
        # Normalize SPDX IDs
        normalized = lic_id.strip()
        spdx_mapping = {
            'GPL 3.0': 'GPL-3.0',
            'GPL v3': 'GPL-3.0',
            'Apache 2.0': 'Apache-2.0',
            'Apache License 2.0': 'Apache-2.0',
            'MIT License': 'MIT',
            'BSD': 'BSD-3-Clause',
        }
        return spdx_mapping.get(normalized, normalized)


if __name__ == "__main__":
    checker = LicenseChecker("license-policy.yaml")
    passed, violations = checker.check_sbom(sys.argv[1])
    
    if not passed:
        print("License check FAILED:")
        for v in violations:
            if v['severity'] == 'BLOCK':
                print(f"  BLOCK: {v['message']}")
        sys.exit(1)
    
    if any(v['severity'] == 'REVIEW' for v in violations):
        print("License check PASSED with review items:")
        for v in violations:
            if v['severity'] == 'REVIEW':
                print(f"  REVIEW: {v['message']}")
    
    print("License check PASSED")
```

## Supply Chain Attestation Verification

### Attestation Policy

```yaml
# attestation-policy.yaml
attestation_policy:
  version: "1.0"
  required_predicate_types:
    - "https://cyclonedx.org/bom"
    - "https://spdx.dev/Document"
  
  verification:
    signature:
      required: true
      allowed_signers:
        - identity: "https://github.com/my-org/*"
          issuer: "https://token.actions.githubusercontent.com"
      keyless: true
      
    predicate:
      must_match_sbom: true
      allow_expired: false
      max_age_days: 30
  
  slsa:
    minimum_level: 2
    required_build_types:
      - "https://github.com/actions"
    provenance_required: true
```

### Verification CLI

```bash
# Cosign attestation verification
cosign verify-attestation \
  --type cyclonedx \
  --policy attestation-policy.yaml \
  my-image:latest

# Verify with keyless mode
cosign verify-attestation \
  --type cyclonedx \
  --certificate-identity-regexp "https://github.com/my-org/*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  my-image:latest

# Extract and validate SBOM from attestation
cosign download attestation my-image:latest | jq -r '.payload' | base64 -d | jq '.predicate'
```

## Fail-Build Thresholds

### Threshold Configuration

```yaml
# build-thresholds.yaml
build_policy:
  metadata:
    environment: production
  
  vulnerability:
    max_critical: 0
    max_high: 2
    max_medium: 10
    max_critical_with_exception: 1
    max_high_with_exception: 5
  
  license:
    max_blocked: 0
    max_unrecognized: 3
    max_review_pending: 10
  
  attestation:
    require_signature: true
    require_slsa_level: 2
    max_attestation_age_days: 30
  
  sbom:
    min_component_count: 10
    max_missing_purl: 2
    require_license_data: true
    require_dependency_graph: true
```

### Threshold Enforcement Script

```python
# enforce_build_gate.py
import json
import sys
import yaml
from datetime import datetime, timedelta

class BuildGate:
    def __init__(self, policy_path: str):
        with open(policy_path) as f:
            self.policy = yaml.safe_load(f)['build_policy']
    
    def evaluate(self, sbom_path: str, vuln_report_path: str = None):
        with open(sbom_path) as f:
            bom = json.load(f)
        
        results = {
            'passed': True,
            'blockers': [],
            'warnings': [],
            'info': []
        }
        
        # Check component count
        components = bom.get('components', [])
        if len(components) < self.policy['sbom']['min_component_count']:
            results['blockers'].append(
                f"Component count {len(components)} below minimum {self.policy['sbom']['min_component_count']}"
            )
        
        # Check PURL completeness
        missing_purl = [c for c in components if 'purl' not in c]
        if len(missing_purl) > self.policy['sbom']['max_missing_purl']:
            results['blockers'].append(
                f"Missing PURLs: {len(missing_purl)} exceeds max {self.policy['sbom']['max_missing_purl']}"
            )
        
        # Check license data
        missing_license = [c for c in components if not c.get('licenses')]
        if missing_license and self.policy['sbom']['require_license_data']:
            results['blockers'].append(
                f"Components missing license data: {[c['name'] for c in missing_license[:5]]}"
            )
        
        # Check vulnerabilities if provided
        if vuln_report_path:
            self._check_vulnerabilities(vuln_report_path, results)
        
        results['passed'] = len(results['blockers']) == 0
        return results
    
    def _check_vulnerabilities(self, vuln_report_path: str, results: dict):
        with open(vuln_report_path) as f:
            vulns = json.load(f)
        
        vuln_policy = self.policy['vulnerability']
        
        critical_count = len([v for v in vulns if v.get('severity') == 'CRITICAL'])
        high_count = len([v for v in vulns if v.get('severity') == 'HIGH'])
        medium_count = len([v for v in vulns if v.get('severity') == 'MEDIUM'])
        
        if critical_count > vuln_policy['max_critical']:
            results['blockers'].append(
                f"CRITICAL vulnerabilities: {critical_count} exceeds max {vuln_policy['max_critical']}"
            )
        if high_count > vuln_policy['max_high']:
            results['blockers'].append(
                f"HIGH vulnerabilities: {high_count} exceeds max {vuln_policy['max_high']}"
            )
        if medium_count > vuln_policy['max_medium']:
            results['warnings'].append(
                f"MEDIUM vulnerabilities: {medium_count} exceeds max {vuln_policy['max_medium']}"
            )


if __name__ == "__main__":
    gate = BuildGate("build-thresholds.yaml")
    results = gate.evaluate(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    
    for blocker in results['blockers']:
        print(f"BLOCKER: {blocker}")
    for warning in results['warnings']:
        print(f"WARNING: {warning}")
    
    sys.exit(0 if results['passed'] else 1)
```

## Exception Management

### Exception Request Workflow

```yaml
# exception-workflow.yaml
exception_management:
  workflow:
    steps:
      - name: submit_request
        required_fields:
          - vulnerability_id
          - package_name
          - package_version
          - reason
          - mitigations
          - expiry_date
          - requester
      - name: security_review
        required_approvals: 1
        reviewers:
          - security-team-lead
      - name: auto_approve
        conditions:
          - field: severity
            operator: equals
            value: LOW
          - field: reachable
            operator: equals
            value: false
          - field: expiry_days
            operator: less_than
            value: 90
      - name: notify
        channels:
          - slack: "#security-alerts"
          - email: security-team@company.com
```

### Exception Registry Schema

```yaml
# exception-registry.yaml
exceptions:
  - id: "EXC-2025-001"
    vulnerability: "CVE-2024-XXXX"
    package: "express"
    version: "4.17.1"
    severity: "HIGH"
    reason: "Not reachable - vulnerable endpoint not exposed in our configuration"
    mitigations:
      - "WAF rule blocks vulnerability exploit path"
      - "Network segmentation prevents external access"
    expiry: "2025-06-30"
    requester: "dev-team-alpha"
    approved_by: "security-team-lead"
    approved_date: "2025-01-15"
    status: "active"
    review_notes: "Acceptable risk - WAF rule verified in staging"
```

## Audit Trail

### Policy Decision Log

```yaml
# policy-decision-log.yaml
decisions:
  - id: "DEC-2025-001234"
    timestamp: "2025-01-15T10:30:00Z"
    artifact: "my-service:1.2.3"
    environment: "production"
    policy_version: "1.0.0"
    decision: "block"
    reasons:
      - "CRITICAL vulnerability CVE-2025-XXXX in lodash 4.17.20"
      - "License GPL-3.0 in transitive dependency unused-utils"
    evidence:
      sbom: "s3://sbom-store/my-service/1.2.3/bom.json"
      vuln_report: "s3://vuln-reports/my-service/1.2.3/report.json"
      policy_eval: "s3://policy-logs/DEC-2025-001234/eval.json"
    requestor: "ci-pipeline"
```

## Key Points

- OPA/Rego policies provide flexible, version-controlled SBOM validation with denial, warning, and allow decisions
- Severity policies must be environment-aware with different thresholds for production, staging, and development
- License compliance requires a three-tier model: allow, block, and review with automated SPDX ID normalization
- Attestation verification ensures SBOMs are signed by trusted identities and haven't expired
- Build thresholds combine vulnerability counts, license violations, and attestation requirements into a single pass/fail gate
- Exception management requires structured workflows with expiry dates and security team approval
- All policy decisions must be logged in an immutable audit trail for compliance and post-incident analysis
- Reachability analysis can reduce false positives by adjusting severity based on whether vulnerable code paths are actually invoked
