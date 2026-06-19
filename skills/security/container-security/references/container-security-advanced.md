# Container Security Advanced Topics

## Introduction
Advanced container security covers eBPF-based runtime detection (Falco), container escape prevention, confidential computing for containers, SBOM attestation in container registries, and Kubernetes security posture management (KSPM).

## Runtime Detection with Falco
```yaml
# Falco rule — detect container shell access
- rule: Terminal shell in container
  desc: Detect shell process started in container
  condition: >
    spawned_process and container
    and proc.name in (bash, zsh, sh, dash, ash, busybox)
    and not proc.name in (container_entrypoint)
  output: >
    Shell spawned in container
    (user=%user.name container=%container.name shell=%proc.name pid=%proc.pid)
  priority: WARNING
  tags: [container, shell, mitre_execution]
```

## Container Escape Prevention
- Seccomp: block system calls used for escapes (unshare, pivot_root, mount)
- AppArmor: restrict file access, network access, and capability use
- Drop ALL capabilities — add back only required (NET_BIND_SERVICE, etc.)
- Read-only root filesystem prevents binary drops and config tampering
- No privileged containers — they share the host namespace
- No hostPID, hostNetwork, or hostIPC — isolates from host resources
- Use RuntimeClass for VM-level isolation (Kata Containers, gVisor)

## Supply Chain Security with SLSA
```yaml
# Build attestation with cosign
steps:
  - name: Build and sign container
    run: |
      docker build -t myapp:${{ github.sha }} .
      cosign sign --key cosign.key myapp:${{ github.sha }}

  - name: Generate SBOM attestation
    run: |
      syft myapp:${{ github.sha }} -o cyclonedx-json > bom.json
      cosign attest --predicate bom.json --type cyclonedx \
        myapp:${{ github.sha }}
```

## Key Points
- Falco detects container runtime threats: shell access, privilege escalation
- Prevent container escapes with seccomp, AppArmor, and capability dropping
- Confidential computing encrypts container memory in use
- SBOM attestation proves image provenance in registries
- KSPM tools assess Kubernetes security posture continuously
- Use SLSA framework for supply chain security levels
- VM-level isolation (Kata, gVisor) for multi-tenant workloads
