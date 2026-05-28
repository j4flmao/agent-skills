# Container Runtime Security

## Overview

Container runtime security protects running containers from threats during execution. This reference covers Falco deep-dive (rules, drivers, outputs), Tracee and eBPF security, seccomp profiles, AppArmor/SELinux, Pod Security Standards, admission controller deep-dive (Kyverno policies, OPA Gatekeeper), runtime detection and response, container escape prevention, and host security for containers.

## Runtime Security Architecture

### Defense in Depth Layers

```
Host OS Security (kernel hardening, minimal surface)
  |
  v
Container Runtime (containerd, CRI-O, runc)
  |
  v
Seccomp Profiles (system call filtering)
  |
  v
AppArmor / SELinux (mandatory access control)
  |
  v
Pod Security Standards (Kubernetes-level restrictions)
  |
  v
Admission Control (Kyverno, OPA Gatekeeper)
  |
  v
Runtime Detection (Falco, Tracee)
  |
  v
Alert Pipeline (Falcosidekick -> AlertManager -> PagerDuty)
```

### Threat Model

| Threat | Example | Detection | Prevention |
|---|---|---|---|
| Container escape | Process breaking out of container | Falco syscall monitoring | seccomp, AppArmor, drop capabilities |
| Cryptomining | Unusual CPU, outbound connections | Falco + resource monitoring | Network policy, resource limits |
| Reverse shell | Shell spawned in web server | Falco shell detection | Read-only rootfs, drop capabilities |
| Privilege escalation | setuid binary execution | Falco setuid detection | Drop all capabilities, no setuid |
| Malware execution | Unusual process execution | Falco process monitoring | Image scanning, admission control |
| Data exfiltration | Unexpected outbound connection | Falco network monitoring | Egress network policy |
| Fileless attack | Process injected via /proc or memfd | Tracee behavioral detection | seccomp, kernel hardening |
| Kernel exploit | Dirty Pipe, Dirty COW-like attacks | Tracee signature detection | Kernel updates, eBPF monitoring |

## Falco Deep Dive

### Falco Architecture

```
[syscalls via driver] -> [Falco engine] -> [Rules matching] -> [Outputs]
                            |
                    [Falco libraries]
                            |
            [driver: kernel module / eBPF / modern-bpf]
```

### Driver Selection

| Driver | Performance | Compatibility | Recommendation |
|---|---|---|---|
| kernel module | Excellent | All kernels | Legacy, not recommended for new deployments |
| eBPF probe | Good | Linux 4.15+ | Good balance, older kernel support |
| modern-bpf | Best | Linux 5.8+ | Recommended for modern kernels (best perf, safest) |

**Modern-BPF Installation**:
```bash
falcoctl driver type modern-bpf
falcoctl install
systemctl start falco-modern-bpf
```

### Falco Configuration

```yaml
falco_config:
  engine:
    kind: modern-bpf
    modern_bpf:
      cpus_for_each_buffer: 2
      buffers_per_cpu: 8
      drop_failed_exit: false
  base_syscalls:
    - read
    - write
    - open
    - openat
    - execve
    - execveat
    - clone
    - clone3
    - connect
    - accept
    - bind
    - setuid
    - setgid
    - mount
    - umount
    - ptrace
  rules_file:
    - /etc/falco/rules.d/falco_rules.yaml
    - /etc/falco/rules.d/falco-incubating_rules.yaml
    - /etc/falco/rules.d/falco-sandbox_rules.yaml
    - /etc/falco/rules.d/custom_rules.yaml
  outputs:
    rate:
      rate: 1
      max_burst: 10
    priorities:
      - CRITICAL
      - WARNING
      - INFO
      - DEBUG
  json_output: true
  json_include_output_property: true
  output_timeout: 2000
  watch_fds: true
```

### Falco Rules Deep Dive

**Rule Structure**:
```yaml
- rule: Terminal shell in container
  desc: A shell was spawned in a container with an attached terminal
  condition: >
    spawned_process
    and container
    and shell_procs
    and proc.tty != 0
    and container_entrypoint
  output: >
    Shell spawned in container (user=%user.name
    container_id=%container.id
    image=%container.image.repository
    shell=%proc.name
    parent=%proc.pname
    cmdline=%proc.cmdline
    terminal=%proc.tty)
  priority: WARNING
  tags: [container, shell, mitre_execution]
```

**Key Macros**:
```yaml
- macro: spawned_process
  condition: evt.type = execve and evt.dir = <

- macro: container
  condition: container.id != host

- macro: shell_procs
  condition: proc.name in (bash, zsh, sh, dash, ash, csh, tcsh, ksh, fish)

- macro: container_entrypoint
  condition: >
    not proc.name in (docker, kubectl, kubelet, kube-proxy, crio,
    runc, containerd, systemd, systemd-journald)
```

**Custom Rules Examples**:

Rule for detecting cryptomining:
```yaml
- rule: Cryptominer binary execution
  desc: Known cryptomining binary detected
  condition: >
    spawned_process
    and container
    and proc.name in (xmrig, minerd, ccminer, claymore, ethminer,
    cpuminer, sgminer, cgminer, bfgminer)
  output: >
    Cryptominer binary detected in container
    (user=%user.name container_id=%container.id
    image=%container.image.repository
    process=%proc.name cmdline=%proc.cmdline)
  priority: CRITICAL
  tags: [container, crypto, mitre_execution]
```

Rule for detecting unexpected outbound connections:
```yaml
- rule: Unexpected outbound connection
  desc: Container making outbound connection to unknown destination
  condition: >
    outbound
    and container
    and not allowed_outbound_destination
    and evt.rawres >= 0
  output: >
    Unexpected outbound connection from container
    (user=%user.name container_id=%container.id
    image=%container.image.repository
    fd=%fd.name
    ip=%fd.sip:%fd.sport -> %fd.dip:%fd.dport)
  priority: WARNING
  tags: [container, network, mitre_exfiltration]

- macro: allowed_outbound_destination
  condition: >
    fd.sip in (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    or fd.dip in (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    or fd.sport in (53, 443)
    or fd.dport in (53, 443)
```

Rule for detecting container escape attempts:
```yaml
- rule: Container escape via mount
  desc: Attempt to mount host filesystem inside container
  condition: >
    mount
    and container
    and not proc.name in (kubelet, crio, containerd)
  output: >
    Mount syscall detected in container
    (user=%user.name container_id=%container.id
    process=%proc.name target=%fd.name)
  priority: CRITICAL
  tags: [container, escape, mitre_privilege_escalation]
```

### Falco Output Configuration

```yaml
falco_outputs:
  # Program output (for custom scripts)
  program_output:
    enabled: true
    keep_alive: true
    program: falcosidekick

  # File output
  file_output:
    enabled: true
    keep_alive: true
    filename: /var/log/falco/falco.log

  # Syslog
  syslog_output:
    enabled: true

  # HTTP output
  http_output:
    enabled: false
    url: http://falco-webhook.internal/alerts

  # gRPC output (unix socket)
  grpc_output:
    enabled: true
```

### Falcosidekick Configuration

```yaml
falcosidekick:
  config:
    debug: false
    listenport: 2801
    webhook:
      address: http://alertmanager:9093/api/v2/alerts
    slack:
      webhookurl: https://hooks.slack.com/services/T00/B00/xxxx
      minimumpriority: warning
    pagerduty:
      routingkey: pagerduty-key
      minimumpriority: critical
    elasticsearch:
      hostport: http://elasticsearch:9200
      index: falco-events
    loki:
      hostport: http://loki:3100
      minimumpriority: warning
```

## Tracee and eBPF Security

### Tracee Architecture

Tracee uses eBPF to trace syscalls and detect behavioral patterns without kernel module.

```
[User space: Tracee daemon] <-----> [eBPF programs in kernel]
                                          |
                              [kprobes, tracepoints, raw_tracepoint]
```

### Tracee Installation

```bash
# Install Tracee
docker run --name tracee --rm --privileged \
  --pid=host \
  -v /etc/tracee:/tracee \
  -v /etc/os-release:/etc/os-release:ro \
  -e LIBBPFGO_OSRELEASE_FILE=/etc/os-release \
  aquasec/tracee:latest

# Or via Helm for Kubernetes
helm repo add aqua https://aquasecurity.github.io/helm-charts
helm install tracee aqua/tracee \
  --namespace tracee-system \
  --create-namespace \
  --set capabilities.output=json
```

### Tracee Signatures

Tracee includes built-in signatures for behavioral detection:

```yaml
tracee_signatures:
  anti_debugging:
    - ptrace process tracing
  code_injection:
    - LD_PRELOAD injection
    - process injection via ptrace
    - memfd fileless execution
  container_escape:
    - cgroup notify_on_release exploitation
    - host PID namespace access
    - docker socket mount detection
  credential_access:
    - /etc/shadow read
    - Kubernetes secrets access
    - AWS credential file read
  defense_evasion:
    - seccomp tampering
    - rootkit installation
    - hidden process detection
  discovery:
    - environment variable enumeration
    - mounted host filesystem scan
    - Kubernetes API discovery
  persistence:
    - cron job creation
    - systemd service creation
    - SSH key modification
  privilege_escalation:
    - setuid/setgid execution
    - namespace manipulation
    - capability escalation
```

### Tracee Configuration

```yaml
tracee_config:
  perf_buffer_size: 1024
  blob_perf_buffer_size: 1024
  caches:
    - pids: true
    - comms: true
    - uts: true
  capture:
    - files: true
    - exec: true
    - mem: true
    - network: true
  output:
    format: json
    option: none
  events:
    select:
      - security_file_open
      - security_path_notify
      - security_inode_mkdir
      - security_sb_mount
      - do_init_module
      - call_usermodehelper
```

## Seccomp Profiles

### Seccomp Overview

Seccomp (secure computing mode) restricts the system calls a process can make. This is a critical defense against container escapes.

### Default Docker Seccomp Profile

Docker applies a default seccomp profile that blocks ~50 dangerous syscalls out of ~300+. To use it:

```yaml
securityContext:
  seccompProfile:
    type: RuntimeDefault
```

### Custom Seccomp Profile for Web Applications

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept", "accept4", "access", "arch_prctl", "bind",
        "brk", "clock_getres", "clock_gettime", "clock_nanosleep",
        "clone", "close", "connect", "copy_file_range",
        "dup", "dup2", "dup3", "epoll_create", "epoll_create1",
        "epoll_ctl", "epoll_pwait", "epoll_wait", "eventfd",
        "eventfd2", "execve", "execveat", "exit", "exit_group",
        "faccessat", "fadvise64", "fallocate", "fchmod",
        "fchmodat", "fchown", "fchownat", "fcntl", "fdatasync",
        "fgetxattr", "flistxattr", "flock", "fremovexattr",
        "fsetxattr", "fstat", "fstatfs", "fsync", "ftruncate",
        "futex", "getcwd", "getdents", "getdents64",
        "getegid", "geteuid", "getgid", "getgroups",
        "getpeername", "getpgid", "getpid", "getppid",
        "getrandom", "getsockname", "getsockopt", "gettid",
        "getuid", "ioctl", "listen", "lseek", "lstat",
        "madvise", "mkdir", "mkdirat", "mlock", "mlock2",
        "mmap", "mmap2", "mprotect", "mremap", "msync",
        "munlock", "munmap", "nanosleep", "newfstatat",
        "open", "openat", "pause", "poll", "ppoll",
        "pread64", "preadv", "pselect6", "pwrite64",
        "pwritev", "read", "readlink", "readlinkat",
        "readv", "recvfrom", "recvmmsg", "recvmsg",
        "rename", "renameat", "renameat2", "restart_syscall",
        "rmdir", "rt_sigaction", "rt_sigpending",
        "rt_sigprocmask", "rt_sigqueueinfo", "rt_sigreturn",
        "rt_sigsuspend", "rt_sigtimedwait", "sched_getaffinity",
        "sched_yield", "seccomp", "select", "semtimedop",
        "sendfile", "sendmmsg", "sendmsg", "sendto",
        "set_robust_list", "set_tid_address", "setitimer",
        "setsockopt", "shutdown", "sigaltstack", "socket",
        "splice", "stat", "statfs", "symlink", "symlinkat",
        "sync_file_range", "tee", "tgkill", "time",
        "timer_create", "timer_delete", "timer_getoverrun",
        "timer_gettime", "timer_settime", "timerfd_create",
        "timerfd_gettime", "timerfd_settime", "times",
        "truncate", "umask", "uname", "unlink", "unlinkat",
        "unshare", "utimensat", "vmsplice", "wait4",
        "waitid", "waitpid", "write", "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    },
    {
      "names": ["personality"],
      "action": "SCMP_ACT_ALLOW",
      "args": [
        {
          "index": 0,
          "value": 0,
          "op": "SCMP_CMP_EQ"
        }
      ]
    }
  ]
}
```

### Applying in Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/webapp-seccomp.json
  containers:
    - name: app
      image: myapp:latest
```

## AppArmor

### AppArmor Profile for Containers

```yaml
apparmor_profile:
  name: container-deny-write
  rules: |
    #include <tunables/global>
    
    profile container-deny-write flags=(attach_disconnected) {
      #include <abstractions/base>
      #include <abstractions/nameservice>
      
      # Deny write to sensitive paths
      deny /etc/** w,
      deny /proc/** w,
      deny /sys/** w,
      
      # Allow specific operations
      /usr/bin/** ix,
      /bin/** ix,
      
      # Allow network
      network inet tcp,
      network inet udp,
      
      # Deny ptrace
      deny ptrace (trace),
      
      # Deny mount
      deny mount,
      deny umount,
      
      # Capabilities
      capability,
      deny capability sys_admin,
      deny capability sys_module,
      deny capability sys_ptrace,
    }
```

### Applying in Kubernetes

```yaml
metadata:
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: localhost/container-deny-write
spec:
  containers:
  - name: app
    image: myapp:latest
```

## Pod Security Standards (PSS)

### Three Profiles

| Profile | Description | Privileged | Host Networking | Capabilities | Volume Types |
|---|---|---|---|---|---|
| Privileged | Unrestricted policy | Allowed | Allowed | All | All |
| Baseline | Minimal restrictions | Denied | Denied | Default drop all, add NET_BIND_SERVICE | configmap, secret, emptydir, pvc, hostpath |
| Restricted | Heavily hardened | Denied | Denied | Drop all, no add | configmap, secret, emptydir, pvc |

### Restricted Profile Enforcement

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

### Pod Security Standards to Kyverno Translation

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pss-restricted
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-run-as-non-root
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: Running as root is not allowed
        anyPattern:
          - spec:
              securityContext:
                runAsNonRoot: true
          - spec:
              containers:
                - securityContext:
                    runAsNonRoot: true
    - name: drop-all-capabilities
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: All capabilities must be dropped
        anyPattern:
          - spec:
              containers:
                - securityContext:
                    capabilities:
                      drop:
                        - ALL
    - name: require-read-only-rootfs
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: Root filesystem must be read-only
        anyPattern:
          - spec:
              containers:
                - securityContext:
                    readOnlyRootFilesystem: true
    - name: block-host-network
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: Host networking is not allowed
        anyPattern:
          - spec:
              hostNetwork: false
```

## Admission Control Deep Dive

### Kyverno Policy Patterns

**Mutation Policy - Add Security Defaults**:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: mutate-security-defaults
spec:
  rules:
    - name: add-run-as-non-root
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        patchStrategicMerge:
          spec:
            securityContext:
              runAsNonRoot: true
              seccompProfile:
                type: RuntimeDefault
            containers:
              - (name): "*"
                securityContext:
                  readOnlyRootFilesystem: true
                  capabilities:
                    drop:
                      - ALL
                  allowPrivilegeEscalation: false
                  runAsNonRoot: true
```

**Validation Policy - Block Privileged Operations**:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: validate-container-restrictions
spec:
  validationFailureAction: Enforce
  rules:
    - name: block-privileged
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: Privileged containers are not allowed
        anyPattern:
          - spec:
              containers:
                - securityContext:
                    privileged: false
    - name: block-host-network
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: Host network is not allowed
        anyPattern:
          - spec:
              hostNetwork: false
    - name: require-resource-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: Resource limits are required
        anyPattern:
          - spec:
              containers:
                - resources:
                    limits:
                      memory: "?*"
                      cpu: "?*"
                    requests:
                      memory: "?*"
                      cpu: "?*"
```

**Generate Policy - Enforce Network Policy**:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-network-policy
spec:
  rules:
    - name: deny-all-egress-except-dns
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        kind: NetworkPolicy
        name: default-deny-egress
        namespace: "{{ request.object.metadata.name }}"
        synchronize: true
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Egress
            egress:
              - to:
                  - namespaceSelector: {}
                ports:
                  - port: 53
                    protocol: UDP
```

### OPA Gatekeeper

**Constraint Template**:
```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

**Constraint**:
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    labels:
      - "team"
      - "environment"
```

## Container Escape Prevention

### Known Container Escape Vectors

| Vector | Mechanism | Mitigation |
|---|---|---|
| Kernel exploits | Unpatched kernel vulnerabilities | Keep kernel updated, seccomp, AppArmor |
| Mounting host filesystem | docker run -v /:/host | Restrict volume mounts via admission policy |
| Docker socket | /var/run/docker.sock access | Block Docker socket mounts, don't use DinD |
| Capabilities | CAP_SYS_ADMIN, CAP_SYS_MODULE | Drop all capabilities |
| hostPID namespace | --pid=host access to host processes | Block hostPID via admission |
| /proc sys exploits | Writing to /proc/sys | Read-only rootfs, security contexts |
| cgroup escape | cgroup notify_on_release | seccomp to block cgroup writes |
| user namespace | Unprivileged user namespace | Keep kernel up to date |

### Prevention Checklist

```yaml
escape_prevention:
  mandatory:
    - Drop ALL Linux capabilities
    - Run as non-root user
    - Read-only root filesystem
    - seccomp: RuntimeDefault
    - Block hostNetwork, hostPID, hostIPC
    - No privileged containers
  recommended:
    - AppArmor or SELinux profiles
    - Custom seccomp profile
    - User namespace remapping
    - Pod Security Standard: Restricted
    - Admission policy: Kyverno/OPA
    - Runtime monitoring: Falco/Tracee
    - Kernel live patching
```

## Runtime Detection and Response

### Alert Severity Classification

| Severity | Example Event | Action |
|---|---|---|
| CRITICAL | Container escape attempt, cryptominer | Auto-terminate pod, alert security team |
| HIGH | Reverse shell, privilege escalation | Alert security team, isolate pod |
| MEDIUM | Unexpected outbound connection, unusual file write | Log, investigate within 24h |
| LOW | Shell in container (dev), suspicious cron | Log, weekly review |

### Automated Response Playbook

```yaml
response_playbook:
  trigger: Falco CRITICAL alert
  steps:
    1: "Isolate container - add network policy to deny all ingress/egress"
    2: "Capture forensic data - container logs, process dump, network capture"
    3: "Terminate container if confirmed compromise"
    4: "Block image from future deployments (registry quarantine)"
    5: "Scan other containers using same image for compromise"
    6: "Investigate lateral movement potential"
    7: "Patch vulnerability if exploit-known"
    8: "Update detection rules if new signature"
    9: "Document incident and post-mortem"
```

### Forensics Collection

```bash
# Collect container forensic data
kubectl exec -n production pod-name -- cat /proc/1/cmdline
kubectl logs --tail=500 -n production pod-name > container.logs
kubectl cp production/pod-name:/proc/1/root/ /tmp/forensics/

# Capture network traffic (requires tcpdump in container or sidecar)
kubectl exec -n production pod-name -- tcpdump -i any -c 1000

# Get container filesystem changes
docker diff container_id

# Capture process tree
kubectl exec -n production pod-name -- ps aux
```

## Runtime Security Operations

### Daily Operations

- Review Falco event dashboard (critical + warnings)
- Verify admission controller enforcement stats
- Check seccomp profile violations
- Review resource usage anomalies (CPU, memory, network)

### Weekly Operations

- Tune Falco rules - reduce false positives
- Review Kyverno admission audit logs
- Update custom seccomp profiles for new applications
- Verify Pod Security Standards compliance

### Monthly Operations

- Baseline normal behavior for alert tuning
- Update Falco rules package
- Review runtime security metrics (events, false positives, response time)
- Audit admission policy coverage (are all namespaces covered?)

### Incident Response Drill

Quarterly runtime security incident drill:
1. Simulate cryptominer deployment in test namespace
2. Verify Falco detects malicious process
3. Verify alert reaches security team via PagerDuty
4. Execute isolation and containment procedure
5. Document lessons learned and update playbook

## Kubernetes-Specific Runtime Security

### Node-Level Security

```yaml
kubelet_config:
  protectKernelDefaults: true
  seccompDefault: true
  featureGates:
    SeccompDefault: true
  nodeStatusUpdateFrequency: 10s
  eventRecordQPS: 5
```

### Security Context Defaults

```yaml
pod_security:
  podSecurityContext:
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 10001
    fsGroup: 10001
    seccompProfile:
      type: RuntimeDefault
    supplementalGroups: []
  containerSecurityContext:
    allowPrivilegeEscalation: false
    privileged: false
    readOnlyRootFilesystem: true
    capabilities:
      drop:
        - ALL
      add:
        - NET_BIND_SERVICE
```

## References

- container-image-security.md -- Container Image Security
- container-security-fundamentals.md -- Container Security Fundamentals
- container-security-advanced.md -- Container Security Advanced Topics
- runtime-security.md -- Runtime Security
- admission-controller-policies.md -- Admission Controller Policies
