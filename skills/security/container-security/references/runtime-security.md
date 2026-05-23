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
- Read/write to sensitive paths (/etc/shadow, /var/lib/kubelet, /var/run/secrets)
- Outbound network connection to unknown IP
- Privilege escalation attempt (setuid, --privileged)
- Unexpected process from web server (nginx spawning curl, bash)
- Container running with privileged security context
- Host sensitive path mounts (/proc, /var/run/docker.sock)
- Execution of reverse shell binaries (nc, ncat, socat)

### Custom Rules
```yaml
- rule: Crypto Mining Detection
  desc: connection to known mining pools
  condition: outbound and fd.sip.name in (mining_pools)
  output: Crypto mining detected (connection=%fd.name)
  priority: CRITICAL
  tags: [crypto-mining, network]

- rule: Container Breakout
  desc: mount of host filesystem
  condition: mount and container and contains(fs.mountpoint, "/host")
  output: Host mount detected (user=%user.name)
  priority: CRITICAL
```

### Alert Routing
Falco → K8s audit events → Falcosidekick → AlertManager → Slack/PagerDuty. Response: annotate pod, terminate for critical, trigger incident. Triage: compromise vs false positive.

## Tracee
eBPF-based runtime security and forensics for Linux. Signature detection: kernel exploits, fileless execution, container breakout. Behavioral anomaly detection in syscall patterns. Event capture for forensic analysis.
```bash
tracee --trace container=new
tracee --trace event=ptrace,execve --capture exec
tracee --list
```

## Admission Control

### Kyverno
Policy types: Validate (deny if violated), Mutate (auto-modify spec), Generate (create resources), VerifyImages (require Cosign). Key policies: require approved registry, require Cosign verification, block privileged containers, enforce read-only root filesystem, require resource limits, block hostNetwork/hostPID, require runAsNonRoot, drop all capabilities.

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
      message: "Containers must run as non-root"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
  - name: require-resource-limits
    match:
      resources:
        kinds: ["Pod"]
    validate:
      message: "Resource limits required"
      pattern:
        spec:
          containers:
          - resources:
              limits:
                memory: "?*"
                cpu: "?*"
```

### OPA/Gatekeeper
Rego policy language for complex cross-resource rules. Dry-run with `enforcementAction: dryrun` for 7 days before enforcing.
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

## Seccomp
Runtime/default: blocks ~44 dangerous syscalls. Unconfined: all allowed (not recommended). Custom: allowlist specific syscalls for your app.
```yaml
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
```

## AppArmor
Profiles: docker-default (basic), custom (file access, network, ptrace). Must be loaded on each node. Prefer seccomp for portability (Linux-only).

## Pod Security Standards
Privileged: unrestricted. Baseline: minimal, prevents known privilege escalation. Restricted: hardened, follows best practices.
```yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```
Key restrictions: runAsNonRoot, drop ALL capabilities, allowPrivilegeEscalation false, seccomp RuntimeDefault, runAsUser non-root, fsGroup must be set.
