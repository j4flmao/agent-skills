# ArgoCD ApplicationSet Generators

ApplicationSet generators dynamically create Applications based on input parameters, enabling multi-cluster and multi-environment deployments.

## Cluster Generator

Generates Applications for each registered cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-addons
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            environment: production
        values:
          addon: metrics-server
  template:
    metadata:
      name: '{{name}}-{{values.addon}}'
    spec:
      project: addons
      source:
        repoURL: https://kubernetes-charts.storage.googleapis.com
        targetRevision: '{{values.addonVersion}}'
        chart: '{{values.addon}}'
      destination:
        name: '{{name}}'
        namespace: kube-system
```

Template variables: `name` (cluster name), `server` (API URL), `metadata.labels.*`, plus `values.*` from the generator.

## Git Generator

Generates Applications from directory structure or files in a Git repository:

```yaml
spec:
  generators:
    - git:
        repoURL: https://github.com/org/app-config.git
        revision: main
        directories:
          - path: apps/team-a/*
          - path: apps/team-b/*
          - path: '!apps/team-b/legacy'  # exclude pattern
    - git:
        repoURL: https://github.com/org/apps.git
        revision: main
        files:
          - path: "config/**/*.json"
```

The file generator parses JSON/YAML files and produces parameters from their contents:

```yaml
spec:
  generators:
    - git:
        repoURL: https://github.com/org/apps.git
        revision: main
        files:
          - path: "apps/**/config.yaml"
  template:
    spec:
      source:
        repoURL: '{{app.repo}}'
        path: '{{app.path}}'
      destination:
        namespace: '{{app.namespace}}'
```

## Matrix Generator

Combines two generators for multi-dimensional combinations:

```yaml
spec:
  generators:
    - matrix:
        generators:
          - clusters:
              selector:
                matchLabels:
                  environment: staging
          - git:
              repoURL: https://github.com/org/services.git
              revision: main
              directories:
                - path: services/*
```

This produces every service deployed to every staging cluster.

## Merge Generator

Similar to matrix but merges parameters instead of Cartesian product:

```yaml
spec:
  generators:
    - merge:
        mergeKeys:
          - name
        generators:
          - clusters:
              values:
                version: stable
          - git:
              repoURL: https://github.com/org/overrides.git
              revision: main
              files:
                - path: "overrides/{{name}}.yaml"
```

Override parameters take precedence based on generator order.

## SCM Provider Generator

Auto-discovers repositories in GitHub, GitLab, Bitbucket, or Azure DevOps:

```yaml
spec:
  generators:
    - scmProvider:
        github:
          organization: my-org
          api: https://api.github.com/
          allBranches: true
        cloneProtocol: https
        filters:
          - repositoryMatch: ^team-.*
          - pathsExist:
              - deploy/Dockerfile
          - labelMatch: ^production-ready
  template:
    spec:
      source:
        repoURL: '{{ repository.ssh_url }}'
        path: deploy
```

SCM provider variables: `repository.owner`, `repository.name`, `repository.ssh_url`, `repository.clone_url`, `branch`, `sha`, `labels[*]`.

## Pull Request Generator

Creates preview environments per pull request:

```yaml
spec:
  generators:
    - pullRequest:
        github:
          owner: my-org
          repo: my-app
          api: https://api.github.com/
        requeueAfterSeconds: 1800
  template:
    metadata:
      name: 'my-app-pr-{{ number }}'
    spec:
      source:
        repoURL: https://github.com/my-org/my-app.git
        targetRevision: '{{ head_sha }}'
        path: deploy/preview
      destination:
        namespace: 'preview-{{ number }}'
      syncPolicy:
        automated:
          prune: true
```

Supports GitHub, GitLab, Bitbucket, Azure DevOps, and Gitea.

## Template Overrides

Use `templatePatch` for dynamic modifications:

```yaml
spec:
  templatePatch: |
    spec:
      source:
        targetRevision: {{ if eq "production" (index .parameters "environment") }}"main"{{ else }}"develop"{{ end }}
```

## Generator Parameters

| Generator | Key Variables |
|-----------|--------------|
| Cluster | `name`, `server`, `metadata.labels.*` |
| Git (dir) | `path`, `path.basename` |
| Git (file) | All keys from parsed file |
| Matrix | Combined from child generators |
| Merge | Combined with merge key semantics |
| SCM Provider | `repository.*`, `branch`, `sha`, `labels` |
| Pull Request | `number`, `head_sha`, `head_branch`, `base_branch` |

Generators enable GitOps at scale by eliminating repetitive Application definitions.
