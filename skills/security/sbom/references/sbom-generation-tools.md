# SBOM Generation Tools Comparison

## Overview

Selecting the right SBOM generation tool depends on your ecosystem, CI/CD pipeline, performance requirements, and output format needs. This guide provides a comprehensive comparison of leading SBOM generation tools with integration patterns and benchmarks.

## Tool Comparison Matrix

### Core Tools

| Tool | Language | Ecosystems | Output Formats | Speed | License |
|------|----------|------------|----------------|-------|---------|
| Syft | Go | 15+ ecosystems | CycloneDX JSON/XML, SPDX JSON/Tag-Value, Syft JSON | Fast (~1-3s) | Apache 2.0 |
| Trivy | Go | 15+ ecosystems | CycloneDX JSON, SPDX JSON, SARIF | Moderate (~3-10s) | Apache 2.0 |
| CycloneDX CLI | Java | All (via plugins) | CycloneDX JSON/XML, SPDX JSON | Moderate (~5-15s) | Apache 2.0 |
| cdxgen | Node.js | 20+ ecosystems | CycloneDX JSON | Moderate (~5-10s) | Apache 2.0 |
| ORT | Kotlin | 10+ ecosystems | CycloneDX JSON, SPDX JSON, custom | Slow (~30-300s) | Apache 2.0 |
| Docker SBOM | Go | 4 ecosystems | CycloneDX JSON, SPDX JSON | Fast (~2-5s) | Apache 2.0 |
| Tern | Python | 5 ecosystems | CycloneDX JSON, SPDX Tag-Value | Slow (~10-30s) | Apache 2.0 |
| SPDX Tools | Java | Universal (manual) | SPDX RDF/XML, JSON, XLSX | Very Slow | Apache 2.0 |

## Tool Selection Criteria

### Ecosystem Coverage

```yaml
ecosystem_coverage:
  syft:
    - npm
    - pip
    - maven
    - gradle
    - nuget
    - cargo
    - go modules
    - rpm
    - apk
    - deb
    - docker
    - oci
    - sbom (read existing)
  trivy:
    - npm
    - pip
    - maven
    - gradle
    - nuget
    - cargo
    - go modules
    - rpm
    - apk
    - deb
    - docker
    - oci
    - filesystem
    - git repository
  cdxgen:
    - npm
    - pip
    - maven
    - gradle
    - nuget
    - cargo
    - go modules
    - composer
    - gem
    - cargo
    - docker
    - oci
    - helm
    - pypi
    - conda
  cyclonedx-cli:
    - maven (plugin)
    - gradle (plugin)
    - npm (plugin)
    - pip (plugin)
    - go modules (plugin)
    - nuget (plugin)
    - cargo (plugin)
    - docker (plugin)
```

### Selection Decision Tree

```
What is your primary use case?
├── Container image scanning
│   ├── Best: Syft (fastest, broadest)
│   ├── Alternative: Trivy (unified vuln + SBOM)
│   └── Alternative: Docker SBOM (built-in, Docker Desktop)
├── Build-time dependency resolution
│   ├── Best: CycloneDX CLI plugins (most accurate)
│   ├── Alternative: cdxgen (broadest ecosystem)
│   └── Alternative: Syft dir: scan (fastest)
├── Full dependency audit / compliance
│   ├── Best: ORT (comprehensive, policy engine)
│   └── Alternative: Syft + Grype pipeline
├── CI/CD integration
│   ├── Best: Syft (fast, small binary, no deps)
│   ├── Alternative: Trivy (unified scan)
│   └── Alternative: CycloneDX Maven plugin (Maven projects)
└── Regulatory compliance (SPDX required)
    ├── Best: Syft (SPDX JSON output)
    ├── Alternative: Trivy (SPDX JSON output)
    └── Alternative: SPDX Tools (full SPDX feature set)
```

## Syft Integration

### Installation

```bash
# Linux/macOS
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Docker
docker pull anchore/syft:latest

# Homebrew
brew install syft

# Go
go install github.com/anchore/syft/cmd/syft@latest
```

### Usage Patterns

```bash
# Scan container image
syft packages alpine:latest -o cyclonedx-json > alpine-bom.json

# Scan local directory
syft packages . -o cyclonedx-json > source-bom.json

# Scan with SPDX output
syft packages node:18 -o spdx-json > node-bom.spdx.json

# Scan specific ecosystem only
syft packages . --select-catalogers "python-package-cataloger" -o json

# Exclude dev dependencies
syft packages . --exclude "./node_modules/**" -o cyclonedx-json

# Scan with multiple outputs
syft packages my-image:latest \
  -o cyclonedx-json=output/bom.cdx.json \
  -o spdx-json=output/bom.spdx.json \
  -o syft-json=output/bom.syft.json

# Generate attestation-ready SBOM
syft packages my-image:latest -o cyclonedx-json \
  | cosign attest --predicate /dev/stdin --type cyclonedx my-image:latest
```

### CI/CD Integration

```yaml
# GitHub Actions
name: Generate SBOM
on:
  push:
    branches: [main]
jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - name: Install Syft
        uses: anchore/sbom-action@v0
        with:
          path: ./
          format: cyclonedx-json
          output-file: bom.json
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: bom.json
```

```yaml
# GitLab CI
sbom-generation:
  stage: build
  image:
    name: anchore/syft:latest
    entrypoint: [""]
  script:
    - syft packages . -o cyclonedx-json > bom.json
    - |
      syft packages . -o spdx-json > bom.spdx.json
  artifacts:
    paths:
      - bom.json
      - bom.spdx.json
```

```yaml
# Docker Compose / Local
services:
  sbom-generator:
    image: anchore/syft:latest
    volumes:
      - .:/project
      - ./output:/output
    command: packages /project -o cyclonedx-json=/output/bom.json
```

## Trivy Integration

### Installation

```bash
# Linux
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Docker
docker pull aquasec/trivy:latest

# Homebrew
brew install trivy
```

### Usage Patterns

```bash
# Generate SBOM from image
trivy image --format cyclonedx --output bom.json alpine:latest

# Generate and scan in one pass
trivy image --format cyclonedx --output bom.json --severity CRITICAL,HIGH alpine:latest

# Scan filesystem and generate SBOM
trivy filesystem --format cyclonedx --output fs-bom.json .

# Generate SPDX format
trivy image --format spdx-json --output bom.spdx.json alpine:latest

# Generate SBOM with attestation
trivy image --format cyclonedx --output bom.json --generate-attestation alpine:latest
```

## CycloneDX CLI Integration

### Installation

```bash
# Download from GitHub releases
curl -LO https://github.com/CycloneDX/cyclonedx-cli/releases/latest/download/cyclonedx-linux-amd64.tar.gz
tar -xzf cyclonedx-linux-amd64.tar.gz
chmod +x cyclonedx
sudo mv cyclonedx /usr/local/bin/
```

### Build-Time Plugin Usage

```xml
<!-- Maven POM -->
<plugin>
  <groupId>org.cyclonedx</groupId>
  <artifactId>cyclonedx-maven-plugin</artifactId>
  <version>2.7.9</version>
  <executions>
    <execution>
      <phase>package</phase>
      <goals>
        <goal>makeBom</goal>
      </goals>
      <configuration>
        <projectType>application</projectType>
        <schemaVersion>1.5</schemaVersion>
        <includeBomSerialNumber>true</includeBomSerialNumber>
        <includeCompileScope>true</includeCompileScope>
        <includeProvidedScope>true</includeProvidedScope>
        <includeRuntimeScope>true</includeRuntimeScope>
        <includeSystemScope>false</includeSystemScope>
        <includeTestScope>false</includeTestScope>
        <outputFormat>json</outputFormat>
        <outputName>sbom</outputName>
      </configuration>
    </execution>
  </executions>
</plugin>
```

```json
// npm package.json
{
  "scripts": {
    "sbom": "cyclonedx-npm --output-format JSON --output-file bom.json"
  },
  "devDependencies": {
    "@cyclonedx/cyclonedx-npm": "^1.10.0"
  }
}
```

```python
# pip / requirements.txt
# pip install cyclonedx-bom
cyclonedx-py requirements.txt --output-format json --output-file bom.json
```

### CLI Operations

```bash
# Validate SBOM
cyclonedx validate --input-file bom.json --input-format json

# Convert format
cyclonedx convert --input-file bom.spdx.json --input-format json --output-format xml

# Diff two SBOMs
cyclonedx diff --from-file bom-v1.json --to-file bom-v2.json

# Merge SBOMs
cyclonedx merge --input-files bom1.json,bom2.json --output-file merged.json

# Enrich SBOM with metadata
cyclonedx enrich --input-file bom.json --output-file enriched.json --metadata metadata.json
```

## cdxgen Integration

### Installation

```bash
# npm global install
npm install -g @cyclonedx/cdxgen

# Docker
docker pull ghcr.io/cyclonedx/cdxgen
```

### Usage

```bash
# Scan project directory
cdxgen -o bom.json

# Specify project type
cdxgen -t python -o bom.json .

# Recursive scan with dev deps
cdxgen --include-dev -o bom.json .

# Generate for monorepo
cdxgen -o bom.json --deep

# Docker integration
docker run --rm -v $(pwd):/project ghcr.io/cyclonedx/cdxgen -o /project/bom.json /project

# Output SPDX
cdxgen --spec-version 2.3 -o bom.spdx.json .
```

## ORT (OSS Review Toolkit) Integration

### Configuration

```bash
# Docker setup
docker pull ghcr.io/oss-review-toolkit/ort:latest
```

```yaml
# ort.yml
repository:
  - type: git
    url: https://github.com/example/my-project.git
  
analyzer:
  enabled_package_managers:
    - NPM
    - PIP
    - MAVEN
  skip_excluded: true

scanner:
  enabled_scanners:
    - ScanCode
    - BoyterLc
  skip_concluded: true

evaluator:
  policy_file: policies/rules.kts

reporter:
  formats:
    - CycloneDX
    - StaticHtml
    - ExcelReport
    - NoticeTemplate
```

```bash
# Full ORT pipeline
docker run --rm -v $(pwd):/project ghcr.io/oss-review-toolkit/ort \
  --info analyze -i /project -o /project/ort-results/analyzer
docker run --rm -v $(pwd):/project ghcr.io/oss-review-toolkit/ort \
  --info report -i /project/ort-results/analyzer/analyzer-result.yml -o /project/ort-results/reporter
```

## Docker SBOM Integration

```bash
# Using Docker Desktop
docker sbom alpine:latest --format cyclonedx-json > alpine-bom.json
docker sbom alpine:latest --format spdx-json > alpine-bom.spdx.json

# Install Docker SBOM plugin manually
docker plugin install --alias sbom anchore/sbom:latest
docker sbom alpine:latest > bom.json
```

## Language-Specific Generators

### npm

```bash
# CycloneDX npm
npx @cyclonedx/cyclonedx-npm --output-file bom.json

# npm-ls based approach
npm ls --all --json > npm-deps.json
```

### pip / Python

```bash
# pip-licenses
pip install pip-licenses
pip-licenses --format=json > licenses.json

# CycloneDX Python
pip install cyclonedx-bom
cyclonedx-py requirements.txt -o bom.json

# Poetry
poetry export -f requirements.txt | cyclonedx-py -o bom.json
```

### Maven / Gradle

```bash
# Maven CycloneDX plugin
mvn org.cyclonedx:cyclonedx-maven-plugin:makeBom

# Gradle CycloneDX plugin
./gradlew cyclonedxBom

# Gradle SBOM location
# build/reports/cyclonedx/bom.json
```

### Cargo / Rust

```bash
# cargo-cyclonedx
cargo install cargo-cyclonedx
cargo cyclonedx -f json
# Output: target/cyclonedx/bom.json
```

### Go Modules

```bash
# CycloneDX Go
go install github.com/CycloneDX/cyclonedx-go/cmd/cyclonedx-gomod@latest
cyclonedx-gomod app -json -o bom.json .

# Syft for Go
syft packages . --select-catalogers "go-module-cataloger" -o cyclonedx-json
```

## Performance Benchmarks

### Scan Speed Comparison (seconds, lower is better)

| Project Size | Syft | Trivy | cdxgen | CycloneDX CLI | ORT |
|-------------|------|-------|--------|---------------|-----|
| Small (50 deps) | 0.8s | 2.1s | 1.5s | 3.2s | 25s |
| Medium (500 deps) | 2.1s | 5.4s | 4.8s | 8.1s | 68s |
| Large (5000 deps) | 8.3s | 18.7s | 22.1s | 35.6s | 240s |
| Monorepo (20000 deps) | 35s | 72s | 95s | 180s | 600s+ |

### Binary Size

| Tool | Binary Size | Dependencies |
|------|-------------|--------------|
| Syft | ~45 MB | None (static binary) |
| Trivy | ~55 MB | None (static binary) |
| CycloneDX CLI | ~25 MB | Requires JVM |
| cdxgen | ~15 MB | Requires Node.js |
| ORT | ~120 MB | Requires JVM |
| Docker SBOM | ~40 MB | Requires Docker |

### Accuracy Comparison

| Aspect | Syft | Trivy | cdxgen | CycloneDX CLI |
|--------|------|-------|--------|---------------|
| Lock file resolution | Excellent | Good | Excellent | Excellent |
| Container layer analysis | Excellent | Excellent | Good | Limited |
| Build-time vs post-hoc | Post-hoc | Post-hoc | Post-hoc | Build-time |
| Dev dependency filtering | Manual | Built-in | Flag | Scope-based |
| Dependency tree depth | Direct + deep | Direct + deep | Direct + deep | Build tool resolved |
| File-level license detection | Limited | Limited | Limited | Supported |

## Format Compatibility

### Output Format Support

| Tool | CycloneDX JSON | CycloneDX XML | SPDX JSON | SPDX Tag-Value | SPDX RDF/XML | Custom |
|------|---------------|---------------|-----------|----------------|--------------|--------|
| Syft | Yes (default) | Yes | Yes | Yes | No | Syft JSON |
| Trivy | Yes | No | Yes | No | No | SARIF |
| CycloneDX CLI | Yes | Yes | Yes | No | No | - |
| cdxgen | Yes | No | Limited | No | No | - |
| ORT | Yes | No | Yes | No | No | YAML, HTML |
| Docker SBOM | Yes | No | Yes | No | No | - |

### SBOM Version Compatibility

| Tool | CycloneDX v1.4 | CycloneDX v1.5 | SPDX 2.2 | SPDX 2.3 | SPDX 3.0 |
|------|---------------|---------------|----------|----------|----------|
| Syft | Yes | Yes | Yes | Yes | No |
| Trivy | Yes | Yes | Yes | Yes | No |
| CycloneDX CLI | Yes | Yes | Yes | Yes | Limited |
| cdxgen | Yes | Yes | Yes | Yes | No |
| ORT | Yes | Limited | Yes | Yes | No |

## Validation and Quality Assurance

### SBOM Validation Commands

```bash
# CycloneDX schema validation
cyclonedx validate --input-file bom.json --fail-on-errors

# Syft quality checks
syft packages --check ./bom.json

# Custom validation script
python -c "
import json
with open('bom.json') as f:
    bom = json.load(f)
assert bom['bomFormat'] == 'CycloneDX'
assert bom['specVersion'] >= '1.4'
assert len(bom.get('components', [])) > 0
# Verify each component has required fields
for comp in bom['components']:
    assert 'name' in comp
    assert 'version' in comp
    assert 'purl' in comp
    assert 'type' in comp
    assert 'licenses' in comp
print(f'Valid SBOM: {len(bom[\"components\"])} components')
"
```

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Component count accuracy | ±5% of lock file | Compare deps count vs lock file |
| License detection rate | > 90% | Known licenses / total components |
| PURL correctness | 100% | Validate PURL syntax per spec |
| Dependency tree depth | All transitive deps | Compare with lock file tree |
| Generation time | < 10s for 500 deps | CI pipeline measurement |

## Key Points

- Syft is the best general-purpose SBOM generator: fastest, broadest ecosystem support, static binary
- CycloneDX CLI plugins provide the most accurate dependency resolution during builds
- Trivy is ideal when you need unified SBOM generation + vulnerability scanning in one pass
- cdxgen offers the broadest ecosystem coverage with 20+ package managers supported
- ORT provides comprehensive compliance reporting but is significantly slower
- Always validate generated SBOMs against the schema before publishing
- Prefer build-time generation for accuracy, post-hoc scanning for speed
- Generate in CycloneDX JSON as default, add SPDX when regulatory compliance is required
