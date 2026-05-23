# Image Security

## Trivy

### Installation
```bash
brew install trivy
docker pull aquasec/trivy:latest
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh
```

### Scanning Commands
```bash
trivy image --severity CRITICAL,HIGH --exit-code 1 myapp:latest
trivy fs --severity CRITICAL,HIGH .
trivy repo https://github.com/org/repo
trivy sbom bom.json
trivy image --format sarif --output results.sarif myapp:latest
```

### CI Integration
```yaml
- name: Scan image
  run: |
    trivy image --severity CRITICAL,HIGH --exit-code 1 \
      --format sarif --output trivy-results.sarif ${{ env.IMAGE }}
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

### Configuration (.trivy.yaml)
```yaml
severity: CRITICAL,HIGH
vuln-type: os,library
ignore-unfixed: true
exit-code: 1
timeout: 10m
```

## Grype

### Installation
```bash
brew install grype
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh
```

### Commands
```bash
grype myapp:latest --only-fixed --fail-on critical
grype dir:
grype sbom:bom.json
grype myapp:latest -o json > grype-report.json
```

### Syft SBOM Integration
```bash
syft packages myapp:latest -o cyclonedx-json > sbom.cdx.json
grype sbom:sbom.cdx.json
```
Syft generates SBOM from images and filesystems. Grype scans SBOM directly without pulling the image.

## Clair
Registry-side scanning via Clair v4 and Quay. Scans on push and schedule. API-first design. Notification webhooks on new vulnerabilities.

## Snyk
Developer-first: IDE plugins, CLI, PR checks. Fix advice with actionable version bumps. Reachability analysis flags only used code paths. `docker scan myapp:latest`.

## Dockerfile Best Practices

### Multi-stage Builds
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Distroless Images
`gcr.io/distroless/base`: glibc + base, no shell or package manager. `gcr.io/distroless/static`: for Go/Rust binaries. `gcr.io/distroless/cc`: glibc + C runtime. Benefits: minimal attack surface, no shell, minimal CVEs.

### Hardening Checklist
No root user, no latest tag, pinned package versions, multi-stage separation, distroless base, cache cleaned, provenance labels, healthcheck defined, .dockerignore excludes sensitive files.

### .dockerignore
```
node_modules, .git, *.md, .env, .env.*, Dockerfile, .dockerignore, coverage, test, dist/*.map
```

## Cosign Image Signing
```bash
cosign sign --keyless <image>
cosign verify --keyless <image>
cosign attest --keyless --type cyclonedx sbom.cdx.json <image>
```
Keyless signing uses OIDC identity from CI provider. No key management needed. Signature stored in registry. Verify before deployment via admission controller.

## SBOM Generation
Syft: `syft packages <image> -o cyclonedx-json > sbom.cdx.json`. Trivy: `trivy image --format cyclonedx --output sbom.cdx.json <image>`. Store as attestation. Required for supply chain transparency.

## CVE Management

### Severity Thresholds
CRITICAL: block build, fix immediately. HIGH: block build for production, fix within 7 days. MEDIUM: warn, fix within 30 days. LOW: log, fix within 90 days.

### Resolution Strategy
1. Update base image. 2. Pin dependency to fix version. 3. OS-level patch. 4. Compensating control (WAF, network policy). 5. Exception with documented risk acceptance and expiry.

### Daily Scan Pipeline
```yaml
- name: Rescan all images
  run: |
    for image in $(list-images); do
      trivy image --severity CRITICAL,HIGH $image
    done
```
Alert on new CVEs in deployed images. Auto-create tickets for critical/high. Update vulnerability dashboard daily.
