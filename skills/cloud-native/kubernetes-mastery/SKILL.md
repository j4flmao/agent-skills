---
name: cloud-native-kubernetes-mastery
description: >
  Use this skill when the user says 'kubernetes mastery', 'production-ready helm chart', 'helm chart best practices', 'helm template helpers', 'values schema', 'kubebuilder scaffold', 'write a kubernetes operator in go', 'chart plus operator', 'advanced helm templating'. Combines production Helm chart engineering (helpers, values.schema.json, tests, upgrade-safe templates) with a kubebuilder-based operator scaffold for teams shipping both. Do NOT use for: operator theory (cloud-native-k8s-operators), full operator lifecycle/OLM (devops-kubernetes-operators), Helm release management with helmfile/CI (helm-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, kubernetes, helm, kubebuilder, operators, go]
---

# Kubernetes Mastery: Production Helm Charts and Operator Scaffolding

## Purpose
Ship Kubernetes software that others install safely: a Helm chart whose values are validated and whose upgrades don't break, and — when day-2 automation is needed — a controller-runtime operator scaffolded with kubebuilder.

## Agent Protocol

### Trigger
"kubernetes mastery", "production helm chart", "helm best practices", "helm helpers", "values schema", "kubebuilder", "write an operator in go", "advanced helm templating".

### Input Context
- What is being packaged; target Kubernetes and Helm versions (Helm 3; Helm 4 released Nov 2025 keeps chart API v2).
- Configurability required; whether a CRD/operator is involved.

### Output Artifact
Chart files and/or operator scaffold commands + code. No file unless requested.

### Response Format
```
Chart: {name} apiVersion v2, type application|library
Key templates: {list}
Values validation: values.schema.json
Operator: {group/version/kind} via kubebuilder (if any)
Test: {helm lint, helm template + kubeconform, helm test, envtest}
```

### Completion Criteria
- [ ] `helm lint` and schema validation pass; rendered manifests validated against the target Kubernetes version.
- [ ] Upgrades don't change selector labels or immutable fields.
- [ ] Operator reconciles idempotently and has envtest coverage.

## Helm Chart Layout
```
mychart/
├── Chart.yaml            # apiVersion: v2, version (chart SemVer), appVersion
├── values.yaml
├── values.schema.json    # JSON Schema; enforced on install/upgrade/lint/template
├── templates/
│   ├── _helpers.tpl
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── NOTES.txt
│   └── tests/test-connection.yaml
└── crds/                 # installed once, never upgraded/deleted by Helm
```

### Helpers (`_helpers.tpl`)
```yaml
{{- define "mychart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "mychart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "mychart.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "mychart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mychart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "mychart.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{ include "mychart.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
```
Selector labels must never include the version: `spec.selector` of a Deployment is immutable.

### Deployment with config-change rollout
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels: {{- include "mychart.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels: {{- include "mychart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "mychart.selectorLabels" . | nindent 8 }}
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      containers:
        - name: app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
          {{- with .Values.resources }}
          resources: {{- toYaml . | nindent 12 }}
          {{- end }}
          {{- with .Values.securityContext }}
          securityContext: {{- toYaml . | nindent 12 }}
          {{- end }}
```
- Omit `replicas` when an HPA manages scale, otherwise every upgrade resets it.
- `checksum/config` restarts pods when the ConfigMap changes.
- Use `required "image.repository is required" .Values.image.repository` for mandatory values.

### Values schema (excerpt)
```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "service"],
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1 },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": {
        "repository": { "type": "string", "minLength": 1 },
        "tag": { "type": "string" },
        "pullPolicy": { "enum": ["Always", "IfNotPresent", "Never"] }
      }
    },
    "service": {
      "type": "object",
      "properties": { "targetPort": { "type": "integer", "minimum": 1, "maximum": 65535 } }
    }
  }
}
```

### Chart validation pipeline
```bash
helm lint ./mychart --strict
helm template rel ./mychart -f ci/values-prod.yaml | kubeconform -strict -kubernetes-version 1.33.0 -summary
helm install rel ./mychart --dry-run=server         # validates against the live API server
helm test rel                                       # runs templates/tests/* hooks
```

## Operator Scaffold (kubebuilder)
```bash
kubebuilder init --domain example.com --repo github.com/example/cache-operator
kubebuilder create api --group cache --version v1alpha1 --kind Cache --resource --controller
make manifests generate   # CRD YAML + DeepCopy from Go markers
make test                 # envtest: real kube-apiserver + etcd binaries
make docker-build docker-push IMG=registry.example.com/cache-operator:v0.1.0
make deploy IMG=registry.example.com/cache-operator:v0.1.0
```
API types with validation markers:
```go
type CacheSpec struct {
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=9
	Replicas int32 `json:"replicas"`
	// +kubebuilder:validation:Pattern=`^\d+\.\d+\.\d+$`
	Version string `json:"version"`
}

type CacheStatus struct {
	ObservedGeneration int64              `json:"observedGeneration,omitempty"`
	Conditions         []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Ready",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].status`
type Cache struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec   CacheSpec   `json:"spec,omitempty"`
	Status CacheStatus `json:"status,omitempty"`
}
```
The reconcile loop itself (get → build desired → create/update → status conditions) is shown in `skills/cloud-native/k8s-operators/SKILL.md`. Generated RBAC comes from `// +kubebuilder:rbac:groups=...` markers above `Reconcile`.

## Shipping an Operator with Helm
- Put CRDs in `crds/` only if you accept that Helm never upgrades them; otherwise template CRDs (with `helm.sh/resource-policy: keep`) or manage them separately.
- Pin operator image by digest in production values.

## Anti-Patterns
- Version label in selectors; `latest` image tags.
- Giant `values.yaml` with no schema → silent typos (`replicacount`).
- Using `lookup` for core logic (returns empty during `helm template`/dry-run client).
- Generating secrets with `randAlphaNum` on every upgrade (rotates passwords, breaks apps, and causes GitOps drift).
- Deprecated API versions in templates; use `.Capabilities.APIVersions.Has` only for genuinely optional APIs.

## Checklist
- [ ] Standard helpers and `app.kubernetes.io/*` labels.
- [ ] `values.schema.json` covers required fields and enums.
- [ ] kubeconform against target K8s versions in CI.
- [ ] Operator: markers for validation/status subresource, envtest, leader election on.
- [ ] Chart and app versions bumped independently (SemVer).

## References
- Related skills: `skills/devops/helm-patterns/SKILL.md`, `skills/cloud-native/k8s-operators/SKILL.md`, `skills/devops/kubernetes-operators/SKILL.md`.
