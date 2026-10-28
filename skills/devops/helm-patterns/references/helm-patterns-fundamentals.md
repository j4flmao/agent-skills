# Helm Fundamentals: Charts, Releases, Values, Templates

Core Helm concepts and commands: what a chart and a release are, how values are merged, how templates render, and the everyday install/upgrade/rollback workflow. Helm 4 (released November 2025) is current; Helm 3 remains widely deployed, and differences that affect daily use are noted. Chart layout details are in `chart-structure.md`; lifecycle hooks in `helm-lifecycle.md`.

## 1. Concepts

| Term | Meaning |
|---|---|
| Chart | Package of templates + default values + metadata (`Chart.yaml`, `apiVersion: v2`) |
| Release | One installed instance of a chart in a namespace, with a name and revision history |
| Revision | Each install/upgrade/rollback creates a new numbered revision |
| Values | Configuration merged into templates |
| Repository | HTTP index (`index.yaml`) or OCI registry hosting charts |
| Release storage | Release records stored as Secrets (default driver) in the release namespace |

## 2. Everyday Commands

```bash
# discover
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm search repo prometheus-community/kube-prometheus-stack --versions | head
helm show values oci://ghcr.io/acme/charts/web --version 1.3.0

# render without installing
helm template web ./charts/web -f values-prod.yaml --namespace web

# install or upgrade in one idempotent command
helm upgrade --install web ./charts/web \
  --namespace web --create-namespace \
  -f values.yaml -f values-prod.yaml \
  --set image.tag=1.4.2 \
  --wait --timeout 10m

# inspect
helm list -n web
helm status web -n web
helm history web -n web
helm get values web -n web --all
helm get manifest web -n web

# roll back to revision 3
helm rollback web 3 -n web --wait

# remove
helm uninstall web -n web
```

Version differences:
- Helm 4 applies resources with server-side apply by default for new releases; Helm 3 uses a client-side three-way merge.
- Helm 4 renames `--force` on upgrade to `--force-replace` and provides `--rollback-on-failure`; Helm 3 uses `--atomic` for install/upgrade-with-rollback. Check `helm upgrade --help` for the binary in use.

## 3. Values Precedence

Lowest to highest:

1. `values.yaml` in the chart
2. Parent chart's values for a subchart (under the subchart's name key)
3. `-f/--values` files, in order given (later wins)
4. `--set`, `--set-string`, `--set-file`, `--set-json`, in order given

Maps merge deeply; lists are replaced entirely. Setting a key to `null` removes a default.

```yaml
# values.yaml
replicaCount: 2
image:
  repository: ghcr.io/acme/web
  tag: ""              # defaults to .Chart.AppVersion in templates
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { memory: 256Mi }
ingress:
  enabled: false
  hosts: []
```

## 4. Template Basics

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "web.fullname" . }}
  labels:
    {{- include "web.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "web.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "web.selectorLabels" . | nindent 8 }}
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      containers:
        - name: web
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          {{- with .Values.resources }}
          resources:
            {{- toYaml . | nindent 12 }}
          {{- end }}
```

| Construct | Purpose |
|---|---|
| `.Values`, `.Release`, `.Chart`, `.Capabilities`, `.Files`, `.Template` | Built-in objects |
| `{{- ... }}` / `{{ ... -}}` | Trim whitespace left/right |
| `include "name" .` + `nindent` | Reuse named templates with correct indentation |
| `with`, `range`, `if/else` | Scoping, loops, conditionals |
| `default`, `required`, `quote`, `toYaml`, `tpl` | Common functions (Sprig library + Helm extras) |
| `checksum/config` annotation | Restart pods when a ConfigMap changes |

`_helpers.tpl` holds named templates (`define`) such as `web.fullname` and standard labels (`app.kubernetes.io/name`, `app.kubernetes.io/instance`, `helm.sh/chart`, `app.kubernetes.io/managed-by`).

## 5. Chart Dependencies

```yaml
# Chart.yaml
apiVersion: v2
name: web
version: 1.3.0          # chart version (SemVer)
appVersion: "1.4.2"     # application version, informational
dependencies:
  - name: redis
    version: "~2.4.0"           # SemVer range, resolved into Chart.lock
    repository: oci://ghcr.io/acme/charts
    condition: redis.enabled
```

```bash
helm dependency update ./charts/web     # writes Chart.lock and charts/*.tgz
helm dependency build ./charts/web      # rebuild from Chart.lock
```

Commit `Chart.lock`; it pins resolved versions.

## 6. OCI Registries

```bash
helm registry login ghcr.io -u "$GH_USER" --password-stdin <<< "$GH_TOKEN"
helm package ./charts/web                      # web-1.3.0.tgz
helm push web-1.3.0.tgz oci://ghcr.io/acme/charts
helm install web oci://ghcr.io/acme/charts/web --version 1.3.0
```

OCI support is stable and is the recommended distribution method; classic HTTP repos still work.

## 7. Debugging

| Problem | Tool |
|---|---|
| Template syntax / rendering | `helm template --debug`, `helm lint` |
| What changed between revisions | `helm diff upgrade` (helm-diff plugin), `helm get manifest` per revision |
| Release stuck in `pending-upgrade` | Wait for the in-flight operation; if it crashed, roll back to the last deployed revision |
| Values not applied | `helm get values --all`; check key paths and list replacement |

## Pitfalls

- `--set` for complex values in CI: quoting errors; use values files.
- Lists in values files replaced, not merged, surprising users who expect appends.
- Mutable image tags (`latest`); pin tags or digests.
- Editing resources with `kubectl` after install; Helm drift and conflicts on next upgrade (especially with server-side apply field ownership).

## Checklist

- [ ] `helm upgrade --install` with `--wait` and a timeout in pipelines.
- [ ] Environment values files instead of long `--set` lists.
- [ ] `Chart.lock` committed; dependencies pinned.
- [ ] Charts published to an OCI registry with immutable versions.
- [ ] `helm lint` and `helm template` run in CI.
