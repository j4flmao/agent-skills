# Kyverno Policies

Kyverno is a Kubernetes-native policy engine that uses standard YAML to define policies — no new language to learn.

## Policy Types

| Type | Purpose | Example |
|------|---------|---------|
| Validate | Enforce resource properties | Require labels, resource limits |
| Mutate | Modify resources before creation | Add sidecar, inject annotations |
| Generate | Create resources based on triggers | Auto-create NetworkPolicies, LimitRanges |
| VerifyImages | Validate container image signatures | Cosign verification |

## Validate Policies

### Enforce Resource Limits

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-containers
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "All containers must have CPU and memory limits"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

### Deny Privileged Containers

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged
spec:
  validationFailureAction: Enforce
  rules:
    - name: privileged-containers
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: false
```

## Mutate Policies

### Inject Sidecar

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-sidecar
spec:
  rules:
    - name: inject-istio-sidecar
      match:
        any:
          - resources:
              kinds:
                - Deployment
              selector:
                matchLabels:
                  app.kubernetes.io/sidecar: "inject"
      mutate:
        patchStrategicMerge:
          spec:
            template:
              spec:
                containers:
                  - name: istio-proxy
                    image: istio/proxyv2:1.20.0
                    args:
                      - proxy
                      - sidecar
                      - --configPath
                      - /etc/istio/proxy
                      - --binaryPath
                      - /usr/local/bin/envoy
                    ports:
                      - containerPort: 15090
```

### Default Labels

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: default-labels
spec:
  rules:
    - name: add-app-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - Service
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(app.kubernetes.io/managed-by): kyverno
```

## Generate Policies

### Auto-Create NetworkPolicy

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-network-policy
spec:
  rules:
    - name: default-deny
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny
        namespace: "{{request.object.metadata.name}}"
        synchronize: true
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
              - Egress
```

## VerifyImages Policies

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image
spec:
  rules:
    - name: verify-cosign
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      ...
                      -----END PUBLIC KEY-----
          repository: "ghcr.io/myorg"
```

## Policy Reports

```yaml
apiVersion: kyverno.io/v1
kind: PolicyReport
metadata:
  name: cpol-require-resource-limits
  namespace: default
results:
  - policy: require-resource-limits
    rule: check-containers
    resource:
      apiVersion: v1
      kind: Pod
      name: myapp-pod
      namespace: default
    message: "All containers must have CPU and memory limits"
    status: fail
    scored: true
    category: Resources
    severity: high
summary:
  pass: 5
  fail: 2
  skip: 1
  error: 0
```

## Policy Exceptions

```yaml
apiVersion: kyverno.io/v2
kind: PolicyException
metadata:
  name: allow-monitoring
  namespace: monitoring
spec:
  exceptions:
    - policyName: disallow-privileged
      ruleNames:
        - privileged-containers
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - monitoring
```

## Policy Sets

```yaml
apiVersion: kyverno.io/v1alpha2
kind: ClusterPolicySet
metadata:
  name: pod-security-standards
spec:
  policies:
    - require-resource-limits
    - disallow-privileged
    - require-readonly-rootfs
    - require-probes
  match:
    any:
      - resources:
          kinds:
            - Pod
```

## Background Scanning

```yaml
spec:
  background: true  # scan existing resources
  validationFailureAction: Audit  # don't block, just report
```

Kyverno's Kubernetes-native approach (pure YAML, no custom language) makes it accessible while providing powerful policy enforcement capabilities.
