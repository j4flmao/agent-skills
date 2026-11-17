# Docker Advanced Topics

## Introduction
Advanced Docker covers multi-architecture builds, Docker in production at scale, rootless Docker, image signing with cosign, advanced networking, and Docker security hardening.

## Multi-Architecture Images
Build images for linux/amd64 and linux/arm64 with docker buildx. QEMU emulation for cross-platform builds. Create and push multi-arch manifest. Registry supports multi-arch, pulls correct variant. CI integration with buildx for automated multi-arch builds. Testing across architectures in production.

## Docker in Production at Scale
Docker Swarm for native orchestration at moderate scale. Stack deployment with versioned compose files. Rolling updates with health check gating. Secrets management with Docker secrets. Service discovery with DNS round-robin. Resource constraints and reservation for predictable performance. Centralized logging with Docker logging drivers.

## Rootless Docker
Run Docker daemon as non-root user for additional security. Requirements: kernel with user namespaces enabled. Limitations: cgroup resource limits, some storage drivers, privileged mode. Use rootless mode for multi-tenant environments. Configuration with dockerd-rootless-setuptool.sh.

## Image Signing with cosign
Sign container images with cosign using keyless signing (OIDC). Verify image signatures before deployment. Store signatures in registry alongside images. Automate signing in CI/CD pipeline. Enforce signature verification in admission controllers (Kyverno, OPA).

## Advanced Networking
Macvlan/Ipvlan for direct network interface access. Overlay networks for multi-host communication. Network policies for inter-service traffic control. Service discovery with embedded DNS. Encrypted overlay networks with IPSec.

## Docker Security Hardening
Content Trust for image signing verification. Read-only root filesystem (--read-only --tmpfs /tmp). Seccomp profiles to restrict system calls. AppArmor/SELinux profiles for Mandatory Access Control. User namespace remapping for additional isolation. Resource limits (memory, CPU, PIDs, nofile). Docker Bench Security for automated audit.

## References
- docker-fundamentals.md -- Fundamentals
- compose-networking.md -- Compose and Networking
- security-best-practices.md -- Security Best Practices
