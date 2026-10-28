# Helm Advanced Patterns

Advanced chart techniques: values schemas, library charts, `tpl` and `lookup`, post-renderers, server-side apply behaviour in Helm 4, safe upgrades of immutable fields, multi-environment strategy, and supply-chain controls. Fundamentals are in `helm-patterns-fundamentals.md`; umbrella charts in `umbrella-charts.md`; security in `helm-security.md`.

## 1. Values Validation with JSON Schema

`values.schema.json` is validated on `install`, `upgrade`, `lint`, and `template`.

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "replicaCount"],
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1 },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": {
        "repository": { "type": "string", "minLength": 1 },
        "tag": { "type": "string" },
        "pullPolicy": { "enum": ["Always", "IfNotPresent", "Never"] }
      },
      "additionalProperties": false
    },
    "ingress": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "className": { "type": "string" }
      }
    }
  }
}
```

`additionalProperties: false` catches typos (`replicacount`) that otherwise silently do nothing. Inside templates, `required "image.repository is required" .Values.image.repository` and `fail` give targeted errors for conditional rules.

## 2. Library Charts

Share templates across many application charts without rendering resources themselves.

```yaml
# charts/common/Chart.yaml
apiVersion: v2
name: common
type: library
version: 2.1.0
```

```yaml
{{/* charts/common/templates/_deployment.tpl */}}
{{- define "common.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "common.fullname" . }}
  labels: {{- include "common.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels: {{- include "common.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "common.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: {{ printf "%s:%s" .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) | quote }}
{{- end -}}
```

```yaml
# app chart: templates/deployment.yaml
{{ include "common.deployment" . }}
```

Version the library chart with SemVer and upgrade consumers deliberately; a library change alters every chart that uses it.

## 3. `tpl`, `lookup`, and Capabilities

```yaml
# Render a value that itself contains template expressions
data:
  config.yaml: |
    {{- tpl (.Values.configTemplate | toYaml) . | nindent 4 }}
```

```yaml
# Reuse an existing generated secret on upgrade instead of regenerating it
{{- $existing := lookup "v1" "Secret" .Release.Namespace (include "web.fullname" .) }}
{{- $password := "" }}
{{- if $existing }}
{{- $password = index $existing.data "password" | b64dec }}
{{- else }}
{{- $password = randAlphaNum 32 }}
{{- end }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "web.fullname" . }}
type: Opaque
stringData:
  password: {{ $password | quote }}
```

- `lookup` returns an empty map during `helm template` and `--dry-run` (client mode), so rendering differs from a real install; test both paths. Prefer external secret managers over chart-generated secrets for production.
- `.Capabilities.APIVersions.Has "policy/v1/PodDisruptionBudget"` and `.Capabilities.KubeVersion` let charts adapt to cluster versions.

## 4. Post-Renderers

A post-renderer receives the rendered manifests on stdin and returns modified manifests, for patches the chart does not expose (often Kustomize).

```bash
helm upgrade --install web ./charts/web --post-renderer ./kustomize-wrapper.sh
```

```bash
#!/usr/bin/env bash
# kustomize-wrapper.sh
set -euo pipefail
cat > base.yaml
kubectl kustomize .            # kustomization.yaml lists base.yaml and patches
```

Helm 4 reworks plugins (including a WebAssembly-based plugin system) and changes how post-renderers are registered; check the Helm 4 plugin documentation before migrating scripts.

## 5. Server-Side Apply and Field Ownership (Helm 4)

- Helm 4 uses server-side apply by default: the API server merges and tracks field managers. Fields removed from the chart are removed from the object, fixing a class of Helm 3 drift issues.
- Conflicts occur when another manager (HPA, `kubectl edit`, an operator) owns a field the chart also sets; resolve by not templating that field (e.g. omit `replicas` when an HPA is enabled) or by deliberately taking ownership with the conflict-forcing flag.
- Validation is stricter: for example, duplicate environment variable names in a container are rejected under server-side apply. Lint charts against Helm 4 before upgrading CI.

```yaml
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
```

## 6. Changing Immutable Fields

Deployment `spec.selector`, StatefulSet `volumeClaimTemplates`, and Service `clusterIP` cannot be changed in place. Options:
- Keep selector labels stable forever (`selectorLabels` separate from general labels).
- For required changes: create the resource under a new name, migrate traffic, delete the old one.
- Replace-on-conflict flags (`--force-replace` in Helm 4, `--force` in Helm 3) delete and recreate the resource, which causes downtime; avoid in production.

## 7. Multi-Environment Strategy

```
charts/web/                       # chart: environment-agnostic defaults
deploy/
├── values-common.yaml
├── values-staging.yaml
└── values-prod.yaml
```

- One chart version promoted across environments; only values change.
- Deploy with GitOps (Argo CD, Flux) or Helmfile (`helmfile-deploy.md`) rather than ad hoc CLI runs.
- Keep secrets out of values files: reference External Secrets, Sealed Secrets, or SOPS-encrypted files (helm-secrets plugin).

## 8. Supply Chain

- Publish charts to OCI registries; reference by version and, where tooling allows, by digest.
- Sign charts: Helm provenance files (`helm package --sign`, `helm verify`) or Cosign/Notation signatures on OCI artifacts.
- Scan rendered manifests in CI with policy tools (Kyverno CLI, Conftest/OPA, kube-linter, Checkov).
- Pin image tags or digests in values; never `latest`.

## 9. Testing

- `helm lint --strict` and `helm template` against each environment's values in CI.
- `helm-unittest` plugin for template assertions; chart-testing (`ct lint`, `ct install`) on kind clusters (`chart-testing.md`).
- `helm test` hooks for in-cluster smoke tests after install.

## Pitfalls

- Templating fields owned by controllers (replicas with HPA, injected sidecars) causing apply conflicts.
- Generating secrets with `randAlphaNum` without `lookup`: password changes on every upgrade.
- Library chart updates rolled to all apps at once.
- Relying on `lookup` output in `helm template`-based GitOps renderers where it is always empty.

## Checklist

- [ ] `values.schema.json` with `additionalProperties: false` for key objects.
- [ ] Shared templates in a versioned library chart.
- [ ] Selector labels stable; immutable-field changes planned.
- [ ] Charts linted and tested against Helm 4 server-side apply behaviour.
- [ ] Signed OCI charts; manifests policy-scanned in CI.
- [ ] Secrets sourced externally, not from values files.
