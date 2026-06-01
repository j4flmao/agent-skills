---
name: helm-patterns
description: >
  Use this skill when the user says 'helm', 'helm chart', 'helm
  template', 'helm install', 'helm upgrade', 'helm rollback',
  'helmfile', 'helm secrets', 'helm values', 'helm dependency',
  'helm repository', 'helm plugin', 'helm unittest', 'helm
  lint', 'helm package', 'helm registry', 'oci helm', 'helm
  hooks', 'helm tests', 'helm subchart', 'helm global values',
  'helm library chart', 'helm umbrella chart', 'helm postrender',
  'helm diff', 'helmfile', 'helm values schema', 'helm crd',
  'chart museum', 'chart repo', 'helmfile environment'.
  Covers: Helm chart development, templating, dependency
  management, testing, CI/CD integration, security, advanced
  patterns, and operational best practices.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, helm, kubernetes, charts, phase-5]
---

# Helm Patterns

## Purpose
Develop, test, deploy, and operate Helm charts for Kubernetes with best practices for templating, dependency management, security, CI/CD integration, and advanced patterns.

## Agent Protocol

### Trigger
Exact user phrases: "helm", "helm chart", "helm template", "helm install", "helm upgrade", "helm rollback", "helmfile", "helm secrets", "helm values", "helm dependency", "helm unittest", "helm lint", "helm CRD", "chart museum".

### Input Context
- Chart purpose (app, infrastructure, library).
- Kubernetes version and distribution.
- CI/CD system (GitHub Actions, GitLab CI, ArgoCD).
- Secrets management (SOPS, SealedSecrets, External Secrets, Vault).
- Multi-environment strategy.

### Output Artifact
Helm chart files (Chart.yaml, templates/, values.yaml), helmfile configuration, or CI/CD config.

### Response Format
Chart files, helmfile YAML, or CI/CD pipeline YAML. No preamble.

### Completion Criteria
- [ ] Chart.yaml with correct metadata, version, appVersion, dependencies.
- [ ] values.yaml with all configurable parameters documented.
- [ ] Templates with proper indentation, helpers, and conditionals.
- [ ] Hooks for pre/post install/upgrade/delete operations.
- [ ] Unittests covering key template outputs.
- [ ] CI/CD pipeline with lint, unittest, package, push.
- [ ] Secrets management integrated (SOPS or SealedSecrets).
- [ ] Multi-environment values files (values-dev.yaml, values-prod.yaml).

### Max Response Length
400 lines.

## Quick Start
`helm create my-chart` → Edit `values.yaml` → Write templates in `templates/` → Add dependencies in `Chart.yaml` → `helm lint` → `helm template --debug` → `helm unittest` → Package and push to registry → Deploy with `helm upgrade --install`.

## Decision Tree: Chart Types
| Chart Type | Purpose | Dependencies | Versioning |
|------------|---------|--------------|------------|
| **Application Chart** | Deploys an application | None or subcharts | Semantic, bump per release |
| **Library Chart** | Provides helpers/snippets | No templates, only _helpers.tpl | Semantic, shared across teams |
| **Umbrella Chart** | Composes multiple subcharts | Many subchart deps | Version matches release bundle |
| **Infrastructure Chart** | Deploys operators, CRDs | CRD charts or depends-on | Tied to operator version |
| **OCI Chart** | Stored in OCI registry | Same as regular | OCI tag equals chart version |

## Core Workflow

### Step 1: Chart Structure
```
my-chart/
├── Chart.yaml                 # Metadata + dependencies
├── values.yaml                # Default values
├── values.schema.json         # JSON Schema validation
├── charts/                    # Subcharts (packed dependencies)
├── templates/
│   ├── _helpers.tpl           # Template helpers (Go templates)
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── servicemonitor.yaml
│   ├── tests/
│   │   └── test-connection.yaml
│   └── NOTES.txt              # Post-install output
├── ci/                        # CI test values
│   ├── default-values.yaml
│   └── with-ingress.yaml
└── tests/                     # Unit tests (helm-unittest)
    ├── deployment_test.yaml
    └── service_test.yaml
```

### Step 2: Chart.yaml with Dependencies
```yaml
apiVersion: v2
name: my-app
description: A production-grade web application
type: application
version: 1.2.3
appVersion: "2.5.0"
kubeVersion: ">=1.27.0-0"
home: https://github.com/myorg/my-app
sources:
  - https://github.com/myorg/my-app
maintainers:
  - name: DevOps Team
    email: devops@example.com
dependencies:
  - name: postgresql
    version: "15.5.2"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
    tags:
      - database
  - name: redis
    version: "19.6.1"
    repository: "oci://registry-1.docker.io/bitnamicharts"
    condition: redis.enabled
  - name: common
    version: "2.x"
    repository: "file://../common"
  - name: monitoring
    version: "0.x"
    repository: "https://prometheus-community.github.io/helm-charts"
    alias: prometheus
    import-values:
      - child: defaults
        parent: monitoring
```

### Step 3: values.yaml (with documentation)
```yaml
# @section Global parameters
# @param global.imageRegistry Global Docker image registry
# @param global.imagePullSecrets Global Docker image pull secrets

global:
  imageRegistry: ""
  imagePullSecrets: []

# @section Application parameters
# @param image.repository Image repository
# @param image.tag Image tag (overrides appVersion)
# @param image.pullPolicy Image pull policy
# @param replicaCount Number of replicas

image:
  repository: myorg/my-app
  tag: ""
  pullPolicy: IfNotPresent

replicaCount: 3

# @section Service parameters
service:
  type: ClusterIP
  port: 8080
  containerPort: 8080

# @section Ingress parameters
ingress:
  enabled: false
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com

# @section Resource requests and limits
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

# @section Autoscaling
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

# @section PodDisruptionBudget
pdb:
  enabled: true
  minAvailable: 2

# @section Security
podSecurityContext:
  fsGroup: 1001
  runAsNonRoot: true
  runAsUser: 1001
  seccompProfile:
    type: RuntimeDefault

containerSecurityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  readOnlyRootFilesystem: true
```

### Step 4: Core Templates
```yaml
# templates/_helpers.tpl
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.name" . }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "my-app.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "my-app.image" -}}
{{- $registry := .Values.global.imageRegistry | default .Values.image.repository -}}
{{- $tag := .Values.image.tag | default (printf "v%s" .Chart.AppVersion) -}}
{{- printf "%s:%s" $registry $tag -}}
{{- end }}
```

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  {{- if .Values.autoscaling.enabled }}
  replicas: {{ .Values.autoscaling.minReplicas }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "my-app.serviceAccountName" . }}
      {{- with .Values.podSecurityContext }}
      securityContext:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ include "my-app.image" . }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        {{- with .Values.containerSecurityContext }}
        securityContext:
          {{- toYaml . | nindent 10 }}
        {{- end }}
        ports:
        - containerPort: {{ .Values.service.containerPort }}
          name: http
          protocol: TCP
        livenessProbe:
          httpGet:
            path: /healthz
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        {{- if .Values.configmap.enabled }}
        envFrom:
        - configMapRef:
            name: {{ include "my-app.fullname" . }}
        {{- end }}
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        {{- if .Values.extraVolumeMounts }}
        {{- toYaml .Values.extraVolumeMounts | nindent 8 }}
        {{- end }}
      volumes:
      - name: tmp
        emptyDir: {}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### Step 5: Helm Hooks
```yaml
# templates/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-migrate
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded,before-hook-creation
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: "{{ include "my-app.image" . }}"
        command: ["python", "manage.py", "migrate"]
```

```yaml
# templates/test-connection.yaml (helm test)
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "my-app.fullname" . }}-test"
  annotations:
    "helm.sh/hook": test
spec:
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ['sh', '-c', 'curl -sf http://{{ include "my-app.fullname" . }}:{{ .Values.service.port }}/healthz']
  restartPolicy: Never
```

### Step 6: Helm Unit Tests
```yaml
# tests/deployment_test.yaml
suite: test deployment
templates:
  - deployment.yaml
tests:
  - it: should have correct number of replicas
    set:
      replicaCount: 5
    asserts:
      - isKind:
          of: Deployment
      - equal:
          path: spec.replicas
          value: 5

  - it: should set environment variables
    asserts:
      - contains:
          path: spec.template.spec.containers[0].env
          content:
            name: POD_NAME
            valueFrom:
              fieldRef:
                fieldPath: metadata.name

  - it: should have security context
    asserts:
      - isNotNull:
          path: spec.template.spec.securityContext
      - equal:
          path: spec.template.spec.securityContext.runAsNonRoot
          value: true

  - it: should have resource limits
    set:
      resources.limits.cpu: 1000m
    asserts:
      - equal:
          path: spec.template.spec.containers[0].resources.limits.cpu
          value: 1000m

  - it: should not include ingress when disabled
    template: ingress.yaml
    asserts:
      - hasDocuments:
          count: 0

  - it: should have liveness probe
    asserts:
      - isNotNull:
          path: spec.template.spec.containers[0].livenessProbe
```

### Step 7: Helmfile for Multi-Environment
```yaml
# helmfile.yaml
repositories:
  - name: bitnami
    url: https://charts.bitnami.com/bitnami
  - name: myrepo
    url: oci://ghcr.io/myorg

releases:
  - name: my-app
    chart: myrepo/my-app
    version: 1.2.3
    namespace: default
    values:
      - values/{{ .Environment.Name }}.yaml
    secrets:
      - secrets/{{ .Environment.Name }}.yaml
    values:
      - image:
          tag: {{ .Environment.Values.imageTag }}
    set:
      - name: replicaCount
        value: {{ .Environment.Values.replicaCount | default 3 }}
    conditions:
      - my-app.enabled

environments:
  dev:
    values:
      - env/dev.yaml
  staging:
    values:
      - env/staging.yaml
  prod:
    values:
      - env/prod.yaml
      - secrets/prod.yaml
```

### Step 8: Helm Secrets (SOPS)
```yaml
# .sops.yaml
creation_rules:
  - path_regex: secrets/.*\.yaml$
    age: age1abc123...
    encrypted_regex: "^(password|secret|apiKey|token)$"
```

```yaml
# secrets/prod.yaml (encrypted with SOPS)
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
type: Opaque
stringData:
  DATABASE_URL: ENC[AES256_GCM,data:encrypted-base64,iv:...,tag:...]
  API_KEY: ENC[AES256_GCM,data:...,iv:...,tag:...]
```

```bash
# Decrypt before helm install (helm plugins)
helm secrets install my-app ./my-chart -f secrets/prod.yaml

# Or with sops directly
sops decrypt secrets/prod.yaml | helm upgrade --install my-app ./my-chart -f -
```

### Step 9: CI/CD Pipeline
```yaml
# .github/workflows/helm-ci.yaml
name: Helm CI
on:
  pull_request:
    paths:
      - 'charts/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: azure/setup-helm@v4
      with:
        version: v3.15.0
    - name: Lint charts
      run: |
        helm lint charts/my-app
        helm dependency update charts/my-app
        helm lint charts/my-app --strict

  unittest:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: azure/setup-helm@v4
    - name: Run helm-unittest
      run: |
        helm plugin install https://github.com/helm-unittest/helm-unittest
        helm unittest charts/my-app

  package:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [lint, unittest]
    steps:
    - uses: actions/checkout@v4
    - uses: azure/setup-helm@v4
    - name: Package chart
      run: |
        helm package charts/my-app --destination dist/
    - name: Push to OCI registry
      run: |
        echo ${{ secrets.GITHUB_TOKEN }} | helm registry login ghcr.io -u ${{ github.actor }} --password-stdin
        helm push dist/my-app-*.tgz oci://ghcr.io/myorg
```

## Rules
- Always use `{{ include }}` for shared labels to maintain consistency.
- Validate chart with `helm lint --strict` before committing.
- Use `values.schema.json` for production charts to catch misconfiguration early.
- Pin dependency versions in Chart.yaml — never use `~> 1.x` ranges in production.
- Tests (`helm test`) must not have side effects — clean up after themselves.
- Use `helm.sh/hook-weight` to order hook execution (lower = runs first).
- Never template `.Release.Name` directly — use `include` with truncation.
- Use `nindent` for proper YAML indentation within template blocks.
- Always run `helm template --debug` to verify rendered output matches expectations.
- Use `helm-diff` plugin in CI to preview changes before apply (`helm diff upgrade`).

## Production Considerations
- Enable `helm.sh/resource-policy: keep` for PVCs and Secrets that must survive uninstall.
- Use `helm get manifest` and `helm get values` for debugging deployed charts.
- Package charts with provenance (`helm package --sign`) for supply chain security.
- OCI registries support Helm charts natively — prefer OCI over Chartmuseum for new setups.
- Use Chart.yaml `kubeVersion` to prevent install on incompatible Kubernetes versions.
- Helm v3 no longer requires Tiller; use v3 for all new deployments.
- CRDs: install via `crds/` directory; Helm will install them before templates.
- Use `--atomic` for production upgrades to auto-rollback on failure.
- Use `--wait` to ensure all resources are ready before marking upgrade as successful.
- For large clusters, increase Helm driver performance with `--driver=secret` (ConfigMap-based is slow).

## Anti-Patterns
- Using `--recreate-pods` — forces pod restart; use rolling update instead.
- Hardcoding values in templates — use values.yaml for all configurable parameters.
- Single values.yaml for all environments — use helmfile or per-environment files.
- No `helm.sh/hook-delete-policy` — failed hooks leave orphaned resources.
- Skipping `helm lint` — catches YAML errors and template issues early.
- No `helm test` — no confidence that chart works after deployment.
- Using `helm upgrade` without `--history-max` — accumulates excessive release history.
- Templates with inline strings instead of `tpl` function — prevents value-based config.
- Chart version not bumped before deployment — can't identify which version is running.
- Large templates with no `_helpers.tpl` — violates DRY principle, harder to maintain.

## References
  - references/helm-advanced.md — Helm Advanced Topics
  - references/helm-fundamentals.md — Helm Fundamentals
  - references/helmfile.md — Helmfile Multi-Environment Management
  - references/helm-secrets.md — SOPS and SealedSecrets for Helm
  - references/helm-ci-cd.md — Helm CI/CD Pipeline Patterns
  - references/helm-testing.md — Helm Unit and Integration Testing
  - references/helm-security.md — Chart Signing and Supply Chain Security
## Handoff
- `devops-kubernetes` for deploying Helm charts to Kubernetes clusters.
- `devops-argo-cd` for GitOps deployment of Helm charts via ArgoCD.
- `devops-gitops` for GitOps workflow integration.
- `devops-security` for secrets management and chart signing.
- `devops-cicd-pipeline` for CI/CD integration.
