# Helm Lifecycle Management

## Hooks Reference

| Hook Annotation | When It Runs | Use Case |
|----------------|-------------|----------|
| `pre-install` | Before resources installed | Create Namespace, CRDs, pre-flight checks |
| `post-install` | After all resources installed | Smoke test, notification |
| `pre-upgrade` | Before upgrade resources applied | Migration job, backup |
| `post-upgrade` | After upgrade completes | Verify migration, cache warm |
| `pre-rollback` | Before rollback resources applied | Snapshot pre-rollback state |
| `post-rollback` | After rollback completes | Verify rollback success |
| `pre-delete` | Before resources deleted | Snapshot, cleanup |
| `test` | `helm test` command | Connection test, health check |

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-migration
  annotations:
    helm.sh/hook: pre-upgrade
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        command: ["node", "migrate.js"]
```

## Hook Delete Policies

| Policy | Behavior |
|--------|----------|
| `before-hook-creation` | Delete previous hook Job before creating new one |
| `hook-succeeded` | Delete Job after it completes successfully |
| `hook-failed` | Delete Job after it fails |
| Default | Keep all hook Jobs in namespace |

## Testing

```bash
# Lint
helm lint ./chart

# Template (validate output)
helm template ./chart --debug

# Install test
helm install test-release ./chart --dry-run --debug

# Run chart tests
helm test test-release
```

```yaml
# templates/tests/test-smoke.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "chart.fullname" . }}-smoke-test"
  annotations:
    helm.sh/hook: test
spec:
  containers:
  - name: smoke
    image: curlimages/curl
    command: ["curl", "-f", "http://{{ include "chart.fullname" . }}:{{ .Values.service.port }}/health"]
  restartPolicy: Never
```

## Subcharts and Dependencies

```yaml
# Chart.yaml
dependencies:
- name: redis
  version: "~18.0.0"
  repository: "https://charts.bitnami.com/bitnami"
  condition: redis.enabled
  tags: ["cache"]
- name: postgresql
  version: "~12.0.0"
  repository: oci://registry-1.docker.io/bitnamicharts
  condition: postgresql.enabled
```

| Feature | Command |
|---------|---------|
| Add dependency | `helm dependency update` |
| Build dependency | `helm dependency build` |
| List dependencies | `helm dependency list` |
| Override subchart values | `redis.port: 6380` in parent values |

## Upgrade Strategies

| Strategy | Command | When |
|----------|---------|------|
| Rolling upgrade | `helm upgrade --install` | Default |
| Recreate | `helm upgrade --install --recreate-pods` | Breaking config change |
| Atomic | `helm upgrade --install --atomic` | Critical services (rollback on failure) |
| Force | `helm upgrade --force` | Immutable label/label mismatch |
| Cleanup on fail | `--cleanup-on-fail` | Remove partial resources on failure |

## Rollback

```bash
# List revisions
helm history my-release

# Rollback to revision
helm rollback my-release 3

# Rollback with wait
helm rollback my-release 3 --wait --timeout 5m

# Rollback with force (for immutable field errors)
helm rollback my-release 3 --force
```
