# Security Auditor Advanced

## Overview
Advanced security auditing covers supply chain security, infrastructure-as-code audit, secrets scanning, compliance auditing (SOC2, HIPAA, PCI-DSS), and penetration testing methodology.

## Advanced Concepts

### Concept 1: Supply Chain Security
Audit dependency build process: SLSA framework (Supply-chain Levels for Software Artifacts), SBOM generation (CycloneDX, SPDX), signed artifacts (Sigstore, cosign), reproducible builds, and provenance attestations. Audit third-party dependencies for malicious packages (typosquatting, dependency confusion).

### Concept 2: IaC Security Audit
Infrastructure-as-Code scanning: Terraform (tfsec, checkov, terrascan), Kubernetes (kube-bench, kube-hunter, polaris), Dockerfile (hadolint, dockle, trivy), CloudFormation (cfn-nag, cfn-guard). Check for: overly permissive IAM, open security groups, unencrypted storage, public S3 buckets.

### Concept 3: Secrets Scanning
Detect secrets in code: gitLeaks, truffleHog, detect-secrets. Scan git history (all branches). Block secrets at commit (pre-commit hooks). Vault/Key Vault for runtime secrets. Audit for: API keys, tokens, passwords, connection strings, certificates, private keys.

### Concept 4: Compliance Auditing
Regulatory-specific checks: SOC2 (access controls, change management, encryption), HIPAA (PHI encryption, access logging, BAA), PCI-DSS (card data storage prohibition, encryption, segmentation), GDPR (data retention, consent, right to deletion). Map controls to evidence collection.

### Concept 5: Penetration Testing
Methodology: recon (enumeration) → scanning (port, service) → exploitation (prove impact) → persistence (escalation) → reporting (findings with remediation). OWASP WSTG for web app testing. Scope matters: internal vs external, black-box vs white-box.

## Advanced Techniques

### IaC Security Check (Terraform)
```hcl
# checkov: CKV_AWS_18: Ensure S3 bucket has access logging
resource "aws_s3_bucket" "logs" {
  bucket = "my-log-bucket"
  logging {
    target_bucket = aws_s3_bucket.logs.id
    target_prefix = "log/"
  }
}
```

### Secrets Pre-Commit Hook
```yaml
# .pre-commit-config.yaml
repos:
- repo: https://github.com/gitleaks/gitleaks
  rev: v8.16.0
  hooks:
  - id: gitleaks
```

## Anti-Patterns

- SBOM without verification (collection without action)
- IaC scanning without CI gate (findings ignored)
- Secrets scanning only current branch (miss historical leaks)
- Compliance checklists without evidence (audit fails without proof)
- Pen testing production without authorization (legal liability)
- False negative toleration (scanning tools miss context)
- SSL/TLS scanning without cipher strength analysis
- Dependency confusion prevention only in CI (dev needs too)
