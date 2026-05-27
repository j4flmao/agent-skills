# Argo CD Application Sets

## Application Set Generators

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
spec:
  generators:
    - git:
        repoURL: https://github.com/org/app-config.git
        revision: HEAD
        directories:
          - path: apps/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/applications.git
        targetRevision: HEAD
        path: '{{path.basename}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Cluster Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-apps
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
  template:
    metadata:
      name: '{{name}}-monitoring'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/monitoring.git
        targetRevision: HEAD
        path: monitoring
      destination:
        server: '{{server}}'
        namespace: monitoring
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## PR Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: preview-envs
spec:
  generators:
    - pullRequest:
        repoURL: https://github.com/org/app.git
        apiTokenRef:
          secretKeyRef:
            name: github-token
            key: token
        labels:
          - preview
  template:
    metadata:
      name: 'preview-{{head_short_sha_7}}'
    spec:
      source:
        repoURL: https://github.com/org/app.git
        targetRevision: '{{head_sha}}'
        path: kubernetes/overlays/preview
      destination:
        server: https://kubernetes.default.svc
        namespace: 'preview-{{head_short_sha_7}}'
```

## Key Points

- Use Application Sets for multi-environment deployments
- Use Git generators for directory-based app discovery
- Use Cluster generators for multi-cluster deployments
- Use PR generators for preview environments
- Use Matrix generators for combining sources
- Use SCM providers for GitHub/GitLab/Bitbucket integration
- Template metadata with generator parameters
- Configure sync policies per application set
- Use selective sync with wave dependencies
- Manage application set upgrades carefully
- Monitor application drift across environments
- Implement progressive delivery with canary patterns
