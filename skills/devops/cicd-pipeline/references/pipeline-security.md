# CI/CD Pipeline Security

Securing the CI/CD pipeline prevents supply chain attacks, credential leakage, and unauthorized deployments.

## Secret Injection

### GitHub Actions

```yaml
name: Secure CI
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      # Use OpenID Connect instead of static secrets
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeploy
          aws-region: us-east-1

      # Use environment secrets
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: ./deploy.sh
```

### GitLab CI

```yaml
deploy:
  stage: deploy
  environment: production
  variables:
    VAULT_ADDR: "https://vault.example.com"
  id_tokens:
    VAULT_ID_TOKEN:
      aud: https://vault.example.com
  script:
    - |
      VAULT_TOKEN=$(curl -s --request POST \
        --data "{\"jwt\":\"$VAULT_ID_TOKEN\",\"role\":\"ci\"}" \
        $VAULT_ADDR/v1/auth/gitlab/login | jq -r '.auth.client_token')
      DB_PASSWORD=$(vault kv get -token=$VAULT_TOKEN -field=password secret/ci/db)
      ./deploy.sh
```

## OIDC Authentication

### GitHub Actions → AWS

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GH-Env-Prod
          role-session-name: github-deploy
          aws-region: us-east-1
```

### AWS IAM Role Trust Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GitHubActionsDeploy",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:myorg/myapp:environment:production"
        }
      }
    }
  ]
}
```

## Signed Commits

### Git Commit Signing

```yaml
jobs:
  verify:
    steps:
      - uses: actions/checkout@v4
      - name: Verify signed commits
        run: |
          git log --format='%H %G?' | grep -v ' G$' || true
          # Verify all commits in PR are signed
          git log origin/main..HEAD --format='%H %G?' | while read hash status; do
            if [ "$status" != "G" ]; then
              echo "Commit $hash is not signed!"
              exit 1
            fi
          done
```

### Cosign Container Signing

```yaml
- name: Sign container image
  env:
    COSIGN_EXPERIMENTAL: 1
  run: |
    cosign sign --key env://COSIGN_PRIVATE_KEY \
      ghcr.io/myorg/myapp:${{ github.sha }}

- name: Verify image
  run: |
    cosign verify --key cosign.pub \
      ghcr.io/myorg/myapp:${{ github.sha }}
```

## SBOM Generation

```yaml
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    path: ./
    format: spdx-json
    output-file: sbom.spdx.json

- name: Upload SBOM
  uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.spdx.json

- name: Attach SBOM to release
  uses: softprops/action-gh-release@v1
  with:
    files: sbom.spdx.json
```

### SBOM with Syft

```yaml
- name: Generate container SBOM
  run: |
    syft ghcr.io/myorg/myapp:${{ github.sha }} \
      -o spdx-json=sbom.json
    grype sbom:sbom.json \
      --fail-on high \
      --only-fixed
```

## Supply Chain Levels (SLSA)

| Level | Requirements | Pipeline |
|-------|-------------|----------|
| SLSA 1 | Provenance generated | Basic build script |
| SLSA 2 | Signed provenance + hosted build | GitHub Actions/GitLab CI |
| SLSA 3 | Hardened build + no user control | Hermetic builds, isolation |
| SLSA 4 | Two-person review + reproducible | Full audit trail |

### SLSA Provenance

```yaml
- name: Generate SLSA provenance
  uses: slsa-framework/github-actions-demo@v1
  with:
    artifact: dist/*
    output: attestation.intoto.jsonl

- name: Verify provenance
  uses: slsa-framework/verify-action@v1
  with:
    attestation: attestation.intoto.jsonl
```

## Security Scanning Gates

```yaml
jobs:
  security:
    steps:
      - uses: actions/checkout@v4

      - name: SAST (CodeQL)
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript"

      - name: Dependency scan
        run: |
          npm audit --audit-level=high
          trivy fs --severity CRITICAL --exit-code 1 .

      - name: Secret scanning
        uses: trufflesecurity/trufflehog@v3
        with:
          extra_args: --only-verified

      - name: Container scan
        run: |
          trivy image --severity HIGH,CRITICAL --exit-code 1 \
            ghcr.io/myorg/myapp:${{ github.sha }}
```

## Pipeline Hardening

```yaml
# Restrict token permissions
permissions:
  contents: read
  id-token: write
  packages: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    concurrency: production-deploy  # prevent concurrent deploys
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for commit verification

      - name: Verify runner integrity
        run: |
          # Verify runner is not tampered
          if [ "$RUNNER_ENVIRONMENT" != "github-hosted" ]; then
            echo "Self-hosted runner - verify security!"
          fi
```

Pipeline security requires defense in depth: signed artifacts, short-lived credentials, SBOMs, SLSA compliance, and principle of least privilege.
