# Runtime Security

## Falco

### Installation
```bash
helm install falco falcosecurity/falco \
  --namespace falco --create-namespace \
  --set driver.kind=modern-bpf
```

### Default Rules
- Shell spawned in container not from parent shell
- Read/write to sensitive paths (/etc/shadow, /var/lib/kubelet)
- Outbound network connection to unknown IP
- Privilege escalation attempt (setuid binary execution)
- Unexpected process spawned by web server (nginx spawning curl)
- Container running with privileged flag

### Custom Rules
```yaml
- rule: Custom Outbound Crypto Mining
  desc: detect connection to known mining pools
  condition: >
    outbound and
    fd.sip.name in (mining_pools)
  output: >
    Crypto mining connection detected (connection=%fd.name)
  priority: CRITICAL
  tags: [crypto-mining, network]
```

### Alert Routing
Falco → Kubernetes audit events → Falcosidekick → AlertManager → Slack/PagerDuty. Response: annotate pod, terminate pod, trigger incident. Triage: identify if compromise or false positive.

## Admission Control

### Kyverno

### Policy Types
- Validate: deny resource creation if rule violated
- Mutate: auto-modify resource spec (add labels, inject sidecar)
- Generate: create resources based on trigger
- VerifyImages: require image signature verification

### Validation Policies
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root
spec:
  validationFailureAction: enforce
  rules:
  - name: check-run-as-non-root
    match:
      resources:
        kinds: ["Pod"]
    validate:
      message: "Containers must run as non-root user"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
```
Other policies: require resource limits, block hostPID/ hostNetwork, require image from approved registry, verify image signature with cosign, block privileged escalation.

### OPA/Gatekeeper

### Constraint Templates
```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package k8srequiredlabels
      violation[{"msg": msg}] {
        input.request.kind.kind == "Pod"
        not input.request.object.metadata.labels.team
        msg := "Pod must have team label"
      }
```
Rego policy: declarative, testable with `opa test`. Dry-run: enable with `enforcementAction: dryrun` for 7 days before enforcing.

## Seccomp

### Default Profiles
- Runtime/default: blocks ~44 syscalls (common attack vectors)
- Unconfined: all syscalls allowed (not recommended)
- Custom: allowlist specific syscalls for your application

### Kubernetes Configuration
```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    seccomp.security.alpha.kubernetes.io/pod: runtime/default
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
```

## AppArmor

### Profiles
- `docker-default`: basic container isolation
- Custom profiles: restrict file access, network capabilities, ptrace
- Profile naming: must be loaded on each node

### Kubernetes Configuration
```yaml
metadata:
  annotations:
    container.apparmor.security.beta.kubernetes.io/<container>: localhost/my-custom-profile
```
Prefer seccomp over AppArmor for portability. AppArmor is Linux-only.

## Pod Security Standards

### Profiles
- Privileged: unrestricted, no policy enforcement
- Baseline: minimal restrictions, prevents known privilege escalations
- Restricted: hardened, follows pod hardening best practices

### Enforcement via Namespace Labels
```yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Key Restrictions (Restricted profile)
- `seLinuxOptions` level must be set
- `runAsNonRoot: true`
- `capabilities.drop: ["ALL"]`
- `allowPrivilegeEscalation: false`
- `seccompProfile.type: RuntimeDefault`
