# Secrets Management Advanced Topics

## Introduction
Advanced secrets management covers dynamic secret generation, secrets and workload identity (SPIFFE/SPIRE), secrets rotation strategies for zero-downtime, secrets encryption at the application level, secrets management in CI/CD pipelines, and secretless architectures.

## Dynamic Secrets Patterns
Dynamic secrets are generated on-demand with short lifetimes:
- **Database credentials**: New user created per request, revoked after TTL
- **API tokens**: Short-lived tokens issued by security token service
- **SSH key pairs**: Ephemeral keys for SSH sessions
- **Cloud provider credentials**: STS tokens with limited permissions

## Zero-Downtime Secret Rotation
Rotation without application downtime requires coordination:
1. **Dual-credential pattern**: Two valid credentials at any time
2. **Rotate app A's credential** → **Rotate app B's credential** → **Revoke old credential**
3. Applications must support retry with alternative credential

## Secrets in CI/CD Pipelines
- Use CI/CD built-in secret storage (GitHub Secrets, GitLab CI variables)
- Never pass secrets as plaintext in pipeline logs or environment dumps
- Use OIDC-based authentication instead of long-lived cloud credentials
- Sign pipeline artifacts to prevent tampering
- Example GitHub OIDC for AWS:
```yaml
name: Deploy
on: [push]
permissions:
  id-token: write  # Needed for OIDC
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456:role/GitHubActionsDeploy
          aws-region: us-east-1
      - name: Deploy
        run: ./deploy.sh
```

## Secretless Architectures
Cloud-native approach where applications don't directly manage secrets:
- Cloud IAM handles authentication and authorization
- Workload identity (GCP IAM, AWS IAM roles for service accounts)
- No secrets in application memory — identity is intrinsic to the infrastructure
- Requires cloud-native infrastructure (not applicable to all environments)

## Key Points
- Dynamic secrets with auto-expiration reduce blast radius significantly
- Zero-downtime rotation requires dual-credential pattern and retry logic
- CI/CD pipelines should use OIDC instead of long-lived credentials
- SPIFFE/SPIRE provides workload identity for mTLS-based secret distribution
- Application-level encryption (Vault Transit) encrypts data without exposing keys
- Secretless architectures remove secrets entirely via cloud IAM
- Audit trails for every secret access are critical for compliance
- Hardware Security Modules (HSMs) provide tamper-resistant key storage
- Sidecar patterns (Vault Agent, Consul Template) inject secrets without app changes
