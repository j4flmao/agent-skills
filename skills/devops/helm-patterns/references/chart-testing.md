# Chart Testing

## Helm Test Pods

### Basic Test Pod
```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "chart.fullname" . }}-test-connection"
  labels:
    {{- include "chart.labels" . | nindent 4 }}
  annotations:
    helm.sh/hook: test
spec:
  containers:
    - name: wget
      image: busybox:1.36
      command: ['wget']
      args:
        - '--timeout=5'
        - '--tries=3'
        - '{{ include "chart.fullname" . }}:{{ .Values.service.port }}'
  restartPolicy: Never
```

### Database Connection Test
```yaml
# templates/tests/test-database.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "chart.fullname" . }}-test-database"
  annotations:
    helm.sh/hook: test
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  containers:
    - name: postgres-test
      image: bitnami/postgresql:16
      env:
        - name: PG_HOST
          value: "{{ .Release.Name }}-postgresql"
        - name: PG_USER
          value: "{{ .Values.postgresql.auth.username }}"
        - name: PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: {{ .Release.Name }}-postgresql
              key: password
        - name: PG_DATABASE
          value: "{{ .Values.postgresql.auth.database }}"
      command:
        - sh
        - -c
        - |
          pg_isready -h $PG_HOST -U $PG_USER -d $PG_DATABASE
          psql -h $PG_HOST -U $PG_USER -d $PG_DATABASE -c "SELECT 1;"
  restartPolicy: Never
```

### API Health Check Test
```yaml
# templates/tests/test-api.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "chart.fullname" . }}-test-api"
  annotations:
    helm.sh/hook: test
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  containers:
    - name: curl-test
      image: curlimages/curl:8.5
      command:
        - sh
        - -c
        - |
          echo "Testing health endpoint..."
          curl -sf http://{{ include "chart.fullname" . }}:{{ .Values.service.port }}/health || exit 1
          
          echo "Testing readiness endpoint..."
          curl -sf http://{{ include "chart.fullname" . }}:{{ .Values.service.port }}/ready || exit 1
          
          echo "All endpoints healthy!"
  restartPolicy: Never
```

### Test with Expected Data
```yaml
# templates/tests/test-grpc.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "chart.fullname" . }}-test-grpc"
  annotations:
    helm.sh/hook: test
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  containers:
    - name: grpcurl-test
      image: fullstory/grpcurl:1.9
      command:
        - grpcurl
        - -plaintext
        - -d
        - '{"service": "grpc.health.v1.Health"}'
        - "{{ include "chart.fullname" . }}:{{ .Values.grpc.port }}"
        - grpc.health.v1.Health/Check
  restartPolicy: Never
```

## Chart-Testing (`ct`) Tool

### Installation
```bash
# macOS
brew install chart-testing

# Linux
wget -O ct.tar.gz https://github.com/helm/chart-testing/releases/download/v3.11.0/chart-testing_3.11.0_linux_amd64.tar.gz
tar -xzf ct.tar.gz
sudo mv ct /usr/local/bin/

# Docker
docker pull quay.io/helmpack/chart-testing:v3.11.0
```

### Configuration File
```yaml
# ct.yaml
target-branch: main
chart-dirs:
  - charts
  - deploy/charts
chart-repos:
  - bitnami=https://charts.bitnami.com/bitnami
  - stable=https://charts.helm.sh/stable
helm-extra-args: --timeout 600s
validate-maintainers: true
check-version-increment: true
debug: true
```

### Lint Configuration
```yaml
# ct-lint.yaml
target-branch: main
chart-dirs:
  - charts
validate-maintainers: true
chart-repos:
  - bitnami=https://charts.bitnami.com/bitnami
exclude-deprecated: true
excluded:
  - "must include a Kubernetes API version"
  - "chart must specify a valid version"
```

### CI Configuration
```yaml
# ct-install.yaml
target-branch: main
chart-dirs:
  - charts
chart-repos:
  - bitnami=https://charts.bitnami.com/bitnami
helm-extra-args: --timeout 600s
upgrade: true
release-label: ct
namespace: ct-test
skip-missing-values: true
```

## Linting

### Helm Lint
```bash
# Basic lint
helm lint ./mychart

# Lint with strict mode
helm lint ./mychart --strict

# Lint with custom values
helm lint ./mychart -f ci/test-values.yaml

# Lint with namespace
helm lint ./mychart --namespace staging

# Lint all charts in directory
for chart in charts/*/; do
  helm lint "$chart" --strict
done
```

### Common Lint Errors
| Error | Cause | Fix |
|-------|-------|-----|
| `chart must specify a valid version` | Missing or invalid `version` in Chart.yaml | Set semantic version |
| `chart must specify an apiVersion` | Missing `apiVersion` field | Add `apiVersion: v2` |
| `chart type must not be empty` | Missing `type` field | Add `type: application` |
| `dependencies must contain a repository` | Missing repository for dependency | Add repository URL |
| `unable to validate against schema` | values.schema.json mismatch | Update schema to match values |

### Custom Lint Rules
```yaml
# .helm-lint.yaml
rules:
  required-annotations:
    - key: "app.kubernetes.io/managed-by"
      message: "Must have managed-by annotation"
  forbidden-values:
    - path: "image.tag"
      value: "latest"
      message: "Do not use latest tag"
  required-resources:
    - kind: "NetworkPolicy"
      message: "Must include a NetworkPolicy"
```

## Template Testing

### Basic Template Rendering
```bash
# Render templates
helm template ./mychart

# Render with custom values
helm template ./mychart -f values/production.yaml

# Render with debug output
helm template ./mychart --debug

# Render specific template
helm template ./mychart -s templates/deployment.yaml

# Render with dry-run install
helm install test-release ./mychart --dry-run --debug
```

### Template Validation
```bash
# Check for YAML syntax errors
helm template ./mychart 2>&1 > /dev/null

# Validate output with kubeconform
helm template ./mychart | kubeconform -strict

# Check API version compatibility
helm template ./mychart --api-versions "apps/v1" --api-versions "networking.k8s.io/v1"

# Diff between environments
diff <(helm template ./mychart -f values/dev.yaml) <(helm template ./mychart -f values/prod.yaml)
```

### Template Assertion Tests
```yaml
# templates/tests/_assertions.tpl
{{- define "assert.condition" -}}
{{- if not (. | toString | fromJson).condition -}}
  {{- fail ((. | toString | fromJson).message | default "Assertion failed") -}}
{{- end -}}
{{- end -}}

{{- define "assert.equals" -}}
{{- $expected := index . 0 -}}
{{- $actual := index . 1 -}}
{{- $message := index . 2 | default (printf "Expected %v, got %v" $expected $actual) -}}
{{- if ne $expected $actual -}}
  {{- fail $message -}}
{{- end -}}
{{- end -}}

{{- define "assert.notEmpty" -}}
{{- $value := index . 0 -}}
{{- $name := index . 1 | default "value" -}}
{{- if empty $value -}}
  {{- fail (printf "%s must not be empty" $name) -}}
{{- end -}}
{{- end -}}
```

### Using Assertions in Templates
```yaml
{{- include "assert.notEmpty" (list .Values.image.repository "image.repository") -}}
{{- include "assert.notEmpty" (list .Values.image.tag "image.tag") -}}

{{- if not (hasSuffix "/" .Values.image.tag) }}
  {{- include "assert.equals" (list "latest" .Values.image.tag "Do not use :latest tag in production") -}}
{{- end }}
```

## Schema Validation (values.schema.json)

### Basic Schema
```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "replicaCount", "service"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "description": "Number of replicas"
    },
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9]+[/.\\-_a-zA-Z0-9]+$"
        },
        "tag": {
          "type": "string",
          "pattern": "^(?!latest$)[a-zA-Z0-9][a-zA-Z0-9._-]*$"
        },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"]
        }
      }
    },
    "service": {
      "type": "object",
      "required": ["port"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["ClusterIP", "NodePort", "LoadBalancer", "ExternalName"]
        },
        "port": {
          "type": "integer",
          "minimum": 1,
          "maximum": 65535
        }
      }
    }
  }
}
```

### Advanced Schema Patterns
```json
{
  "definitions": {
    "resourceRequirements": {
      "type": "object",
      "properties": {
        "limits": {
          "$ref": "#/definitions/resourceList"
        },
        "requests": {
          "$ref": "#/definitions/resourceList"
        }
      }
    },
    "resourceList": {
      "type": "object",
      "patternProperties": {
        "^(cpu|memory|ephemeral-storage|hugepages-.*)$": {
          "type": "string",
          "pattern": "^[0-9]+(m|Mi|Gi|Ki)?$"
        }
      }
    }
  },
  "properties": {
    "resources": {
      "$ref": "#/definitions/resourceRequirements"
    },
    "ingress": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "hosts": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["host", "paths"],
            "properties": {
              "host": {
                "type": "string",
                "pattern": "^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$"
              },
              "paths": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["path"],
                  "properties": {
                    "path": { "type": "string" },
                    "pathType": {
                      "type": "string",
                      "enum": ["Prefix", "Exact", "ImplementationSpecific"]
                    }
                  }
                }
              }
            }
          }
        },
        "tls": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["hosts"],
            "properties": {
              "hosts": {
                "type": "array",
                "items": { "type": "string" }
              },
              "secretName": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

### Schema Testing
```bash
# Validate values against schema
helm lint ./mychart

# Test invalid values
helm template ./mychart -f test/invalid-values.yaml 2>&1 || echo "Schema rejection works"

# Debug schema validation
helm lint ./mychart --debug 2>&1 | grep -i "schema"
```

## CI Integration

### GitHub Actions
```yaml
# .github/workflows/chart-testing.yaml
name: Chart Testing

on:
  pull_request:
    paths:
      - 'charts/**'
      - 'ct.yaml'

jobs:
  chart-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Helm
        uses: azure/setup-helm@v4
        with:
          version: v3.15.0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Set up chart-testing
        uses: helm/chart-testing-action@v2.7.0

      - name: Run chart-testing (lint)
        run: ct lint --config ct.yaml

      - name: Run chart-testing (list-changed)
        id: list-changed
        run: |
          changed=$(ct list-changed --config ct.yaml)
          if [ -n "$changed" ]; then
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Create kind cluster
        if: steps.list-changed.outputs.changed == 'true'
        uses: helm/kind-action@v1.10.0
        with:
          cluster_name: chart-testing

      - name: Run chart-testing (install)
        if: steps.list-changed.outputs.changed == 'true'
        run: ct install --config ct.yaml

      - name: Run chart-testing (upgrade)
        if: steps.list-changed.outputs.changed == 'true'
        run: ct install --config ct-install.yaml --upgrade
```

### GitLab CI
```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test

variables:
  HELM_VERSION: "3.15.0"
  CT_VERSION: "3.11.0"

helm-lint:
  stage: validate
  image: quay.io/helmpack/chart-testing:v3.11.0
  script:
    - apk add --no-cache helm
    - ct lint --config ct.yaml
  rules:
    - changes:
        - charts/**/*

helm-install:
  stage: test
  image: quay.io/helmpack/chart-testing:v3.11.0
  services:
    - docker:dind
  script:
    - apk add --no-cache helm
    - ct install --config ct.yaml
  rules:
    - changes:
        - charts/**/*
```

### CircleCI
```yaml
# .circleci/config.yml
version: 2.1

orbs:
  helm: circleci/helm@3.1.0

jobs:
  chart-testing:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - helm/install-helm-client:
          version: v3.15.0
      - run:
          name: Install chart-testing
          command: |
            curl -LO https://github.com/helm/chart-testing/releases/download/v3.11.0/chart-testing_3.11.0_linux_amd64.tar.gz
            tar -xzf chart-testing_3.11.0_linux_amd64.tar.gz
            sudo mv ct /usr/local/bin/
      - run:
          name: Lint charts
          command: ct lint --config ct.yaml
      - run:
          name: Install and test charts
          command: ct install --config ct-install.yaml
```

## Testing Hooks

### Pre-Install Test Hook
```yaml
# templates/tests/test-pre-install.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ include "chart.fullname" . }}-preflight"
  annotations:
    helm.sh/hook: pre-install
    helm.sh/hook-weight: "-10"
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  template:
    spec:
      containers:
        - name: preflight
          image: bitnami/kubectl:latest
          command:
            - sh
            - -c
            - |
              echo "Checking required CRDs..."
              kubectl get crd certificates.cert-manager.io || exit 1
              echo "CRDs exist!"
      restartPolicy: Never
```

### Post-Install Test Hook
```yaml
# templates/tests/test-post-install.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ include "chart.fullname" . }}-smoke-test"
  annotations:
    helm.sh/hook: post-install
    helm.sh/hook-weight: "10"
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  template:
    spec:
      containers:
        - name: smoke-test
          image: curlimages/curl:8.5
          command:
            - sh
            - -c
            - |
              URL="http://{{ include "chart.fullname" . }}:{{ .Values.service.port }}/health"
              for i in $(seq 1 10); do
                if curl -sf $URL > /dev/null 2>&1; then
                  echo "Service is healthy!"
                  exit 0
                fi
                echo "Attempt $i: waiting for service..."
                sleep 3
              done
              echo "Service failed to become healthy"
              exit 1
      restartPolicy: Never
```

## Upgrade Tests

### Upgrade Test with ct
```yaml
# ct-upgrade.yaml
target-branch: main
chart-dirs:
  - charts
chart-repos:
  - bitnami=https://charts.bitnami.com/bitnami
helm-extra-args: --timeout 600s
upgrade: true
install-timeout: 5m
upgrade-timeout: 5m
namespace: ct-upgrade-test
```

### Manual Upgrade Test
```bash
# Install old version
helm install upgrade-test ./mychart-v1 --namespace upgrade-test --create-namespace

# Wait for ready
helm list -n upgrade-test

# Upgrade to new version
helm upgrade upgrade-test ./mychart-v2 -f values/production.yaml \
  --namespace upgrade-test \
  --wait \
  --timeout 5m \
  --atomic

# Verify upgrade
helm history upgrade-test -n upgrade-test

# Run tests
helm test upgrade-test -n upgrade-test

# Rollback if needed
helm rollback upgrade-test 1 -n upgrade-test --wait
```

## Cleanup Patterns

### Test Namespace Cleanup
```bash
#!/bin/bash
# cleanup-tests.sh

NAMESPACE="${1:-ct-test}"

echo "Cleaning up test namespace: $NAMESPACE"

# Delete all releases in namespace
helm list -n $NAMESPACE -q | while read release; do
  helm delete $release -n $NAMESPACE
done

# Delete namespace
kubectl delete namespace $NAMESPACE --ignore-not-found

echo "Cleanup complete"
```

### Automatic Test Cleanup
```yaml
# templates/tests/test-cleanup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ include "chart.fullname" . }}-cleanup"
  annotations:
    helm.sh/hook: post-delete
    helm.sh/hook-weight: "20"
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  template:
    spec:
      serviceAccountName: {{ include "chart.fullname" . }}-cleanup
      containers:
        - name: cleanup
          image: bitnami/kubectl:latest
          command:
            - sh
            - -c
            - |
              kubectl delete pod -l "app.kubernetes.io/instance={{ .Release.Name }},helm.sh/hook=test"
      restartPolicy: Never
```

## Test Image Strategies

### Lightweight Test Images
| Image | Size | Use Case |
|-------|------|----------|
| `busybox` | 1.2MB | Basic connectivity, wget |
| `curlimages/curl` | 5MB | HTTP health checks |
| `bitnami/kubectl` | 60MB | Kubernetes API operations |
| `bitnami/postgresql` | 250MB | Database connectivity tests |
| `fullstory/grpcurl` | 30MB | gRPC health checks |
| `alpine/openssl` | 7MB | TLS certificate validation |

### Custom Test Image Dockerfile
```dockerfile
FROM alpine:3.19
RUN apk add --no-cache curl jq ca-certificates
COPY test-runner.sh /usr/local/bin/
ENTRYPOINT ["test-runner.sh"]
```

### Pull Policy for Tests
```yaml
spec:
  containers:
    - name: test
      image: my-test-image:{{ .Values.image.tag }}
      imagePullPolicy: {{ .Values.image.pullPolicy }}
```

## Mocking Dependencies During Test

### Using Helm Template
```bash
# Create minimal mock values for test
cat > ci/test-values.yaml <<EOF
postgresql:
  enabled: false
redis:
  enabled: false

externalServices:
  postgresql:
    host: "mock-postgresql.test.svc"
    port: 5432
  redis:
    host: "mock-redis.test.svc"
    port: 6379
EOF

# Render chart with mock values
helm template mychart -f ci/test-values.yaml
```

### Test Environment Values
```yaml
# ci/test-values.yaml
replicaCount: 1

image:
  repository: myapp
  tag: test
  pullPolicy: IfNotPresent

ingress:
  enabled: false

service:
  type: ClusterIP
  port: 8080

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 50m
    memory: 64Mi

autoscaling:
  enabled: false

global:
  environment: test
```

### Complete CI Test Values
```yaml
# ci/ci-values.yaml
replicaCount: 2

image:
  repository: nginx
  tag: alpine
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: chart-example.test
      paths:
        - path: /
          pathType: Prefix

resources: {}
autoscaling:
  enabled: false
```

## Key Points
- `helm test` pods run in the same namespace as the release and use `helm.sh/hook: test`
- chart-testing (`ct`) tool automates linting, install, and upgrade testing in CI
- Always lint with `--strict` and validate output with kubeconform or similar
- `values.schema.json` catches misconfigurations before deployment
- Use `ct lint`, `ct install`, and `ct install --upgrade` for comprehensive CI pipelines
- Test hooks (pre-install, post-install) verify prerequisites and smoke-test deployments
- Clean up test namespaces and releases to avoid resource leaks
- Use lightweight test images like `busybox` and `curlimages/curl` for faster tests
- Mock external dependencies with CI test values to avoid pulling real dependencies
- Upgrade tests must verify rollback capability and data persistence
