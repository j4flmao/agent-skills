# ArgoCD Image Updater

ArgoCD Image Updater automatically updates container images in Kubernetes workloads managed by ArgoCD, enabling continuous delivery of new image versions.

## Installation

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml
```

Configure via ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  log.level: info
  registries.conf: |
    [[registries]]
    prefix = "ghcr.io"
    defaultns = "myorg"
    [registries.credentials]
    username = "$image-updater-user"
    password = "$image-updater-token"
```

## Application Annotations

Enable image updates on existing Applications:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: |
      myapp=ghcr.io/myorg/myapp
      sidecar=ghcr.io/myorg/sidecar
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: kustomization
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    argocd-image-updater.argoproj.io/myapp.allow-tags: regex:^v[0-9]+\.[0-9]+\.[0-9]+$
    argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
    argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
```

## Update Strategies

### Semver (default)

Updates to the latest version matching a semver constraint:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    argocd-image-updater.argoproj.io/myapp.semver-constraint: ">=1.0.0 <2.0.0"
    argocd-image-updater.argoproj.io/myapp.allow-tags: regex:^v\d+\.\d+\.\d+$
```

### Latest

Always updates to the most recent image tag:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/myapp.update-strategy: latest
```

### Digest

Updates when the digest changes for a given tag:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/myapp.update-strategy: digest
    argocd-image-updater.argoproj.io/myapp.digest-tag: stable
```

### Name-based

Updates based on alphabetical ordering of tags:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/myapp.update-strategy: name
    argocd-image-updater.argoproj.io/myapp.semver-constraint: "latest"  # or "oldest"
```

## Write-Back Methods

### Git (recommended)

Commits image updates back to the Git repo:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: kustomization
    argocd-image-updater.argoproj.io/git-user: ArgoCD Image Updater
    argocd-image-updater.argoproj.io/git-email: image-updater@example.com
```

### Commit Message Templates

```yaml
argo-image-updater:
  gitCommitMessageTemplate: "chore(deps): update {{ .Image }} to {{ .NewTag }}"
  gitCommitPrefix: "[image-updater]"
```

Default template: `build: automatic update of {{ .Image.FullImageName }} to {{ .NewTag }}`

### Helm Values

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
    argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
    argocd-image-updater.argoproj.io/write-back-target: helm-values
```

### Argocd (direct update)

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/write-back-method: argocd
```

Updates the live Application spec directly without Git commits.

## Multi-Image Configuration

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: |
      app=ghcr.io/org/app
      worker=ghcr.io/org/worker
      proxy=ghcr.io/org/proxy
    argocd-image-updater.argoproj.io/app.update-strategy: semver
    argocd-image-updater.argoproj.io/app.helm.image-tag: app.tag
    argocd-image-updater.argoproj.io/worker.update-strategy: digest
    argocd-image-updater.argoproj.io/worker.digest-tag: stable
    argocd-image-updater.argoproj.io/proxy.update-strategy: latest
```

## Platform Credentials

Configure registry access:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-image-updater-secret
  namespace: argocd
type: Opaque
stringData:
  azure.azurecr.io: |
    username: 00000000-0000-0000-0000-000000000000
    password: <access-token>
  docker.io: |
    username: myuser
    password: mytoken
  ghcr.io: |
    username: myuser
    password: ghp_xxxxxxxxxxxx
```

## Monitoring

```bash
# Watch logs
kubectl logs -n argocd -l app.argoproj.io/name=argocd-image-updater -f

# Check last update status
argocd-image-updater app list

# Manual run
argocd-image-updater run --once
```

ArgoCD Image Updater closes the gap between CI (image builds) and CD (GitOps sync) by automating image tag updates in your manifests.
