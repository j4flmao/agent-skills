---
name: helm-patterns
description: >
  Use this skill when designing Helm charts for Kubernetes — chart structure, values management, dependency, hooks, templating, testing, CI/CD integration. This skill enforces: proper chart directory structure, values hierarchy (global → environment → release), encrypted secrets, _helpers.tpl for reusable templates, pinned image tags. Do NOT use for: infrastructure provisioning (use Terraform), configuration management (use Ansible), cluster setup.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, helm, phase-5]
---

# Helm Patterns

## Purpose
Define and enforce Helm chart structure, values management, templating, and deployment best practices.

## Agent Protocol

### Trigger
User request includes: `helm`, `helm chart`, `helmfile`, `chart structure`, `helm template`, `helm values`, `helm dependency`, `helm hooks`, `helm test`, `helm upgrade`.

### Input Context
- Kubernetes cluster version
- Current Helm usage (if any)
- Application architecture (microservices, monolith)
- Environment strategy (dev/staging/prod)
- Registry (OCI, ChartMuseum, S3)

### Output Artifact
A markdown document containing:
- Chart structure following best practices
- Values file hierarchy (defaults, env overrides, secrets)
- Dependency management strategy
- Hooks configuration (migration, validation, cleanup)
- Advanced templating (helpers, named templates, flow control)
- Testing strategy (helm test, chart testing)
- CI/CD pipeline integration

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Chart structure aligns with Helm best practices
- Values hierarchy defined (global → environment → release)
- Template helpers extracted and documented
- Hooks for pre/post upgrade defined
- Testing included (lint, template, install test)

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Chart Structure
```
chart-name/
├── Chart.yaml                # Metadata, version, dependencies
├── values.yaml               # Default values
├── values/
│   ├── development.yaml      # Dev environment overrides
│   ├── staging.yaml          # Staging overrides
│   └── production.yaml       # Production overrides
├── secrets/
│   ├── development.yaml      # Dev secrets (encrypted)
│   ├── staging.yaml          # Staging secrets
│   └── production.yaml       # Production secrets
├── templates/
│   ├── _helpers.tpl          # Named templates
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── serviceaccount.yaml
│   ├── servicemonitor.yaml   # Prometheus operator
│   ├── tests/
│   │   ├── test-connection.yaml
│   │   └── test-smoke.yaml
│   └── NOTES.txt             # Post-install instructions
├── charts/                   # Dependency charts
├── ci/                       # CI test values
│   └── default-values.yaml
└── README.md
```

### Step 2: Define Values Hierarchy

```yaml
# values.yaml — defaults
global:
  environment: production
  clusterName: prod-cluster

replicaCount: 2

image:
  repository: myapp
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts: []
  tls: []

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

```yaml
# values/production.yaml — environment override
replicaCount: 4
resources:
  limits:
    cpu: 2
    memory: 2Gi
  requests:
    cpu: 1
    memory: 1Gi
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
ingress:
  enabled: true
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
```

### Step 3: Create Template Helpers
```yaml
{{- define "app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "app.fullname" -}}
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

{{- define "app.labels" -}}
helm.sh/chart: {{ include "app.name" . }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ include "app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
```

### Step 4: Implement Conditionals and Range
```yaml
# ingress.yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "app.fullname" . }}
  annotations:
    {{- toYaml .Values.ingress.annotations | nindent 4 }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "app.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "app.fullname" . }}
data:
  appsettings.json: {{- toJson .Values.config | nindent 4 }}
```

### Step 5: Manage Dependencies
```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: "18.x"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

### Step 6: Configure Lifecycle Hooks
```yaml
# hooks/pre-upgrade-migration.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "app.fullname" . }}-migration
  annotations:
    helm.sh/hook: pre-upgrade
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migration
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["dotnet", "run", "--project", "Migrator"]
```

### Step 7: Add Testing
```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "app.fullname" . }}-test-connection"
  annotations:
    helm.sh/hook: test
spec:
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['{{ include "app.fullname" . }}:{{ .Values.service.port }}']
  restartPolicy: Never
```

### Step 8: Integrate with CI/CD
```bash
# GitHub Actions step
- name: Lint and test Helm chart
  run: |
    helm lint chart/
    helm template chart/ --debug > /dev/null
    ct lint --charts chart/
    ct install --charts chart/
```

## Rules
- Every chart must pass `helm lint` and `helm template --debug` before PR merge.
- Secrets encrypted with `sops` or `sealed-secrets` — never plaintext.
- Only environment-specific values in `values/` directory, not in templates.
- `_helpers.tpl` for all reusable templates — never inline complex logic.
- All images pinned to specific tags (not `latest`) in production values.

## References
  - references/chart-structure.md — Chart Structure Reference
  - references/chart-testing.md — Chart Testing
  - references/helm-best-practices.md — Helm Best Practices
  - references/helm-lifecycle.md — Helm Lifecycle Management
  - references/helm-patterns-advanced.md — Helm Patterns Advanced Topics
  - references/helm-patterns-fundamentals.md — Helm Patterns Fundamentals
  - references/helm-security.md — Helm Security
  - references/helmfile-deploy.md — Helmfile Deploy
## Handoff
Hand off to `devops/terraform/SKILL.md` for K8s cluster provisioning. Hand off to `devops/cicd-pipeline/SKILL.md` for Helm deployment in CI/CD.
