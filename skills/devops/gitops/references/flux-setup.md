# Flux Setup

## Bootstrap

```bash
# Prerequisites
flux check --pre

# Bootstrap on existing cluster
flux bootstrap github \
  --owner=org \
  --repository=infra \
  --branch=main \
  --path=clusters/production \
  --personal

# Bootstrap with GitLab
flux bootstrap gitlab \
  --owner=org \
  --repository=infra \
  --branch=main \
  --path=clusters/production

# Bootstrap with generic Git
flux bootstrap git \
  --url=ssh://git@example.com/org/infra.git \
  --branch=main \
  --path=clusters/production
```

## GitRepository Source

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/org/app-config.git
  ref:
    branch: main
    # semver: ">=1.0.0"  # Use tags instead
    # tag: v1.2.3
    # commit: abc123def
  secretRef:
    name: git-credentials
  ignore: |
    # exclude files
    /docs
    **/*.md
  suspend: false
```

## Kustomization

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: app-config
  path: ./apps
  prune: true
  wait: true
  timeout: 5m
  dependsOn:
    - name: crds
    - name: infrastructure
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
  postBuild:
    substitute:
      cluster_env: production
      cluster_region: us-east-1
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
  patches:
    - patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: my-app
        spec:
          replicas: 3
      target:
        kind: Deployment
        name: my-app
```

## Helm Release

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress
spec:
  interval: 5m
  chart:
    spec:
      chart: nginx-ingress
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
      interval: 1h
  values:
    controller:
      service:
        type: LoadBalancer
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

## Image Update Automation

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/org/my-app
  interval: 10m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-[a-f0-9]+-(?P<ts>\d+)'
    extract: '$ts'
  policy:
    numerical:
      order: asc
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: flux
      messageTemplate: '{{range .Updated.Images}}{{println .}}{{end}}'
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## CLI Commands

```bash
# Reconcilation
flux reconcile source git flux-system
flux reconcile kustomization apps

# Suspend/Resume
flux suspend kustomization apps
flux resume kustomization apps

# Events
flux events

# Logs
flux logs --level=error

# Uninstall
flux uninstall --namespace=flux-system
```
