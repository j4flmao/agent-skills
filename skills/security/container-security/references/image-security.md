# Image Security

## Trivy

### Installation
```bash
brew install trivy
# or
docker pull aquasec/trivy:latest
```

### Scanning Commands
```bash
trivy image --severity CRITICAL,HIGH --exit-code 1 myapp:latest
trivy image --severity MEDIUM --ignore-unfixed myapp:latest
trivy fs --severity CRITICAL,HIGH .
trivy repo https://github.com/org/repo
trivy sbom bom.json  # scan existing SBOM
```

### CI Integration
```yaml
- name: Scan image
  run: |
    trivy image \
      --severity CRITICAL,HIGH \
      --exit-code 1 \
      --format sarif \
      --output trivy-results.sarif \
      ${{ env.IMAGE }}
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
db-repository: ghcr.io/aquasecurity/trivy-db
```

## Grype

### Installation
```bash
brew install grype
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh
```

### Commands
```bash
grype myapp:latest
grype myapp:latest --only-fixed --fail-on critical
grype dir:.  # scan filesystem
grype sbom:bom.json  # scan SBOM
```

### Output Formats
```bash
grype myapp:latest -o json > grype-report.json
grype myapp:latest -o table  # human-readable
grype myapp:latest -o cyclonedx  # convert to SBOM
```

## Dockerfile Best Practices

### Multi-stage Builds
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Runtime stage
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
- `gcr.io/distroless/base`: glibc + base utilities (no shell, no package manager)
- `gcr.io/distroless/static`: for statically linked binaries
- `gcr.io/distroless/cc`: glibc + C runtime
- Benefits: minimal attack surface, no shell, no package manager, minimal CVEs

### Hardening Checklist
- [ ] No root user — use `USER 10001:10001`
- [ ] No `latest` tag — use semantic versioning or commit SHA
- [ ] Package versions pinned — no `apt-get install` without version
- [ ] Build and runtime separated via multi-stage
- [ ] Distroless or minimal base image for runtime
- [ ] Package manager cache cleaned in build stage
- [ ] `RUN --mount=type=cache` for build dependencies
- [ ] Labels for provenance: `org.opencontainers.image.source`, `org.opencontainers.image.revision`
- [ ] Healthcheck defined
- [ ] No sensitive files in build context (`.dockerignore`)

### .dockerignore
```
node_modules
.git
*.md
.env
.env.*
Dockerfile
.dockerignore
coverage
test
dist/*.map
```

## CVE Management

### Severity Thresholds
CRITICAL: block build, immediate fix required. HIGH: block build for production images, fix within 7 days. MEDIUM: warn, fix within 30 days. LOW: log, fix within 90 days.

### Resolution Strategy
1. Update base image to patched version
2. Pin dependency to fix version
3. OS-level patch (apt/apk update)
4. Compensating control (WAF rule, network policy)
5. Exception with documented risk acceptance

### Daily Scan Pipeline
```yaml
- name: Rescan all images
  run: |
    for image in $(list-images); do
      trivy image --severity CRITICAL,HIGH $image
    done
```
Alert when new CVEs detected on deployed images. Auto-create ticket for critical/high findings. Update vulnerability dashboard daily.
